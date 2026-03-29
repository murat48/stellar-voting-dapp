import { useState } from "react";

export type VoteChoice = 0 | 1 | 2; // 0=Approve 1=Reject 2=Abstain

export interface Proposal {
  id: number;
  title: string;
  description: string;
  approveCount: number;
  rejectCount: number;
  abstainCount: number;
  creator: string;
  active: boolean;
}

interface ProposalCardProps {
  proposal: Proposal;
  connectedAddress?: string;
  userChoice: VoteChoice | null; // null = not voted
  onVote: (proposalId: number, choice: VoteChoice) => Promise<void>;
}

const VOTE_OPTIONS: { choice: VoteChoice; label: string; cls: string }[] = [
  { choice: 0, label: "✅ Approve",   cls: "btn-approve" },
  { choice: 1, label: "❌ Reject",    cls: "btn-reject"  },
  { choice: 2, label: "🤔 Abstain",   cls: "btn-abstain" },
];

export default function ProposalCard({
  proposal,
  connectedAddress,
  userChoice,
  onVote,
}: ProposalCardProps) {
  const [voting, setVoting] = useState<VoteChoice | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasVoted = userChoice !== null;
  const total = proposal.approveCount + proposal.rejectCount + proposal.abstainCount;

  const handleVote = async (choice: VoteChoice) => {
    if (!connectedAddress) { setError("Connect your wallet first."); return; }
    setVoting(choice);
    setError(null);
    try {
      await onVote(proposal.id, choice);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Vote failed");
    } finally {
      setVoting(null);
    }
  };

  const statusLabel = proposal.active ? "Active" : "Closed";
  const statusClass = proposal.active ? "badge-active" : "badge-closed";

  const pct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0;

  return (
    <div className={`proposal-card ${!proposal.active ? "proposal-inactive" : ""}`}>
      <div className="proposal-header">
        <h3 className="proposal-title">{proposal.title}</h3>
        <span className={`badge ${statusClass}`}>{statusLabel}</span>
      </div>

      <p className="proposal-description">{proposal.description}</p>

      {/* mini result bars */}
      <div className="vote-bars">
        <div className="vote-bar-row">
          <span>Approve</span>
          <div className="vote-bar-track"><div className="vote-bar-fill approve" style={{ width: `${pct(proposal.approveCount)}%` }} /></div>
          <span>{proposal.approveCount} ({pct(proposal.approveCount)}%)</span>
        </div>
        <div className="vote-bar-row">
          <span>Reject</span>
          <div className="vote-bar-track"><div className="vote-bar-fill reject" style={{ width: `${pct(proposal.rejectCount)}%` }} /></div>
          <span>{proposal.rejectCount} ({pct(proposal.rejectCount)}%)</span>
        </div>
        <div className="vote-bar-row">
          <span>Abstain</span>
          <div className="vote-bar-track"><div className="vote-bar-fill abstain" style={{ width: `${pct(proposal.abstainCount)}%` }} /></div>
          <span>{proposal.abstainCount} ({pct(proposal.abstainCount)}%)</span>
        </div>
      </div>

      <p className="vote-total">Total: {total} vote{total !== 1 ? "s" : ""}</p>

      {proposal.active && !hasVoted && (
        <div className="vote-actions">
          {VOTE_OPTIONS.map(({ choice, label, cls }) => (
            <button
              key={choice}
              className={`btn ${cls}`}
              onClick={() => handleVote(choice)}
              disabled={voting !== null || !connectedAddress}
              title={!connectedAddress ? "Connect wallet to vote" : ""}
            >
              {voting === choice ? "Submitting…" : label}
            </button>
          ))}
        </div>
      )}

      {proposal.active && hasVoted && (
        <p className="voted-label">
          Your vote: {userChoice === 0 ? "✅ Approve" : userChoice === 1 ? "❌ Reject" : "🤔 Abstain"}
        </p>
      )}

      {error && <p className="error-msg">{error}</p>}
    </div>
  );
}
