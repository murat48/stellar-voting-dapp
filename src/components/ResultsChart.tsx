import type { Proposal } from "./ProposalCard";

interface ResultsChartProps {
  proposals: Proposal[];
}

export default function ResultsChart({ proposals }: ResultsChartProps) {
  const totalVotes = proposals.reduce((sum, p) => sum + p.voteCount, 0);

  if (proposals.length === 0) {
    return <p className="empty-state">No proposals to display.</p>;
  }

  const COLORS = [
    "#6366f1", "#ec4899", "#f59e0b", "#10b981",
    "#3b82f6", "#ef4444", "#8b5cf6", "#14b8a6",
  ];

  return (
    <div className="results-chart">
      <h2 className="chart-title">Voting Results</h2>
      <p className="chart-total">Total votes: {totalVotes}</p>

      <div className="chart-bars">
        {proposals.map((proposal, index) => {
          const percentage =
            totalVotes > 0
              ? Math.round((proposal.voteCount / totalVotes) * 100)
              : 0;
          const color = COLORS[index % COLORS.length];

          return (
            <div key={proposal.id} className="chart-row">
              <div className="chart-label" title={proposal.title}>
                {proposal.title}
              </div>
              <div className="chart-bar-track">
                <div
                  className="chart-bar-fill"
                  style={{ width: `${percentage}%`, backgroundColor: color }}
                  role="progressbar"
                  aria-valuenow={percentage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
              <div className="chart-value">
                {proposal.voteCount} ({percentage}%)
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
