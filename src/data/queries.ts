import { supabase } from "../lib/supabase";
import type { CreateMovementInput, Group, Movement, MovementStatus, MovementType, Scope, UserStats } from "../types";

type GroupRow = {
  id: string;
  name: string;
  category: string;
  scope: Scope;
  icon: string | null;
  description: string | null;
  created_at: string | null;
};

type SupportRow = {
  id: string;
  user_id: string | null;
  created_at: string | null;
};

type UpdateRow = {
  id: string;
  body: string;
  created_at: string | null;
};

type MovementRow = {
  id: string;
  title: string;
  description: string;
  type: MovementType;
  status: MovementStatus;
  group_id: string | null;
  user_id: string | null;
  category: string | null;
  created_at: string | null;
  groups: GroupRow | GroupRow[] | null;
  supports: SupportRow[] | null;
  movement_updates: UpdateRow[] | null;
};

function accentForScope(scope: Scope) {
  return scope === "external" ? "#22C55E" : "#111111";
}

function emojiForMovement(type: MovementType, category?: string) {
  const normalized = (category ?? "").toLowerCase();
  if (normalized.includes("mobil")) return "↗";
  if (normalized.includes("stadt")) return "●";
  if (normalized.includes("sport")) return "○";
  if (normalized.includes("kommunikation")) return "◇";
  if (normalized.includes("produkt")) return "✦";
  if (type === "problem") return "!";
  if (type === "question") return "?";
  if (type === "improvement") return "↑";
  return "✦";
}

function resolveGroup(group: GroupRow | GroupRow[] | null | undefined) {
  return Array.isArray(group) ? group[0] : group;
}

function mapGroup(row: GroupRow): Group {
  return {
    id: row.id,
    name: row.name,
    scope: row.scope,
    category: row.category,
    members: 0,
    accent: accentForScope(row.scope),
    icon: row.icon,
    description: row.description,
  };
}

function mapMovement(row: MovementRow, userId?: string | null): Movement {
  const group = resolveGroup(row.groups);
  const supports = row.supports ?? [];
  const updates = row.movement_updates ?? [];
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const category = row.category || group?.category || "Allgemein";

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    emoji: emojiForMovement(row.type, category),
    groupId: row.group_id ?? group?.id ?? "",
    groupName: group?.name ?? "Öffentlich",
    scope: group?.scope ?? "external",
    type: row.type,
    supporters: supports.length,
    weeklyGrowth: supports.filter((support) => {
      if (!support.created_at) return false;
      return new Date(support.created_at).getTime() >= sevenDaysAgo;
    }).length,
    status: row.status,
    category,
    updates: updates
      .slice()
      .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
      .map((update) => ({
        id: update.id,
        text: update.body,
        createdAt: update.created_at ? new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "short" }).format(new Date(update.created_at)) : "Heute",
      })),
    supportedByUser: Boolean(userId && supports.some((support) => support.user_id === userId)),
    userId: row.user_id,
    createdAt: row.created_at ?? undefined,
  };
}

export async function fetchGroups() {
  const { data, error } = await supabase
    .from("groups")
    .select("id,name,category,scope,icon,description,created_at")
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => mapGroup(row as GroupRow));
}

export async function fetchMovements(userId?: string | null) {
  const { data, error } = await supabase
    .from("movements")
    .select(
      "id,title,description,type,status,group_id,user_id,category,created_at,groups:group_id(id,name,category,scope,icon,description,created_at),supports(id,user_id,created_at),movement_updates(id,body,created_at)",
    )
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => mapMovement(row as unknown as MovementRow, userId));
}

export async function createMovement(input: CreateMovementInput, userId: string) {
  const { data, error } = await supabase
    .from("movements")
    .insert({
      title: input.title,
      description: input.description,
      type: input.type,
      status: "submitted",
      group_id: input.groupId,
      user_id: userId,
      category: input.category,
    })
    .select("id")
    .single();

  if (error) throw error;

  await supabase.from("movement_updates").insert({
    movement_id: data.id,
    body: "Die Bewegung wurde gerade gestartet.",
  });

  return data.id as string;
}

export async function addSupport(movementId: string, userId: string) {
  const { error } = await supabase.from("supports").insert({
    movement_id: movementId,
    user_id: userId,
  });

  if (error && error.code !== "23505") throw error;
}

export async function removeSupport(movementId: string, userId: string) {
  const { error } = await supabase.from("supports").delete().match({
    movement_id: movementId,
    user_id: userId,
  });

  if (error) throw error;
}

export function deriveStats(movements: Movement[], userId?: string | null): UserStats {
  const ownMovements = userId ? movements.filter((movement) => movement.userId === userId) : [];
  const supportedMovements = userId ? movements.filter((movement) => movement.supportedByUser) : [];
  const relevantMovements = [...new Map([...ownMovements, ...supportedMovements].map((movement) => [movement.id, movement])).values()];
  const categories = relevantMovements.reduce<Record<string, number>>((acc, movement) => {
    acc[movement.category] = (acc[movement.category] ?? 0) + 1;
    return acc;
  }, {});
  const activeGroupIds = new Set(relevantMovements.map((movement) => movement.groupId).filter(Boolean));
  const reached = relevantMovements.reduce((sum, movement) => sum + movement.supporters, 0);
  const weeklyBase = relevantMovements.reduce((sum, movement) => sum + movement.weeklyGrowth, 0);

  return {
    reached,
    supportedTopics: supportedMovements.length,
    ownMovements: ownMovements.length,
    implementedIdeas: relevantMovements.filter((movement) => movement.status === "done").length,
    topCategory:
      Object.entries(categories).sort((a, b) => b[1] - a[1])[0]?.[0] ??
      (movements[0]?.category || "Noch offen"),
    activeGroups: activeGroupIds.size,
    comments: ownMovements.length,
    risingTopics: relevantMovements.filter((movement) => movement.weeklyGrowth > 0).length,
    weeklyReach: [0.2, 0.34, 0.42, 0.58, 0.67, 0.82, 1].map((factor) =>
      Math.round(Math.max(1, weeklyBase) * factor),
    ),
  };
}
