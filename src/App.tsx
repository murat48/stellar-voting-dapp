import { useState } from "react";
import WalletConnect from "./components/WalletConnect";
import ProposalCard from "./components/ProposalCard";
import ResultsChart from "./components/ResultsChart";
import { useWallet } from "./hooks/useWallet";
import { useVoting } from "./hooks/useVoting";

type Tab = "proposals" | "results";

export default function App() {
  const { address, loading: walletLoading, error: walletError, connect, disconnect, signTransaction } = useWallet();
  const { proposals, votedIds, loading, error, fetchProposals, vote } = useVoting(
    address ?? null
  );
  const [activeTab, setActiveTab] = useState<Tab>("proposals");

  const handleVote = async (proposalId: number) => {
    await vote(proposalId, signTransaction);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <h1 className="app-title">Stellar Voting</h1>
          <WalletConnect
            onConnected={connect}
            onDisconnected={disconnect}
            connectedAddress={address ?? undefined}
            loading={walletLoading}
            error={walletError}
          />
        </div>
      </header>

      <nav className="tab-nav">
        <button
          className={`tab-btn ${activeTab === "proposals" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("proposals")}
        >
          Proposals
        </button>
        <button
          className={`tab-btn ${activeTab === "results" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("results")}
        >
          Results
        </button>
      </nav>

      <main className="app-main">
        {loading && <p className="loading-msg">Loading proposals…</p>}
        {error && <p className="error-msg">{error}</p>}

        {!loading && activeTab === "proposals" && (
          <section className="proposals-grid">
            {proposals.length === 0 ? (
              <p className="empty-state">No proposals found.</p>
            ) : (
              proposals.map((proposal) => (
                <ProposalCard
                  key={proposal.id}
                  proposal={proposal}
                  connectedAddress={address ?? undefined}
                  hasVoted={votedIds.has(proposal.id)}
                  onVote={handleVote}
                />
              ))
            )}
          </section>
        )}

        {!loading && activeTab === "results" && (
          <ResultsChart proposals={proposals} />
        )}
      </main>

      <footer className="app-footer">
        <button className="btn btn-ghost btn-sm" onClick={fetchProposals}>
          Refresh
        </button>
        <span>Network: Testnet</span>
      </footer>
    </div>
  );
}
