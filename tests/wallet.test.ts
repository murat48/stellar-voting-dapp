// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWallet } from "../src/hooks/useWallet";

// ── Mock ALL wallet-kit module paths to avoid CJS interop errors ──────────────

vi.mock("@creit.tech/stellar-wallets-kit", () => ({
  StellarWalletsKit: {
    init: vi.fn(),
    authModal: vi.fn().mockResolvedValue({ address: "GTEST123ADDRESS456789012345678901234567890123456789012" }),
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

const TEST_ADDRESS = "GTEST123ADDRESS456789012345678901234567890123456789012";

describe("useWallet", () => {
  beforeEach(() => {
    // Clear persisted address so each test starts disconnected
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("initial state is disconnected when no persisted address", () => {
    const { result } = renderHook(() => useWallet());
    expect(result.current.connected).toBe(false);
    expect(result.current.address).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("restores connected state from localStorage on mount", () => {
    localStorage.setItem("stellar_connected_address", TEST_ADDRESS);
    const { result } = renderHook(() => useWallet());
    expect(result.current.connected).toBe(true);
    expect(result.current.address).toBe(TEST_ADDRESS);
  });

  it("connects and sets address", async () => {
    const { result } = renderHook(() => useWallet());
    await act(async () => {
      await result.current.connect();
    });
    expect(result.current.connected).toBe(true);
    expect(result.current.address).toBe(TEST_ADDRESS);
  });

  it("connect persists address to localStorage", async () => {
    const { result } = renderHook(() => useWallet());
    await act(async () => {
      await result.current.connect();
    });
    expect(localStorage.getItem("stellar_connected_address")).toBe(TEST_ADDRESS);
  });

  it("disconnects and clears state", async () => {
    const { result } = renderHook(() => useWallet());
    await act(async () => { await result.current.connect(); });
    await act(async () => { await result.current.disconnect(); });
    expect(result.current.connected).toBe(false);
    expect(result.current.address).toBeNull();
  });

  it("disconnect removes address from localStorage", async () => {
    const { result } = renderHook(() => useWallet());
    await act(async () => { await result.current.connect(); });
    await act(async () => { await result.current.disconnect(); });
    expect(localStorage.getItem("stellar_connected_address")).toBeNull();
  });

  it("signTransaction returns signed XDR when connected", async () => {
    const { result } = renderHook(() => useWallet());
    await act(async () => { await result.current.connect(); });
    const signed = await result.current.signTransaction("raw-xdr");
    expect(signed).toBe("signed-xdr");
  });

  it("signTransaction throws when not connected", async () => {
    const { result } = renderHook(() => useWallet());
    await expect(result.current.signTransaction("xdr")).rejects.toThrow(
      "Wallet not connected"
    );
  });
});
