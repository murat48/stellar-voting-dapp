import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useVoting } from "../src/hooks/useVoting";

const mockProposals = [
  {
    id: 1,
    title: "Proposal A",
    description: "Desc A",
    vote_count: 5,
    creator: "GCREATOR...",
    active: true,
  },
  {
    id: 2,
    title: "Proposal B",
    description: "Desc B",
    vote_count: 3,
    creator: "GCREATOR...",
    active: false,
  },
];

vi.mock("@stellar/stellar-sdk", async () => {
  const actual = await vi.importActual<typeof import("@stellar/stellar-sdk")>(
    "@stellar/stellar-sdk"
  );
  return {
    ...actual,
    SorobanRpc: {
      Server: vi.fn().mockImplementation(() => ({
        simulateTransaction: vi
          .fn()
          .mockImplementationOnce(async () => ({
            result: { retval: { type: "u32", value: 2 } },
          }))
          .mockImplementation(async () => ({
            result: { retval: mockProposals[0] },
          })),
        prepareTransaction: vi.fn(async (tx) => tx),
        sendTransaction: vi.fn().mockResolvedValue({ status: "SUCCESS" }),
      })),
    },
    Horizon: {
      Server: vi.fn().mockImplementation(() => ({
        loadAccount: vi.fn().mockResolvedValue({
          accountId: () => "GADDRESS",
          sequenceNumber: () => "100",
          incrementSequenceNumber: vi.fn(),
        }),
      })),
    },
    scValToNative: vi.fn((val) => {
      if (val && typeof val === "object" && "value" in val) return val.value;
      return val;
    }),
    nativeToScVal: vi.fn((v) => v),
    Contract: vi.fn().mockImplementation(() => ({
      call: vi.fn((...args) => args),
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

describe("useVoting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("initialises with empty proposals", () => {
    const { result } = renderHook(() => useVoting(null));
    expect(result.current.proposals).toEqual([]);
    expect(result.current.votedIds.size).toBe(0);
  });

  it("exposes vote and fetchProposals functions", () => {
    const { result } = renderHook(() => useVoting(null));
    expect(typeof result.current.vote).toBe("function");
    expect(typeof result.current.fetchProposals).toBe("function");
  });

  it("tracks loading state", async () => {
    const { result } = renderHook(() => useVoting(null));
    await waitFor(() => expect(result.current.loading).toBe(false));
  });
});
