import type { CSSProperties } from "react";
import type { Group } from "../types";

type GroupVisualProps = {
  group?: Pick<Group, "name" | "icon" | "scope" | "category" | "accent"> | null;
  fallback?: string;
  className?: string;
};

const externalSymbols: Record<string, string> = {
  whatsapp: "☎",
  snapchat: "◌",
  instagram: "▣",
  tiktok: "♪",
  youtube: "▶",
  spotify: "≋",
  "apple music": "♫",
  netflix: "▰",
  amazon: "▱",
  apple: "⌘",
  google: "⌕",
  microsoft: "⊞",
  discord: "☊",
  telegram: "✈",
  x: "×",
  reddit: "◎",
  twitch: "▸",
  "deutsche bahn": "↔",
  dhl: "▤",
  "mcdonald's": "☰",
  "burger king": "≡",
  nike: "⌁",
  adidas: "△",
  "h&m": "◧",
  zara: "◇",
};

const categorySymbols: Record<string, string> = {
  app: "✦",
  marke: "◆",
  mobilität: "↔",
  mobilitaet: "↔",
  logistik: "▤",
  stadt: "⌂",
  universität: "✺",
  universitaet: "✺",
  sport: "◍",
};

function initials(name: string) {
  return (
    name
      .split(/[ ._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "C"
  );
}

function symbolFor(group?: GroupVisualProps["group"], fallback?: string) {
  if (!group) return fallback || "✦";
  const key = group.name.toLowerCase();
  const category = group.category.toLowerCase();
  if (group.scope === "external") {
    return externalSymbols[key] || categorySymbols[category] || group.icon || "✦";
  }
  return group.icon && group.icon.length <= 3 ? group.icon : fallback || initials(group.name);
}

export function GroupVisual({ group, fallback, className = "" }: GroupVisualProps) {
  const scopeClass = group?.scope === "internal" ? "internal" : "external";
  return (
    <span
      className={`group-visual ${scopeClass} ${className}`}
      style={{ "--accent": group?.accent || "#22c55e" } as CSSProperties}
      aria-hidden="true"
    >
      {symbolFor(group, fallback)}
    </span>
  );
}
