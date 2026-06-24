import { useState, type FormEvent } from "react";
import type { Movement } from "../types";
import { Icon } from "./Icon";

type ReportModalProps = {
  movement?: Movement;
  open: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
};

const reasons = ["Beleidigung", "Hetze", "Persönlicher Angriff", "Irreführend", "Anderer Grund"];

export function ReportModal({ movement, open, onClose, onSubmit }: ReportModalProps) {
  const [reason, setReason] = useState(reasons[0]);
  const [details, setDetails] = useState("");

  if (!open || !movement) return null;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(details.trim() ? `${reason}: ${details.trim()}` : reason);
    setReason(reasons[0]);
    setDetails("");
  }

  return (
    <div className="auth-backdrop" role="presentation">
      <section className="report-modal" role="dialog" aria-modal="true" aria-labelledby="report-title">
        <button className="icon-button auth-close" type="button" onClick={onClose} aria-label="Schließen">
          <Icon name="x" size={19} />
        </button>
        <span className="eyebrow">Melden</span>
        <h2 id="report-title">{movement.title}</h2>
        <form className="auth-form" onSubmit={submit}>
          <label>
            Grund
            <select value={reason} onChange={(event) => setReason(event.target.value)}>
              {reasons.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label>
            Kurzer Hinweis
            <textarea
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              rows={3}
              placeholder="Was sollen wir prüfen?"
            />
          </label>
          <button className="primary-button" type="submit">
            Meldung senden
          </button>
        </form>
      </section>
    </div>
  );
}
