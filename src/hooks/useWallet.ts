import { useState, useCallback } from "react";
import { StellarWalletsKit, Networks } from "@creit.tech/stellar-wallets-kit";
import { FreighterModule } from "@creit.tech/stellar-wallets-kit/modules/freighter";

// Initialise once at module load
StellarWalletsKit.init({
  network: Networks.TESTNET,
  modules: [new FreighterModule()],
});

export interface WalletState {
  address: string | null;
  connected: boolean;
  loading: boolean;
  error: string | null;
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    address: null,
    connected: false,
    loading: false,
    error: null,
  });

  const connect = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { address } = await StellarWalletsKit.authModal();
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
