import { useState } from "react";

interface CreateProposalFormProps {
  connectedAddress?: string;
  onSubmit: (title: string, description: string) => Promise<void>;
}

export default function CreateProposalForm({
  connectedAddress,
  onSubmit,
}: CreateProposalFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError("Title and description are required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(false);
    try {
      await onSubmit(title.trim(), description.trim());
      setTitle("");
      setDescription("");
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create proposal");
    } finally {
      setSubmitting(false);
    }
  };

  if (!connectedAddress) {
    return (
      <div className="create-form-wrapper">
        <p className="empty-state">Connect your wallet to create a proposal.</p>
      </div>
    );
  }

  return (
    <div className="create-form-wrapper">
      <h2 className="create-form-title">Create New Proposal</h2>
      <p className="create-form-sub">
        The proposal will be signed and submitted on-chain by your wallet.
      </p>

      <form className="create-form" onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="proposal-title" className="form-label">
            Title
          </label>
          <input
            id="proposal-title"
            className="form-input"
            type="text"
            placeholder="Short, descriptive title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
            disabled={submitting}
          />
          <span className="form-hint">{title.length}/80</span>
        </div>

        <div className="form-field">
          <label htmlFor="proposal-description" className="form-label">
            Description
          </label>
          <textarea
            id="proposal-description"
            className="form-textarea"
            placeholder="Explain the proposal in detail…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            maxLength={500}
            disabled={submitting}
          />
          <span className="form-hint">{description.length}/500</span>
        </div>

        {error && <p className="form-error">{error}</p>}
        {success && <p className="form-success">✅ Proposal created successfully!</p>}

        <button
          type="submit"
          className="btn btn-primary"
          disabled={submitting || !title.trim() || !description.trim()}
        >
          {submitting ? "Submitting…" : "Create Proposal"}
        </button>
      </form>
    </div>
  );
}
