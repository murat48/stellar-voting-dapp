import { Proposal } from "../hooks/useVoting";

interface Props {
  proposals: Proposal[];
}

export function ResultsChart({ proposals }: Props) {
  const totalVotes = proposals.reduce((sum, p) => sum + p.voteCount, 0);
  const colors = ["#6366f1", "#22d3ee", "#f59e0b"];

  return (
    <div className="results-chart">
      <h2>Live Results</h2>
      {totalVotes === 0 ? (
        <p className="no-votes">No votes yet. Be the first!</p>
      ) : (
        <div className="chart-bars">
          {proposals.map((p, i) => {
            const pct = totalVotes > 0
              ? Math.round((p.voteCount / totalVotes) * 100)
              : 0;
            return (
              <div key={p.id} className="chart-row">
                <span className="chart-label">{p.title}</span>
                <div className="chart-bar-bg">
                  <div
                    className="chart-bar-fill"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: colors[i % colors.length],
                    }}
                  />
                </div>
                <span className="chart-pct">{pct}%</span>
              </div>
            );
          })}
        </div>
      )}
      <p className="total-votes">Total votes: {totalVotes}</p>
    </div>
  );
}