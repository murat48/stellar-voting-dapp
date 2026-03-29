import { useState, useCallback } from "react";
import { StellarWalletsKit, Networks } from "@creit.tech/stellar-wallets-kit";
import { FreighterModule } from "@creit.tech/stellar-wallets-kit/modules/freighter";
import { xBullModule } from "@creit.tech/stellar-wallets-kit/modules/xbull";
import { LobstrModule } from "@creit.tech/stellar-wallets-kit/modules/lobstr";
import { AlbedoModule } from "@creit.tech/stellar-wallets-kit/modules/albedo";
import { RabetModule } from "@creit.tech/stellar-wallets-kit/modules/rabet";
import { HanaModule } from "@creit.tech/stellar-wallets-kit/modules/hana";

const WALLET_KEY = "stellar_connected_address";

// Initialise once at module load
StellarWalletsKit.init({
  network: Networks.TESTNET,
  modules: [
    new FreighterModule(),
    new xBullModule(),
    new LobstrModule(),
    new AlbedoModule(),
    new RabetModule(),
    new HanaModule(),
  ],
});

export interface WalletState {
  address: string | null;
  connected: boolean;
  loading: boolean;
  error: string | null;
}

function getPersistedAddress(): string | null {
  try { return localStorage.getItem(WALLET_KEY); } catch { return null; }
}

export function useWallet() {
  const persisted = getPersistedAddress();
  const [state, setState] = useState<WalletState>({
    address: persisted,
    connected: Boolean(persisted),
    loading: false,
    error: null,
  });

  const connect = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { address } = await StellarWalletsKit.authModal();
      try { localStorage.setItem(WALLET_KEY, address); } catch { /* ignore */ }
      setState({ address, connected: true, loading: false, error: null });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Connection failed",
      }));
    }
  }, []);

  const disconnect = useCallback(async () => {
    await StellarWalletsKit.disconnect();
    try { localStorage.removeItem(WALLET_KEY); } catch { /* ignore */ }
    setState({ address: null, connected: false, loading: false, error: null });
  }, []);

  const signTransaction = useCallback(
    async (xdr: string): Promise<string> => {
      if (!state.address) throw new Error("Wallet not connected");
      const { signedTxXdr } = await StellarWalletsKit.signTransaction(xdr, {
        networkPassphrase: Networks.TESTNET,
        address: state.address,
      });
      return signedTxXdr;
    },
    [state.address]
  );

  return { ...state, connect, disconnect, signTransaction };
}
