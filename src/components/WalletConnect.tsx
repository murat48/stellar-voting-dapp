import { WalletState } from "../hooks/useWallet";

interface Props {
  wallet: WalletState;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function WalletConnect({ wallet, onConnect, onDisconnect }: Props) {
  const shortAddress = wallet.address
    ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`
    : null;

  return (
    <div className="wallet-bar">
      {wallet.isConnected ? (
        <div className="wallet-connected">
          <span className="dot green" />
          <span className="address">{shortAddress}</span>
          <button className="btn btn-outline" onClick={onDisconnect}>
            Disconnect
          </button>
        </div>
      ) : (
        <button
          className="btn btn-primary"
          onClick={onConnect}
          disabled={wallet.isConnecting}
        >
          {wallet.isConnecting ? (
            <>
              <span className="spinner" /> Connecting...
            </>
          ) : (
            "Connect Wallet"
          )}
        </button>
      )}
      {wallet.error && <p className="error-msg">{wallet.error}</p>}
    </div>
  );
}