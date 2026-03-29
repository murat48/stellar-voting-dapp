import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWallet } from "../src/hooks/useWallet";

vi.mock("@creit.tech/stellar-wallets-kit", () => ({
  StellarWalletsKit: {
    init: vi.fn(),
    authModal: vi.fn().mockResolvedValue({ address: "GTEST...ADDRESS" }),
    signTransaction: vi.fn().mockResolvedValue({ signedTxXdr: "signed-xdr" }),
    disconnect: vi.fn().mockResolvedValue(undefined),
  },
  Networks: { TESTNET: "Test SDF Network ; September 2015" },
}));

vi.mock("@creit.tech/stellar-wallets-kit/modules/freighter", () => ({
  FreighterModule: vi.fn().mockImplementation(() => ({})),
  FREIGHTER_ID: "freighter",
}));

describe("useWallet", () => {
  it("initial state is disconnected", () => {
    const { result } = renderHook(() => useWallet());
    expect(result.current.connected).toBe(false);
    expect(result.current.address).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("connects and sets address", async () => {
    const { result } = renderHook(() => useWallet());
    await act(async () => {
      await result.current.connect();
    });
    expect(result.current.connected).toBe(true);
    expect(result.current.address).toBe("GTEST...ADDRESS");
  });

  it("disconnects and clears state", async () => {
    const { result } = renderHook(() => useWallet());
    await act(async () => {
      await result.current.connect();
    });
    await act(async () => {
      await result.current.disconnect();
    });
    expect(result.current.connected).toBe(false);
    expect(result.current.address).toBeNull();
  });

  it("signTransaction throws when not connected", async () => {
    const { result } = renderHook(() => useWallet());
    await expect(result.current.signTransaction("xdr")).rejects.toThrow(
      "Wallet not connected"
    );
  });
});
