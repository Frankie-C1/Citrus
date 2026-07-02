import type { Movement } from "../types";
import { GroupVisual } from "./GroupVisual";

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
  const groupVisual = {
    name: movement.groupName,
    icon: movement.groupIcon,
    logoUrl: movement.groupLogoUrl,
    scope: movement.scope,
    category: movement.category,
    accent: movement.scope === "external" ? "#22c55e" : "#111111",
  };

  return (
    <article
      className={`movement-card ${variant} ${movement.imageUrl ? "has-image" : ""}`}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(movement)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onOpen(movement);
      }}
    >
      {movement.imageUrl ? <img src={movement.imageUrl} alt="" className="movement-card-bg" loading="lazy" /> : null}
      <div className="movement-topline">
        <GroupVisual group={groupVisual} />
        <span className="status-badge">{statusLabels[movement.status]}</span>
      </div>
      {!movement.imageUrl ? <div className="movement-card-emoji" aria-hidden="true">{movement.emoji}</div> : null}
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
