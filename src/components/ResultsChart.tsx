import type { Proposal } from "./ProposalCard";

interface ResultsChartProps {
  proposals: Proposal[];
}

const BARS = [
  { key: "approveCount" as const, label: "Approve",  color: "#059669" },
  { key: "rejectCount"  as const, label: "Reject",   color: "#dc2626" },
  { key: "abstainCount" as const, label: "Abstain",  color: "#475569" },
];

export default function ResultsChart({ proposals }: ResultsChartProps) {
  if (proposals.length === 0) {
    return <p className="empty-state">No proposals to display.</p>;
  }

  return (
    <div className="results-chart">
      <h2 className="chart-title">Voting Results</h2>

      {proposals.map((proposal) => {
        const total = proposal.approveCount + proposal.rejectCount + proposal.abstainCount;
        const pct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0;

        return (
          <div key={proposal.id} className="chart-proposal-block">
            <h3 className="chart-proposal-title">{proposal.title}</h3>
            <p className="chart-total">Total: {total} vote{total !== 1 ? "s" : ""}</p>

            <div className="chart-bars">
              {BARS.map(({ key, label, color }) => {
                const count = proposal[key];
                const percentage = pct(count);
                return (
                  <div key={key} className="chart-row">
                    <div className="chart-label">{label}</div>
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
                    <div className="chart-value">{count} ({percentage}%)</div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
