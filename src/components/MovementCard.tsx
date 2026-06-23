import type { Movement } from "../types";

type MovementCardProps = {
  movement: Movement;
  variant?: "feed" | "trending";
  onOpen: (movement: Movement) => void;
  onToggleSupport: (id: string) => void;
};

const statusLabels: Record<Movement["status"], string> = {
  submitted: "Eingereicht",
  trending: "Trend",
  review: "In Prüfung",
  implementation: "In Umsetzung",
  done: "Fertig",
};

export function MovementCard({
  movement,
  variant = "feed",
  onOpen,
  onToggleSupport,
}: MovementCardProps) {
  const growthText = `+${movement.weeklyGrowth.toLocaleString("de-DE")} Stimmen`;

  return (
    <article
      className={`movement-card ${variant}`}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(movement)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onOpen(movement);
      }}
    >
      <div className="movement-topline">
        <span className="movement-emoji">{movement.emoji}</span>
        <span className="status-badge">{statusLabels[movement.status]}</span>
      </div>
      <h3>{movement.title}</h3>
      <p>{movement.groupName} · {movement.category}</p>
      <div className="movement-meta">
        <strong>{growthText}</strong>
        <span>{movement.supporters.toLocaleString("de-DE")} Unterstützer</span>
      </div>
      <button
        className={`support-button ${movement.supportedByUser ? "supported" : ""}`}
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onToggleSupport(movement.id);
        }}
      >
        {movement.supportedByUser ? "Unterstützt" : "Unterstützen"}
      </button>
    </article>
  );
}
