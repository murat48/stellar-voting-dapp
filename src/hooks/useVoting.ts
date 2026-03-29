import { useState, useEffect, useCallback } from "react";
import * as StellarSdk from "@stellar/stellar-sdk";
import type { Proposal } from "../components/ProposalCard";
import { cache } from "../lib/cache";

const CONTRACT_ID = import.meta.env.VITE_CONTRACT_ID as string | undefined;
const HORIZON_URL = "https://horizon-testnet.stellar.org";
const RPC_URL = "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";

const server = new StellarSdk.rpc.Server(RPC_URL);
const horizon = new StellarSdk.Horizon.Server(HORIZON_URL);

export function useVoting(address: string | null) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  // Maps proposal_id → 0/1/2 (choice), or nothing if not voted
  const [userVotes, setUserVotes] = useState<Map<number, number>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contractReady = Boolean(CONTRACT_ID);

  const fetchProposals = useCallback(async () => {
    if (!CONTRACT_ID) {
      setError("Contract not deployed yet. Set VITE_CONTRACT_ID in .env to connect to the blockchain.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const cacheKey = "proposals";
      const cached = cache.get<Proposal[]>(cacheKey);
      if (cached) {
        setProposals(cached);
        setLoading(false);
        return;
      }

      const contract = new StellarSdk.Contract(CONTRACT_ID);
      const countResult = await server.simulateTransaction(
        buildTx(contract.call("get_proposal_count"))
      );

      const count = StellarSdk.scValToNative(
        (countResult as StellarSdk.rpc.Api.SimulateTransactionSuccessResponse).result!.retval
      ) as number;

      const fetched: Proposal[] = [];
      for (let i = 1; i <= count; i++) {
        const result = await server.simulateTransaction(
          buildTx(contract.call("get_proposal", StellarSdk.nativeToScVal(i, { type: "u32" })))
        );
        const raw = StellarSdk.scValToNative(
          (result as StellarSdk.rpc.Api.SimulateTransactionSuccessResponse).result!.retval
        ) as Record<string, unknown>;

        fetched.push({
          id: raw.id as number,
          title: raw.title as string,
          description: raw.description as string,
          approveCount: raw.approve_count as number,
          rejectCount: raw.reject_count as number,
          abstainCount: raw.abstain_count as number,
          creator: raw.creator as string,
          active: raw.active as boolean,
        });
      }

      cache.set(cacheKey, fetched, 30_000);
      setProposals(fetched);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch proposals");
    } finally {
      setLoading(false);
    }
  }, []);

  const checkVotedStatus = useCallback(async () => {
    if (!address || proposals.length === 0 || !CONTRACT_ID) return;
    const contract = new StellarSdk.Contract(CONTRACT_ID);
    const newVotes = new Map<number, number>();

    await Promise.all(
      proposals.map(async (p) => {
        try {
          const result = await server.simulateTransaction(
            buildTx(
              contract.call(
                "get_vote",
                new StellarSdk.Address(address).toScVal(),
                StellarSdk.nativeToScVal(p.id, { type: "u32" })
              )
            )
          );
          // returns 0/1/2 or 255 if not voted
          const choice = StellarSdk.scValToNative(
            (result as StellarSdk.rpc.Api.SimulateTransactionSuccessResponse).result!.retval
          ) as number;
          if (choice !== 255) newVotes.set(p.id, choice);
        } catch {
          // ignore per-proposal errors
        }
      })
    );

    setUserVotes(newVotes);
  }, [address, proposals]);

  const vote = useCallback(
    async (
      proposalId: number,
      choice: number,
      signTransaction: (xdr: string) => Promise<string>
    ) => {
      if (!address) throw new Error("Wallet not connected");
      if (!CONTRACT_ID) throw new Error("Contract not deployed yet");

      const contract = new StellarSdk.Contract(CONTRACT_ID);
      const account = await horizon.loadAccount(address);
      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          contract.call(
            "vote",
            new StellarSdk.Address(address).toScVal(),
            StellarSdk.nativeToScVal(proposalId, { type: "u32" }),
            StellarSdk.nativeToScVal(choice, { type: "u32" })
          )
        )
        .setTimeout(30)
        .build();

      const preparedTx = await server.prepareTransaction(tx);
      const signedXdr = await signTransaction(preparedTx.toXDR());
      const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
      await waitForConfirmation(await server.sendTransaction(signedTx));

      // Optimistic UI update — show result immediately without waiting for re-fetch
      setUserVotes((prev) => new Map(prev).set(proposalId, choice));

      cache.invalidate("proposals");
      await fetchProposals();
    },
    [address, fetchProposals]
  );

  const createProposal = useCallback(
    async (
      title: string,
      description: string,
      signTransaction: (xdr: string) => Promise<string>
    ) => {
      if (!address) throw new Error("Wallet not connected");
      if (!CONTRACT_ID) throw new Error("Contract not deployed yet");

      const contract = new StellarSdk.Contract(CONTRACT_ID);
      const account = await horizon.loadAccount(address);
      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          contract.call(
            "create_proposal",
            new StellarSdk.Address(address).toScVal(),
            StellarSdk.nativeToScVal(title, { type: "string" }),
            StellarSdk.nativeToScVal(description, { type: "string" })
          )
        )
        .setTimeout(30)
        .build();

      const preparedTx = await server.prepareTransaction(tx);
      const signedXdr = await signTransaction(preparedTx.toXDR());
      const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
      await waitForConfirmation(await server.sendTransaction(signedTx));

      cache.invalidate("proposals");
      await fetchProposals();
    },
    [address, fetchProposals]
  );

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  useEffect(() => {
    checkVotedStatus();
  }, [checkVotedStatus]);

  return { proposals, userVotes, loading, error, fetchProposals, vote, createProposal, contractReady };
}

function buildTx(operation: StellarSdk.xdr.Operation) {
  const dummyAccount = new StellarSdk.Account(
    "GDQJJRU6LA6R5KT6AZA6P2H7NGOC4EQCMZALQBTPKXFJLVT32QXWFXYW",
    "0"
  );
  return new StellarSdk.TransactionBuilder(dummyAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(operation)
    .setTimeout(30)
    .build();
}

/** Poll until the transaction is confirmed (SUCCESS) or throw on failure/timeout. */
async function waitForConfirmation(
  sendResult: StellarSdk.rpc.Api.SendTransactionResponse
): Promise<void> {
  if (sendResult.status === "ERROR") {
    throw new Error("Transaction submission failed: " + JSON.stringify(sendResult.errorResult));
  }
  const hash = sendResult.hash;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const result = await server.getTransaction(hash);
    if (result.status === StellarSdk.rpc.Api.GetTransactionStatus.SUCCESS) return;
    if (result.status === StellarSdk.rpc.Api.GetTransactionStatus.FAILED) {
      throw new Error("Transaction failed on-chain");
    }
    // NOT_FOUND means still pending — keep polling
  }
  throw new Error("Transaction timed out waiting for confirmation");
}
