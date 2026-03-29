import { useState } from "react";

export interface Proposal {
  id: number;
  title: string;
  description: string;
  voteCount: number;
  creator: string;
  active: boolean;
}

interface ProposalCardProps {
  proposal: Proposal;
  connectedAddress?: string;
  hasVoted: boolean;
  onVote: (proposalId: number) => Promise<void>;
}

export default function ProposalCard({
  proposal,
  connectedAddress,
  hasVoted,
  onVote,
}: ProposalCardProps) {
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVote = async () => {
    if (!connectedAddress) {
      setError("Please connect your wallet first.");
      return;
    }
    setVoting(true);
    setError(null);
    try {
      await onVote(proposal.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Vote failed");
    } finally {
      setVoting(false);
    }
  };

  const statusLabel = proposal.active ? "Active" : "Closed";
  const statusClass = proposal.active ? "badge-active" : "badge-closed";

  return (
    <div className={`proposal-card ${!proposal.active ? "proposal-inactive" : ""}`}>
      <div className="proposal-header">
        <h3 className="proposal-title">{proposal.title}</h3>
        <span className={`badge ${statusClass}`}>{statusLabel}</span>
      </div>

      <p className="proposal-description">{proposal.description}</p>

      <div className="proposal-footer">
        <span className="vote-count">
          {proposal.voteCount} vote{proposal.voteCount !== 1 ? "s" : ""}
        </span>

        {proposal.active && (
          <button
            className="btn btn-primary"
            onClick={handleVote}
            disabled={voting || hasVoted || !connectedAddress}
            title={
              !connectedAddress
                ? "Connect wallet to vote"
                : hasVoted
                ? "You already voted"
                : "Cast your vote"
            }
          >
            {voting ? "Submitting…" : hasVoted ? "Voted" : "Vote"}
          </button>
        )}
      </div>

      {error && <p className="error-msg">{error}</p>}
    </div>
  );
}
