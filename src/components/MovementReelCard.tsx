import type { Movement } from "../types";
import { Icon } from "./Icon";

type MovementReelCardProps = {
  movement: Movement;
  onOpen: (movement: Movement) => void;
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

export function MovementReelCard({
  movement,
  onOpen,
  onToggleSupport,
  onShare,
  onReport,
}: MovementReelCardProps) {
  return (
    <article className="reel-card">
      <div className="reel-main">
        <div className="movement-topline">
          <span className="movement-emoji">{movement.emoji}</span>
          <span className="status-badge">{statusLabels[movement.status]}</span>
        </div>
        <span className="reel-group">{movement.groupName} · {movement.category}</span>
        <h2>{movement.title}</h2>
        <p>{movement.description}</p>
        <div className="reel-impact">
          <strong>{movement.supporters.toLocaleString("de-DE")}</strong>
          <span>Unterstützer</span>
          <em>+{movement.weeklyGrowth.toLocaleString("de-DE")} diese Woche</em>
        </div>
      </div>

      <div className="reel-actions" aria-label="Aktionen">
        <button
          className={movement.supportedByUser ? "active" : ""}
          type="button"
          onClick={() => onToggleSupport(movement.id)}
        >
          <Icon name="spark" size={21} />
          <span>{movement.supportedByUser ? "Aktiv" : "Support"}</span>
        </button>
        <button type="button" onClick={() => onOpen(movement)}>
          <Icon name="activity" size={21} />
          <span>Details</span>
        </button>
        <button type="button" onClick={() => onShare(movement)}>
          <Icon name="share" size={21} />
          <span>Teilen</span>
        </button>
        <button type="button" onClick={() => onReport(movement)}>
          <Icon name="flag" size={20} />
          <span>Melden</span>
        </button>
      </div>
    </article>
  );
}
