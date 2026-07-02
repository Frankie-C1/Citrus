import type { CSSProperties } from "react";
import type { Group } from "../types";

type GroupVisualProps = {
  group?: Pick<Group, "scope" | "accent" | "logoUrl"> | null;
  fallback?: string;
  className?: string;
};

export function GroupVisual({ group, className = "" }: GroupVisualProps) {
  const scopeClass = group?.scope === "internal" ? "internal" : "external";
  const imageUrl = group?.logoUrl || "/group-default.png";

  return (
    <span
      className={`group-visual ${scopeClass} ${className}`}
      style={{ "--accent": group?.accent || "#ffcc00" } as CSSProperties}
      aria-hidden="true"
    >
      <img src={imageUrl} alt="" loading="lazy" />
    </span>
  );
}
