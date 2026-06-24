import type { Movement } from "../types";
import { Icon } from "../components/Icon";
import { Timeline } from "../components/Timeline";

type MovementDetailProps = {
  movement: Movement;
  onBack: () => void;
  onToggleSupport: (id: string) => void;
  onShare: (movement: Movement) => void;
  onReport: (movement: Movement) => void;
};

const statusLabels: Record<Movement["status"], string> = {
  submitted: "Eingereicht",
  trending: "Trendet",
  review: "In Prüfung",
  implementation: "In Umsetzung",
  done: "Fertig",
};

export function MovementDetail({ movement, onBack, onToggleSupport, onShare, onReport }: MovementDetailProps) {
  return (
    <div className="screen detail-screen">
      <button className="back-button" type="button" onClick={onBack}>
        Zurück
      </button>

      <section className="detail-hero">
        <span className="movement-emoji large">{movement.emoji}</span>
        {movement.imageUrl ? <img className="detail-image" src={movement.imageUrl} alt="" /> : null}
        <h1>{movement.title}</h1>
        <p>{movement.description}</p>
        <strong>{movement.supporters.toLocaleString("de-DE")} Unterstützer</strong>
        <span className="status-line">● {statusLabels[movement.status]}</span>
      </section>

      <section className="detail-block">
        <h2>Status</h2>
        <Timeline status={movement.status} />
      </section>

      <section className="detail-block">
        <h2>Updates</h2>
        <div className="updates-list">
          {movement.updates.length ? (
            movement.updates.map((update) => (
              <article key={update.id} className="update-item">
                <small>{update.createdAt}</small>
                <p>{update.text}</p>
              </article>
            ))
          ) : (
            <article className="update-item">
              <small>Heute</small>
              <p>Diese Bewegung sammelt gerade erste Unterstützung.</p>
            </article>
          )}
        </div>
      </section>

      <div className="detail-actions">
        <button
          className={`primary-button ${movement.supportedByUser ? "muted" : ""}`}
          type="button"
          onClick={() => onToggleSupport(movement.id)}
        >
          {movement.supportedByUser ? "Unterstützt" : "Unterstützen"}
        </button>
        <button className="icon-action" type="button" onClick={() => onShare(movement)}>
          <Icon name="share" size={19} />
          Teilen
        </button>
        <button className="icon-action" type="button" onClick={() => onReport(movement)}>
          <Icon name="flag" size={18} />
          Melden
        </button>
      </div>
    </div>
  );
}
