// @vitest-environment node
/**
 * voting.test.ts — Real integration tests against Stellar Testnet
 *
 * - No mocks. Every call hits the live RPC / Horizon endpoints.
 * - A fresh Keypair is generated per test run and funded via Friendbot.
 * - Tests run sequentially (vitest default) and share `createdProposalId`.
 */

import { describe, it, expect, beforeAll } from "vitest";
import * as StellarSdk from "@stellar/stellar-sdk";

// ─── Config ──────────────────────────────────────────────────────────────────

const CONTRACT_ID = "CDII4RCGEBAY4WTTZSSUQVL6KQFZHEBZIKCJPWGA7DY23FQYHCNIB2U4";
const RPC_URL = "https://soroban-testnet.stellar.org";
const HORIZON_URL = "https://horizon-testnet.stellar.org";
const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";

const server = new StellarSdk.rpc.Server(RPC_URL);
const horizon = new StellarSdk.Horizon.Server(HORIZON_URL);
const contract = new StellarSdk.Contract(CONTRACT_ID);

// Fresh random keypair — funded by Friendbot in beforeAll
const testKeypair = StellarSdk.Keypair.random();

// Shared across tests: set once the proposal is created on-chain
let createdProposalId = 0;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Build a transaction for simulation only (dummy account, no real auth needed). */
function simulationTx(op: StellarSdk.xdr.Operation): StellarSdk.Transaction {
  const dummy = new StellarSdk.Account(
    "GDQJJRU6LA6R5KT6AZA6P2H7NGOC4EQCMZALQBTPKXFJLVT32QXWFXYW",
    "0"
  );
  return new StellarSdk.TransactionBuilder(dummy, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(op)
    .setTimeout(30)
    .build();
}

/** Build, sign with testKeypair, submit, and wait for ledger confirmation. */
async function submitAndWait(
  account: StellarSdk.AccountResponse,
  op: StellarSdk.xdr.Operation
): Promise<StellarSdk.rpc.Api.GetSuccessfulTransactionResponse> {
  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: "1000000", // generous fee on testnet
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(op)
    .setTimeout(30)
    .build();

  const prepared = (await server.prepareTransaction(tx)) as StellarSdk.Transaction;
  prepared.sign(testKeypair);

  const send = await server.sendTransaction(prepared);
  if (send.status === "ERROR") {
    throw new Error("TX submission error: " + JSON.stringify(send.errorResult));
  }

  // Poll until confirmed
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const result = await server.getTransaction(send.hash);
    if (result.status === StellarSdk.rpc.Api.GetTransactionStatus.SUCCESS) {
      return result as StellarSdk.rpc.Api.GetSuccessfulTransactionResponse;
    }
    if (result.status === StellarSdk.rpc.Api.GetTransactionStatus.FAILED) {
      throw new Error("TX failed on-chain: " + JSON.stringify(result));
    }
  }
  throw new Error("TX confirmation timed out");
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("Voting Contract — Real Integration Tests (Testnet)", () => {
  // Fund the fresh keypair before any tests run
  beforeAll(async () => {
    console.log("Test account:", testKeypair.publicKey());
    const res = await fetch(
      `https://friendbot.stellar.org?addr=${testKeypair.publicKey()}`
    );
    if (!res.ok) throw new Error(`Friendbot failed: ${res.status} ${await res.text()}`);
    // Let the ledger settle
    await new Promise((r) => setTimeout(r, 4000));
  }, 60_000);

  // ── Read-only ───────────────────────────────────────────────────────────────

  it("fetches proposal count from the live contract", async () => {
    const result = (await server.simulateTransaction(
      simulationTx(contract.call("get_proposal_count"))
    )) as StellarSdk.rpc.Api.SimulateTransactionSuccessResponse;

    const count = StellarSdk.scValToNative(result.result!.retval) as number;
    expect(typeof count).toBe("number");
    expect(count).toBeGreaterThan(0); // contract was initialized with proposals
  }, 30_000);

  it("fetches proposal #1 and validates all fields", async () => {
    const result = (await server.simulateTransaction(
      simulationTx(
        contract.call(
          "get_proposal",
          StellarSdk.nativeToScVal(1, { type: "u32" })
        )
      )
    )) as StellarSdk.rpc.Api.SimulateTransactionSuccessResponse;

    const p = StellarSdk.scValToNative(result.result!.retval) as Record<string, unknown>;

    expect(p.id).toBe(1);
    expect(typeof p.title).toBe("string");
    expect(typeof p.description).toBe("string");
    expect(typeof p.approve_count).toBe("number");
    expect(typeof p.reject_count).toBe("number");
    expect(typeof p.abstain_count).toBe("number");
    expect(typeof p.creator).toBe("string");
    expect(typeof p.active).toBe("boolean");
  }, 30_000);

  it("get_vote returns 255 (not voted) for the fresh test account", async () => {
    const result = (await server.simulateTransaction(
      simulationTx(
        contract.call(
          "get_vote",
          new StellarSdk.Address(testKeypair.publicKey()).toScVal(),
          StellarSdk.nativeToScVal(1, { type: "u32" })
        )
      )
    )) as StellarSdk.rpc.Api.SimulateTransactionSuccessResponse;

    const choice = StellarSdk.scValToNative(result.result!.retval) as number;
    expect(choice).toBe(255);
  }, 30_000);

  // ── Write: create proposal ──────────────────────────────────────────────────

  it("creates a real proposal and receives its on-chain ID", async () => {
    const account = await horizon.loadAccount(testKeypair.publicKey());

    const txResult = await submitAndWait(
      account,
      contract.call(
        "create_proposal",
        new StellarSdk.Address(testKeypair.publicKey()).toScVal(),
        StellarSdk.nativeToScVal("Integration Test Proposal", { type: "string" }),
        StellarSdk.nativeToScVal(
          "Created automatically by the integration test suite",
          { type: "string" }
        )
      )
    );

    // returnValue holds the new proposal ID (u32)
    const newId = StellarSdk.scValToNative(txResult.returnValue!) as number;
    expect(typeof newId).toBe("number");
    expect(newId).toBeGreaterThan(0);

    createdProposalId = newId;
    console.log("Created proposal ID:", createdProposalId);
  }, 90_000);

  // ── Write: vote ─────────────────────────────────────────────────────────────

  it("casts a real Approve (0) vote on the newly created proposal", async () => {
    expect(createdProposalId).toBeGreaterThan(0);
    const account = await horizon.loadAccount(testKeypair.publicKey());

    await expect(
      submitAndWait(
        account,
        contract.call(
          "vote",
          new StellarSdk.Address(testKeypair.publicKey()).toScVal(),
          StellarSdk.nativeToScVal(createdProposalId, { type: "u32" }),
          StellarSdk.nativeToScVal(0, { type: "u32" }) // 0 = Approve
        )
      )
    ).resolves.not.toThrow();
  }, 90_000);

  it("get_vote returns 0 (Approve) after voting", async () => {
    expect(createdProposalId).toBeGreaterThan(0);

    const result = (await server.simulateTransaction(
      simulationTx(
        contract.call(
          "get_vote",
          new StellarSdk.Address(testKeypair.publicKey()).toScVal(),
          StellarSdk.nativeToScVal(createdProposalId, { type: "u32" })
        )
      )
    )) as StellarSdk.rpc.Api.SimulateTransactionSuccessResponse;

    const choice = StellarSdk.scValToNative(result.result!.retval) as number;
    expect(choice).toBe(0); // 0 = Approve
  }, 30_000);

  it("proposal approve_count is 1 after the vote", async () => {
    expect(createdProposalId).toBeGreaterThan(0);

    const result = (await server.simulateTransaction(
      simulationTx(
        contract.call(
          "get_proposal",
          StellarSdk.nativeToScVal(createdProposalId, { type: "u32" })
        )
      )
    )) as StellarSdk.rpc.Api.SimulateTransactionSuccessResponse;

    const p = StellarSdk.scValToNative(result.result!.retval) as Record<string, unknown>;
    expect(p.approve_count).toBe(1);
    expect(p.reject_count).toBe(0);
    expect(p.abstain_count).toBe(0);
  }, 30_000);

  it("rejects a double vote — second vote must throw (already voted)", async () => {
    expect(createdProposalId).toBeGreaterThan(0);
    const account = await horizon.loadAccount(testKeypair.publicKey());

    await expect(
      submitAndWait(
        account,
        contract.call(
          "vote",
          new StellarSdk.Address(testKeypair.publicKey()).toScVal(),
          StellarSdk.nativeToScVal(createdProposalId, { type: "u32" }),
          StellarSdk.nativeToScVal(1, { type: "u32" }) // try to vote Reject this time
        )
      )
    ).rejects.toThrow();
  }, 90_000);
});
