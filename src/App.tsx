import { useState } from "react";
import WalletConnect from "./components/WalletConnect";
import ProposalCard from "./components/ProposalCard";
import ResultsChart from "./components/ResultsChart";
import CreateProposalForm from "./components/CreateProposalForm";
import { useWallet } from "./hooks/useWallet";
import { useVoting } from "./hooks/useVoting";

type Tab = "proposals" | "results" | "create";

export default function App() {
  const { address, loading: walletLoading, error: walletError, connect, disconnect, signTransaction } = useWallet();
  const { proposals, userVotes, loading, error, fetchProposals, vote, createProposal, contractReady } = useVoting(
    address ?? null
  );
  const [activeTab, setActiveTab] = useState<Tab>("proposals");

  const handleVote = async (proposalId: number, choice: number) => {
    await vote(proposalId, choice, signTransaction);
  };

  const handleCreate = async (title: string, description: string) => {
    await createProposal(title, description, signTransaction);
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
        <button
          className={`tab-btn ${activeTab === "create" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("create")}
        >
          + Create
        </button>
      </nav>

      <main className="app-main">
        {!contractReady && (
          <div className="contract-banner">
            <strong>⚙️ Contract not configured.</strong> Deploy the Soroban contract and set{" "}
            <code>VITE_CONTRACT_ID</code> in your <code>.env</code> file, then restart the dev server.
          </div>
        )}
        {loading && <p className="loading-msg">Loading proposals…</p>}
        {error && !loading && (
          <div className="error-banner">
            <span>{error}</span>
            <button className="btn btn-secondary btn-sm" onClick={fetchProposals}>
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && activeTab === "proposals" && (
          <section className="proposals-grid">
            {proposals.length === 0 ? (
              <p className="empty-state">No proposals found.</p>
            ) : (
              proposals.map((proposal) => (
                <ProposalCard
                  key={proposal.id}
                  proposal={proposal}
                  connectedAddress={address ?? undefined}
                  userChoice={userVotes.has(proposal.id) ? (userVotes.get(proposal.id) as 0 | 1 | 2) : null}
                  onVote={handleVote}
                />
              ))
            )}
          </section>
        )}

        {!loading && !error && activeTab === "results" && (
          <ResultsChart proposals={proposals} />
        )}

        {activeTab === "create" && (
          <CreateProposalForm
            connectedAddress={address ?? undefined}
            onSubmit={handleCreate}
          />
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
