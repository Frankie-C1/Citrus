import type { Movement } from "../types";

export type RecommendationMode = "for-you" | "trending" | "groups" | "supported";

export type UserRecommendationContext = {
  userId?: string | null;
  membershipGroupIds?: Iterable<string>;
  supportedGroupIds?: Iterable<string>;
  interactedCategories?: Iterable<string>;
  seenMovementIds?: Iterable<string>;
  mode?: RecommendationMode;
};

export type RankedMovement = {
  movement: Movement;
  score: number;
  reasons: Record<string, number>;
};

function toSet(values?: Iterable<string>) {
  return values instanceof Set ? values : new Set(values ?? []);
}

function dateValue(value?: string) {
  const time = value ? new Date(value).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function statusWeight(status: Movement["status"]) {
  if (status === "done") return 24;
  if (status === "implementation") return 18;
  if (status === "review") return 12;
  if (status === "trending") return 10;
  return 0;
}

export function rankPostsForUser(posts: Movement[], context: UserRecommendationContext = {}): RankedMovement[] {
  const membershipGroupIds = toSet(context.membershipGroupIds);
  const supportedGroupIds = toSet(context.supportedGroupIds);
  const interactedCategories = toSet(context.interactedCategories);
  const seenMovementIds = toSet(context.seenMovementIds);
  const mode = context.mode ?? "for-you";
  const now = Date.now();

  return posts
    .filter((movement) => movement.scope === "internal")
    .map((movement) => {
      const ageHours = Math.max(0, (now - dateValue(movement.createdAt)) / 36e5);
      const recentSupporters = movement.recentSupporters ?? 0;
      const recentUpdates = movement.recentUpdates ?? 0;
      const membership = membershipGroupIds.has(movement.groupId) ? 150 : -90;
      const supportedGroup = supportedGroupIds.has(movement.groupId) ? 38 : 0;
      const interest = interactedCategories.has(movement.category) ? 24 : 0;
      const recency = clamp(42 - ageHours * 0.65, 0, 42);
      const support = Math.log1p(Math.max(0, movement.supporters)) * 14;
      const velocity = Math.max(0, movement.weeklyGrowth) * 7 + recentSupporters * 16 + (movement.trendingScore ?? 0) * 0.8;
      const comments = Math.log1p(Math.max(0, movement.commentCount ?? 0)) * 8;
      const unseen = seenMovementIds.has(movement.id) ? -14 : 18;
      const supportedContext = movement.supportedByUser ? (mode === "supported" ? 110 : -12) : 0;
      const ownPost = context.userId && movement.userId === context.userId ? -16 : 0;
      const status = statusWeight(movement.status) + recentUpdates * 8;
      const modeBoost =
        mode === "trending"
          ? velocity * 0.9 + support * 0.35
          : mode === "groups"
            ? membershipGroupIds.has(movement.groupId) ? 55 : -50
            : 0;

      const reasons = {
        membership,
        supportedGroup,
        interest,
        recency,
        support,
        velocity,
        comments,
        unseen,
        supportedContext,
        ownPost,
        status,
        modeBoost,
      };
      const score = Object.values(reasons).reduce((sum, value) => sum + value, 0);
      return { movement, score, reasons };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const createdDiff = dateValue(b.movement.createdAt) - dateValue(a.movement.createdAt);
      if (createdDiff) return createdDiff;
      return a.movement.id.localeCompare(b.movement.id);
    });
}

export function sortMovementsForUser(posts: Movement[], context: UserRecommendationContext = {}) {
  return rankPostsForUser(posts, context).map((item) => item.movement);
}
