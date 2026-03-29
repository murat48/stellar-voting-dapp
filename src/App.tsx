import { useWallet } from "./hooks/useWallet";
import { useVoting } from "./hooks/useVoting";
import { WalletConnect } from "./components/WalletConnect";
import { ProposalCard } from "./components/ProposalCard";
import { ResultsChart } from "./components/ResultsChart";
import "./App.css";

export default function App() {
  const wallet = useWallet();
  const voting = useVoting(wallet.address);

  const totalVotes = voting.proposals.reduce(
    (sum, p) => sum + p.voteCount,
    0
  );

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="logo">
          <span>⭐</span>
          <h1>Stellar Vote</h1>
        </div>
        <WalletConnect
          wallet={wallet}
          onConnect={wallet.connect}
          onDisconnect={wallet.disconnect}
        />
      </header>

      <main className="app-main">
        {/* Hero */}
        <section className="hero">
          <h2>Decentralized Voting on Stellar</h2>
          <p>Connect your wallet and cast your vote on-chain.</p>
        </section>

        {/* Loading State */}
        {voting.isLoading ? (
          <div className="loading-container">
            <div className="spinner large" />
            <p>Loading proposals...</p>
          </div>
        ) : (
          <>
            {/* Not connected warning */}
            {!wallet.isConnected && (
              <div className="info-banner">
                🔗 Please connect your Stellar wallet to vote.
              </div>
            )}

            {/* Error */}
            {voting.error && (
              <div className="error-banner">{voting.error}</div>
            )}

            {/* Proposals */}
            <section className="proposals-grid">
              {voting.proposals.map((proposal) => (
                <ProposalCard
                  key={proposal.id}
                  proposal={proposal}
                  totalVotes={totalVotes}
                  hasVoted={voting.hasVoted}
                  votedId={voting.votedId}
                  isVoting={voting.isVoting}
                  onVote={voting.vote}
                />
              ))}
            </section>

            {/* Results */}
            <ResultsChart proposals={voting.proposals} />
          </>
        )}
      </main>

      <footer className="app-footer">
        <p>Built on Stellar Testnet · Powered by Soroban</p>
      </footer>
    </div>
  );
}