import { Proposal } from "../hooks/useVoting";

interface Props {
  proposal: Proposal;
  totalVotes: number;
  hasVoted: boolean;
  votedId: number | null;
  isVoting: boolean;
  onVote: (id: number) => void;
}

export function ProposalCard({
  proposal,
  totalVotes,
  hasVoted,
  votedId,
  isVoting,
  onVote,
}: Props) {
  const percentage =
    totalVotes > 0
      ? Math.round((proposal.voteCount / totalVotes) * 100)
      : 0;

  const isMyVote = votedId === proposal.id;
  const isDisabled = hasVoted || isVoting;

  return (
    <div className={`proposal-card ${isMyVote ? "my-vote" : ""}`}>
      <div className="proposal-header">
        <h3>{proposal.title}</h3>
        {isMyVote && <span className="badge">✓ Your Vote</span>}
      </div>

      {/* Progress Bar */}
      <div className="progress-bar-wrapper">
        <div
          className="progress-bar-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="proposal-stats">
        <span>{proposal.voteCount} votes</span>
        <span>{percentage}%</span>
      </div>

      <button
        className="btn btn-vote"
        onClick={() => onVote(proposal.id)}
        disabled={isDisabled}
      >
        {isVoting && votedId === null ? (
          <>
            <span className="spinner" /> Submitting...
          </>
        ) : hasVoted ? (
          isMyVote ? "Voted ✓" : "Already Voted"
        ) : (
          "Vote"
        )}
      </button>
    </div>
  );
}