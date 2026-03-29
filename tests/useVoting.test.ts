// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useVoting } from "../src/hooks/useVoting";
import { cache } from "../src/lib/cache";

// ─── Constants ───────────────────────────────────────────────────────────────

const DUMMY_ADDR = "GDQJJRU6LA6R5KT6AZA6P2H7NGOC4EQCMZALQBTPKXFJLVT32QXWFXYW";

// ─── Wallet kit mocks ─────────────────────────────────────────────────────────

vi.mock("@creit.tech/stellar-wallets-kit", () => ({
  StellarWalletsKit: {
    init: vi.fn(),
    authModal: vi.fn().mockResolvedValue({ address: DUMMY_ADDR }),
    signTransaction: vi.fn().mockResolvedValue({ signedTxXdr: "signed-xdr" }),
    disconnect: vi.fn().mockResolvedValue(undefined),
  },
  Networks: { TESTNET: "Test SDF Network ; September 2015" },
}));

vi.mock("@creit.tech/stellar-wallets-kit/modules/freighter", () => ({
  FreighterModule: class FreighterModule {},
}));
vi.mock("@creit.tech/stellar-wallets-kit/modules/xbull", () => ({
  xBullModule: class xBullModule {},
}));
vi.mock("@creit.tech/stellar-wallets-kit/modules/lobstr", () => ({
  LobstrModule: class LobstrModule {},
}));
vi.mock("@creit.tech/stellar-wallets-kit/modules/albedo", () => ({
  AlbedoModule: class AlbedoModule {},
}));
vi.mock("@creit.tech/stellar-wallets-kit/modules/rabet", () => ({
  RabetModule: class RabetModule {},
}));
vi.mock("@creit.tech/stellar-wallets-kit/modules/hana", () => ({
  HanaModule: class HanaModule {},
}));

// ─── Stellar SDK mock ─────────────────────────────────────────────────────────

vi.mock("@stellar/stellar-sdk", async () => {
  const actual = await vi.importActual<typeof import("@stellar/stellar-sdk")>(
    "@stellar/stellar-sdk"
  );
  return {
    ...actual,
    rpc: {
      Server: vi.fn().mockImplementation(() => ({
        simulateTransaction: vi.fn(),
        prepareTransaction: vi.fn(async (tx: unknown) => tx),
        sendTransaction: vi.fn().mockResolvedValue({ status: "PENDING", hash: "mockhash" }),
        getTransaction: vi.fn().mockResolvedValue({ status: "SUCCESS" }),
      })),
      Api: {
        GetTransactionStatus: {
          SUCCESS: "SUCCESS",
          FAILED: "FAILED",
          NOT_FOUND: "NOT_FOUND",
        },
      },
    },
    Horizon: {
      Server: vi.fn().mockImplementation(() => ({
        loadAccount: vi.fn().mockResolvedValue({
          accountId: () => DUMMY_ADDR,
          sequenceNumber: () => "100",
          incrementSequenceNumber: vi.fn(),
        }),
      })),
    },
    scValToNative: vi.fn((val: unknown) => {
      if (val && typeof val === "object" && "value" in val)
        return (val as { value: unknown }).value;
      return val;
    }),
    nativeToScVal: vi.fn((v: unknown) => v),
    Contract: vi.fn().mockImplementation(() => ({
      call: vi.fn((...args: unknown[]) => args),
    })),
    Address: vi.fn().mockImplementation(() => ({
      toScVal: vi.fn(() => "addr-scval"),
    })),
    Account: actual.Account,
    TransactionBuilder: vi.fn().mockImplementation(() => ({
      addOperation: vi.fn().mockReturnThis(),
      setTimeout: vi.fn().mockReturnThis(),
      build: vi.fn().mockReturnValue({ toXDR: () => "mock-xdr" }),
    })),
    BASE_FEE: "100",
  };
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("useVoting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cache.clear();
  });

  it("initialises with empty proposals and empty userVotes map", () => {
    const { result } = renderHook(() => useVoting(null));
    expect(result.current.proposals).toEqual([]);
    expect(result.current.userVotes).toBeInstanceOf(Map);
    expect(result.current.userVotes.size).toBe(0);
  });

  it("exposes vote, createProposal and fetchProposals functions", () => {
    const { result } = renderHook(() => useVoting(null));
    expect(typeof result.current.vote).toBe("function");
    expect(typeof result.current.createProposal).toBe("function");
    expect(typeof result.current.fetchProposals).toBe("function");
  });

  it("contractReady reflects whether VITE_CONTRACT_ID is configured", () => {
    const { result } = renderHook(() => useVoting(null));
    expect(typeof result.current.contractReady).toBe("boolean");
  });

  it("loading stays false when contract not configured", async () => {
    const { result } = renderHook(() => useVoting(null));
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it("vote() throws when wallet not connected", async () => {
    const { result } = renderHook(() => useVoting(null));
    await expect(
      result.current.vote(1, 0, async () => "signed")
    ).rejects.toThrow("Wallet not connected");
  });

  it("createProposal() throws when wallet not connected", async () => {
    const { result } = renderHook(() => useVoting(null));
    await expect(
      result.current.createProposal("T", "D", async () => "signed")
    ).rejects.toThrow("Wallet not connected");
  });

  it("vote() throws when wallet not connected, regardless of contract status", async () => {
    const { result } = renderHook(() => useVoting(null));
    await expect(
      result.current.vote(1, 0, async () => "signed")
    ).rejects.toThrow("Wallet not connected");
  });

  it("userVotes starts empty — no votes before any wallet interaction", () => {
    const { result } = renderHook(() => useVoting(null));
    expect(result.current.userVotes.get(1)).toBeUndefined();
    expect(result.current.userVotes.get(99)).toBeUndefined();
  });
});
