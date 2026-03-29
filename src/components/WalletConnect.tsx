import { useCallback } from "react";

interface WalletConnectProps {
  onConnected: () => void;
  onDisconnected: () => void;
  connectedAddress?: string;
  loading?: boolean;
  error?: string | null;
}

export default function WalletConnect({
  onConnected,
  onDisconnected,
  connectedAddress,
  loading = false,
  error = null,
}: WalletConnectProps) {
  const handleConnect = useCallback(() => {
    onConnected();
  }, [onConnected]);

  const handleDisconnect = useCallback(() => {
    onDisconnected();
  }, [onDisconnected]);

  const truncate = (addr: string) =>
    `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <div className="wallet-connect">
      {connectedAddress ? (
        <div className="wallet-info">
          <span className="wallet-address" title={connectedAddress}>
            {truncate(connectedAddress)}
          </span>
          <button className="btn btn-secondary" onClick={handleDisconnect}>
            Disconnect
          </button>
        </div>
      ) : (
        <button
          className="btn btn-primary"
          onClick={handleConnect}
          disabled={loading}
        >
          {loading ? "Connecting…" : "Connect Wallet"}
        </button>
      )}
      {error && <p className="error-msg">{error}</p>}
    </div>
  );
}
