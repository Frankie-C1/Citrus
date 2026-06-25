import type { CSSProperties } from "react";
import type { BackgroundType, Movement } from "../types";

const allowedBackgroundTypes = new Set<BackgroundType>(["image", "color", "gradient", "emoji"]);

export function normalizeBackgroundType(value?: string | null): BackgroundType {
  return allowedBackgroundTypes.has(value as BackgroundType) ? (value as BackgroundType) : "emoji";
}

export function displayAuthorName(movement: Movement) {
  if (movement.isAnonymous) return "Anonym";
  return movement.authorDisplayName || movement.authorUsername || "Anonym";
}

export function shouldHideAuthorIdentity(movement: Movement) {
  return movement.isAnonymous || displayAuthorName(movement) === "Anonym";
}

export function movementVisualStyle(movement: Pick<Movement, "imageUrl" | "backgroundType" | "backgroundValue">): CSSProperties {
  const type = normalizeBackgroundType(movement.backgroundType);
  const value = movement.backgroundValue?.trim();

  if (movement.imageUrl || (type === "image" && value)) {
    return { backgroundColor: "#050505" };
  }

  if (type === "gradient" && value) return { backgroundImage: value };
  if (type === "color" && value) return { backgroundColor: value };
  return {
    backgroundImage: "linear-gradient(135deg, #161616, #050505)",
  };
}

export function movementImageUrl(movement: Pick<Movement, "imageUrl" | "backgroundType" | "backgroundValue">) {
  if (movement.imageUrl) return movement.imageUrl;
  if (normalizeBackgroundType(movement.backgroundType) === "image") return movement.backgroundValue || undefined;
  return undefined;
}