import { isSupabaseConfigured, supabase, getSupabaseConfigError } from "../lib/supabase";
import type {
  AdminUserResult,
  AdminGroupInput,
  BackgroundType,
  CreateMovementInput,
  FeedbackInput,
  FeedPreferences,
  Group,
  GroupAdmin,
  GroupMembership,
  ModerationSummary,
  Movement,
  MovementStatus,
  MovementType,
  Notification,
  NotificationDetail,
  NotificationFrequency,
  NotificationPreferences,
  PrivacyVisibility,
  Scope,
  SettingsBundle,
  ThemePreference,
  UpdateMovementInput,
  UserSettings,
  UserRole,
  UserStats,
} from "../types";

type GroupRow = {
  id: string;
  name: string;
  category: string;
  scope: Scope;
  icon: string | null;
  logo_url: string | null;
  description: string | null;
  invite_code: string | null;
};

type MovementRow = {
  id: string;
  title: string;
  description: string;
  type: MovementType;
  status: MovementStatus;
  group_id: string | null;
  user_id: string | null;
  scope: Scope;
  emoji: string | null;
  image_url: string | null;
  background_type?: BackgroundType | null;
  background_value?: string | null;
  is_anonymous?: boolean | null;
  category: string | null;
  report_count: number | null;
  created_at: string | null;
};

type SupportRow = {
  id: string;
  movement_id: string;
  user_id: string | null;
  created_at: string | null;
};

type ReactionRow = {
  id: string;
  movement_id: string;
  user_id: string | null;
  reaction_type: "dislike";
  created_at: string | null;
};

type UpdateRow = {
  id: string;
  movement_id: string;
  body: string;
  status: MovementStatus | null;
  created_at: string | null;
};

type NotificationRow = {
  id: string;
  user_id: string;
  title: string | null;
  body: string | null;
  type: string | null;
  movement_id: string | null;
  target_type?: string | null;
  target_id?: string | null;
  is_read: boolean | null;
  created_at: string | null;
};

type AdminNotificationRow = {
  id: string;
  admin_user_id: string;
  title: string | null;
  body: string | null;
  type: string | null;
  target_type: string | null;
  target_id: string | null;
  is_read: boolean | null;
  created_at: string | null;
};

type ProfileLiteRow = {
  id: string;
  email: string | null;
  username: string | null;
  display_name: string | null;
  avatar_url?: string | null;
  role: UserRole | null;
};

type MembershipRow = {
  id: string;
  group_id: string;
  user_id: string;
  role: "member" | "admin";
  joined_at: string | null;
  groups: GroupRow | GroupRow[] | null;
};

type GroupAdminRow = {
  id: string;
  group_id: string;
  user_id: string;
  created_at: string | null;
  profiles: ProfileLiteRow | ProfileLiteRow[] | null;
};

type UserSettingsRow = {
  user_id: string;
  theme: ThemePreference | null;
  privacy_visibility: PrivacyVisibility | null;
  feed_preferences: Partial<FeedPreferences> | null;
};

type NotificationPreferencesRow = {
  user_id: string;
  new_group_posts: NotificationFrequency | null;
  own_post_support: NotificationFrequency | null;
  supported_updates: NotificationFrequency | null;
  group_trending: NotificationFrequency | null;
  implemented_projects: NotificationFrequency | null;
  group_ids: string[] | null;
};

type UserInterestRow = {
  category: string;
};

type BlockRow = {
  id: string;
  created_at: string | null;
  blocked_profile: ProfileLiteRow | ProfileLiteRow[] | null;
};

type ReportSummaryRow = {
  id: string;
  reason: string | null;
  created_at: string | null;
  movements: Pick<MovementRow, "title"> | Array<Pick<MovementRow, "title">> | null;
};

const defaultFeedPreferences: FeedPreferences = {
  prioritizeForYou: true,
  onlyGroups: false,
  highlightSupported: true,
  boostTrending: true,
  newestFirst: false,
};

const defaultUserSettings: UserSettings = {
  theme: "system",
  privacyVisibility: "visible",
  feedPreferences: defaultFeedPreferences,
};

const defaultNotificationPreferences: NotificationPreferences = {
  newGroupPosts: "daily",
  ownPostSupport: "instant",
  supportedUpdates: "daily",
  groupTrending: "daily",
  implementedProjects: "instant",
  groupIds: [],
};

function requireSupabase() {
  if (!isSupabaseConfigured) throw new Error(getSupabaseConfigError());
}

function logSupabaseError(label: string, error: unknown) {
  console.error(`[Citrus] ${label}:`, error);
}

function isMissingOptionalTable(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String(error.code) : "";
  const message = "message" in error ? String(error.message).toLowerCase() : "";
  return code === "42P01" || code === "42703" || message.includes("does not exist") || message.includes("schema cache");
}

function mergeFeedPreferences(value?: Partial<FeedPreferences> | null): FeedPreferences {
  return { ...defaultFeedPreferences, ...(value ?? {}) };
}

function mapUserSettings(row?: UserSettingsRow | null): UserSettings {
  if (!row) return defaultUserSettings;
  return {
    theme: row.theme ?? defaultUserSettings.theme,
    privacyVisibility: row.privacy_visibility ?? defaultUserSettings.privacyVisibility,
    feedPreferences: mergeFeedPreferences(row.feed_preferences),
  };
}

function mapNotificationPreferences(row?: NotificationPreferencesRow | null): NotificationPreferences {
  if (!row) return defaultNotificationPreferences;
  return {
    newGroupPosts: row.new_group_posts ?? defaultNotificationPreferences.newGroupPosts,
    ownPostSupport: row.own_post_support ?? defaultNotificationPreferences.ownPostSupport,
    supportedUpdates: row.supported_updates ?? defaultNotificationPreferences.supportedUpdates,
    groupTrending: row.group_trending ?? defaultNotificationPreferences.groupTrending,
    implementedProjects: row.implemented_projects ?? defaultNotificationPreferences.implementedProjects,
    groupIds: row.group_ids ?? [],
  };
}

function accentForScope(scope: Scope) {
  return scope === "external" ? "#6B7280" : "#111111";
}

function fallbackEmoji(type: MovementType, category?: string) {
  const normalized = (category ?? "").toLowerCase();
  if (normalized.includes("mobil")) return "🚲";
  if (normalized.includes("stadt")) return "🌿";
  if (normalized.includes("sport")) return "🏀";
  if (normalized.includes("kommunikation")) return "💬";
  if (normalized.includes("produkt")) return "✨";
  if (type === "problem") return "!";
  if (type === "question") return "?";
  if (type === "improvement") return "↗";
  return "✨";
}

function fallbackDisplayEmoji(type: MovementType, category?: string) {
  const normalized = (category ?? "").toLowerCase();
  if (normalized.includes("mobil")) return "🚲";
  if (normalized.includes("stadt")) return "🌿";
  if (normalized.includes("sport")) return "🏀";
  if (normalized.includes("kommunikation")) return "💬";
  if (normalized.includes("produkt")) return "✨";
  if (type === "problem") return "!";
  if (type === "question") return "?";
  if (type === "improvement") return "↗";
  return "✨";
}

const DAY_MS = 24 * 60 * 60 * 1000;

function countSince<T extends { created_at: string | null }>(rows: T[], since: number) {
  return rows.filter((row) => {
    if (!row.created_at) return false;
    return new Date(row.created_at).getTime() >= since;
  }).length;
}

function buildHistory(
  rows: Array<{ created_at: string | null }>,
  days = 7,
  now = Date.now(),
) {
  const buckets = Array.from({ length: days }, () => 0);
  for (const row of rows) {
    if (!row.created_at) continue;
    const timestamp = new Date(row.created_at).getTime();
    if (!Number.isFinite(timestamp)) continue;
    const daysAgo = Math.floor((now - timestamp) / DAY_MS);
    if (daysAgo >= 0 && daysAgo < days) {
      buckets[days - 1 - daysAgo] += 1;
    }
  }
  return buckets;
}

function calculateTrendingScore(input: {
  supporters: number;
  weeklyGrowth: number;
  recentSupporters: number;
  recentUpdates: number;
  createdAt?: string | null;
}) {
  const ageHours = input.createdAt
    ? Math.max(0, (Date.now() - new Date(input.createdAt).getTime()) / (60 * 60 * 1000))
    : 72;
  const recencyScore = 1 / (1 + ageHours / 24);
  return (
    input.recentSupporters * 4 +
    input.weeklyGrowth * 2 +
    input.recentUpdates * 3 +
    input.supporters * 0.4 +
    recencyScore * 12
  );
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
    logoUrl: row.logo_url,
    description: row.description,
    inviteCode: row.invite_code,
  };
}

export async function fetchGroups() {
  requireSupabase();
  const { data, error } = await supabase
    .from("groups")
    .select("id,name,category,scope,icon,logo_url,description,invite_code")
    .eq("scope", "internal")
    .order("name", { ascending: true });

  if (error) {
    logSupabaseError("fetchGroups failed", error);
    throw error;
  }
  return (data ?? []).map((row) => mapGroup(row as GroupRow));
}

export async function fetchMovements(userId?: string | null) {
  requireSupabase();

  const { data: movementRows, error: movementError } = await supabase
    .from("movements")
    .select("id,title,description,type,status,group_id,user_id,scope,emoji,image_url,background_type,background_value,is_anonymous,category,report_count,created_at")
    .eq("scope", "internal")
    .order("created_at", { ascending: false });

  if (movementError) {
    logSupabaseError("fetchMovements movements failed", movementError);
    throw movementError;
  }

  const movements = (movementRows ?? []) as MovementRow[];
  if (!movements.length) return [];

  const groupIds = [...new Set(movements.map((movement) => movement.group_id).filter(Boolean))] as string[];
  const movementIds = movements.map((movement) => movement.id);
  const authorIds = [...new Set(movements.map((movement) => movement.user_id).filter(Boolean))] as string[];

  const [groupsResult, supportsResult, reactionsResult, updatesResult, profilesResult] = await Promise.all([
    groupIds.length
      ? supabase.from("groups").select("id,name,category,scope,icon,logo_url,description,invite_code").in("id", groupIds)
      : Promise.resolve({ data: [], error: null }),
    supabase.from("supports").select("id,movement_id,user_id,created_at").in("movement_id", movementIds),
    supabase.from("movement_reactions").select("id,movement_id,user_id,reaction_type,created_at").eq("reaction_type", "dislike").in("movement_id", movementIds),
    supabase.from("movement_updates").select("id,movement_id,body,created_at").in("movement_id", movementIds),
    authorIds.length
      ? supabase.from("profiles").select("id,email,username,display_name,avatar_url,role").in("id", authorIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (groupsResult.error) logSupabaseError("fetchMovements groups partial failure", groupsResult.error);
  if (supportsResult.error) logSupabaseError("fetchMovements supports partial failure", supportsResult.error);
  if (reactionsResult.error && !isMissingOptionalTable(reactionsResult.error)) logSupabaseError("fetchMovements reactions partial failure", reactionsResult.error);
  if (updatesResult.error) logSupabaseError("fetchMovements updates partial failure", updatesResult.error);
  if (profilesResult.error) logSupabaseError("fetchMovements profiles partial failure", profilesResult.error);

  const supportRows = (supportsResult.data ?? []) as SupportRow[];
  const reactionRows = reactionsResult.error ? [] : ((reactionsResult.data ?? []) as ReactionRow[]);
  const supporterIds = [...new Set(supportRows.map((support) => support.user_id).filter(Boolean))] as string[];
  const supporterProfilesResult = supporterIds.length
    ? await supabase.from("profiles").select("id,email,username,display_name,avatar_url,role").in("id", supporterIds)
    : { data: [], error: null };
  if (supporterProfilesResult.error) {
    logSupabaseError("fetchMovements supporter profiles partial failure", supporterProfilesResult.error);
  }

  const groupsById = new Map(((groupsResult.data ?? []) as GroupRow[]).map((group) => [group.id, group]));
  const profilesById = new Map(
    [
      ...((profilesResult.data ?? []) as ProfileLiteRow[]),
      ...((supporterProfilesResult.data ?? []) as ProfileLiteRow[]),
    ].map((profile) => [profile.id, profile]),
  );
  const supportsByMovement = new Map<string, SupportRow[]>();
  const dislikesByMovement = new Map<string, ReactionRow[]>();
  const updatesByMovement = new Map<string, UpdateRow[]>();

  for (const support of supportRows) {
    supportsByMovement.set(support.movement_id, [...(supportsByMovement.get(support.movement_id) ?? []), support]);
  }

  for (const reaction of reactionRows) {
    dislikesByMovement.set(reaction.movement_id, [...(dislikesByMovement.get(reaction.movement_id) ?? []), reaction]);
  }

  for (const update of ((updatesResult.data ?? []) as UpdateRow[])) {
    updatesByMovement.set(update.movement_id, [...(updatesByMovement.get(update.movement_id) ?? []), update]);
  }

  const now = Date.now();
  const sevenDaysAgo = now - 7 * DAY_MS;
  const threeDaysAgo = now - 3 * DAY_MS;

  return movements.map((movement): Movement => {
    const group = movement.group_id ? groupsById.get(movement.group_id) : undefined;
    const supports = supportsByMovement.get(movement.id) ?? [];
    const dislikes = dislikesByMovement.get(movement.id) ?? [];
    const updates = updatesByMovement.get(movement.id) ?? [];
    const author = movement.user_id ? profilesById.get(movement.user_id) : undefined;
    const isAnonymous = Boolean(movement.is_anonymous);
    const category = movement.category || group?.category || "Allgemein";
    const userSupport = userId ? supports.find((support) => support.user_id === userId) : undefined;
    const userDislike = userId ? dislikes.find((reaction) => reaction.user_id === userId) : undefined;
    const supporterPreviews = supports
      .slice()
      .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
      .map((support) => (support.user_id ? profilesById.get(support.user_id) : undefined))
      .filter((supporter): supporter is ProfileLiteRow => Boolean(supporter))
      .slice(0, 3)
      .map((supporter) => ({
        id: supporter.id,
        name: supporter.display_name || supporter.username || "Anonym",
        avatarUrl: supporter.avatar_url,
      }));
    const weeklyGrowth = countSince(supports, sevenDaysAgo);
    const recentSupporters = countSince(supports, threeDaysAgo);
    const recentUpdates = countSince(updates, threeDaysAgo);
    const activityRows = [
      ...supports,
      ...updates,
      ...(movement.created_at ? [{ created_at: movement.created_at }] : []),
    ];

    return {
      id: movement.id,
      title: movement.title,
      description: movement.description,
      emoji: movement.emoji || fallbackDisplayEmoji(movement.type, category),
      imageUrl: movement.image_url,
      backgroundType: movement.background_type ?? (movement.image_url ? "image" : "emoji"),
      backgroundValue: movement.background_value ?? movement.image_url ?? null,
      groupId: movement.group_id ?? "",
      groupName: group?.name ?? "Interne Gruppe",
      groupIcon: group?.icon,
      groupLogoUrl: group?.logo_url,
      scope: movement.scope ?? group?.scope ?? "internal",
      type: movement.type,
      supporters: supports.length,
      dislikes: dislikes.length,
      weeklyGrowth,
      status: movement.status,
      category,
      updates: updates
        .slice()
        .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
        .map((update) => ({
          id: update.id,
          text: update.body,
          createdAt: update.created_at
            ? new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "short" }).format(new Date(update.created_at))
            : "Heute",
      })),
      supportedByUser: Boolean(userSupport),
      dislikedByUser: Boolean(userDislike),
      userSupportCreatedAt: userSupport?.created_at ?? undefined,
      userId: movement.user_id,
      authorUsername: isAnonymous ? "Anonym" : author?.username,
      authorDisplayName: isAnonymous ? "Anonym" : author?.display_name,
      authorAvatarUrl: isAnonymous ? null : author?.avatar_url,
      authorRole: isAnonymous ? null : author?.role,
      isAnonymous,
      commentCount: updates.length,
      supporterPreviews,
      reportCount: movement.report_count ?? 0,
      createdAt: movement.created_at ?? undefined,
      recentSupporters,
      recentUpdates,
      trendingScore: calculateTrendingScore({
        supporters: supports.length,
        weeklyGrowth,
        recentSupporters,
        recentUpdates,
        createdAt: movement.created_at,
      }),
      supportHistory: buildHistory(supports, 7, now),
      activityHistory: buildHistory(activityRows, 7, now),
    };
  });
}

export async function createMovement(input: CreateMovementInput, userId: string) {
  requireSupabase();
  const { data, error } = await supabase
    .from("movements")
    .insert({
      title: input.title,
      description: input.description,
      type: input.type,
      status: "submitted",
      group_id: input.groupId,
      user_id: userId,
      scope: input.scope,
      category: input.category,
      emoji: input.emoji || null,
      image_url: input.imageUrl || null,
      background_type: input.backgroundType || (input.imageUrl ? "image" : "emoji"),
      background_value: input.backgroundValue || input.imageUrl || null,
      is_anonymous: Boolean(input.isAnonymous),
    })
    .select("id")
    .single();

  if (error) {
    logSupabaseError("createMovement failed", error);
    throw error;
  }

  const { error: updateError } = await supabase.from("movement_updates").insert({
    movement_id: data.id,
    body: "Die Bewegung wurde gerade gestartet.",
    created_by: userId,
  });
  if (updateError) logSupabaseError("createMovement update insert failed", updateError);

  return data.id as string;
}

export async function addSupport(movementId: string, userId: string) {
  requireSupabase();
  const { error } = await supabase.from("supports").insert({ movement_id: movementId, user_id: userId });
  if (error && error.code !== "23505") {
    logSupabaseError("addSupport failed", error);
    throw error;
  }
}

export async function addDislike(movementId: string, userId: string) {
  requireSupabase();
  const { error } = await supabase.from("movement_reactions").insert({
    movement_id: movementId,
    user_id: userId,
    reaction_type: "dislike",
  });
  if (error && error.code !== "23505") {
    logSupabaseError("addDislike failed", error);
    throw error;
  }
}

export async function createMovementUpdate(movementId: string, userId: string, text: string) {
  requireSupabase();
  const { error } = await supabase.from("movement_updates").insert({
    movement_id: movementId,
    body: text,
    created_by: userId,
  });
  if (error) {
    logSupabaseError("createMovementUpdate failed", error);
    throw error;
  }
}

export async function removeSupport(movementId: string, userId: string) {
  requireSupabase();
  const { error } = await supabase.from("supports").delete().match({ movement_id: movementId, user_id: userId });
  if (error) {
    logSupabaseError("removeSupport failed", error);
    throw error;
  }
}

export async function removeDislike(movementId: string, userId: string) {
  requireSupabase();
  const { error } = await supabase.from("movement_reactions").delete().match({
    movement_id: movementId,
    user_id: userId,
    reaction_type: "dislike",
  });
  if (error) {
    logSupabaseError("removeDislike failed", error);
    throw error;
  }
}

export async function joinGroupByCode(code: string) {
  requireSupabase();
  const { data, error } = await supabase.rpc("join_group_by_code", { code: code.trim().toUpperCase() });
  if (error) {
    logSupabaseError("joinGroupByCode failed", error);
    throw error;
  }
  return data ? mapGroup(data as GroupRow) : null;
}

export async function fetchGroupMemberships(userId?: string | null): Promise<GroupMembership[]> {
  requireSupabase();
  if (!userId) return [];

  const [{ data, error }, groupAdminsResult] = await Promise.all([
    supabase
    .from("group_members")
    .select("id,group_id,user_id,role,joined_at,groups:group_id(id,name,category,scope,icon,logo_url,description,invite_code)")
    .eq("user_id", userId)
      .order("joined_at", { ascending: false }),
    supabase.from("group_admins").select("group_id").eq("user_id", userId),
  ]);

  if (error) {
    logSupabaseError("fetchGroupMemberships failed", error);
    throw error;
  }
  if (groupAdminsResult.error && !isMissingOptionalTable(groupAdminsResult.error)) {
    logSupabaseError("fetchGroupMemberships group_admins optional failure", groupAdminsResult.error);
  }

  const groupAdminIds = new Set(
    groupAdminsResult.error ? [] : ((groupAdminsResult.data ?? []) as Array<{ group_id: string }>).map((row) => row.group_id),
  );

  return ((data ?? []) as unknown as MembershipRow[])
    .map((row) => {
      const group = Array.isArray(row.groups) ? row.groups[0] : row.groups;
      if (!group) return null;
      return {
        id: row.id,
        groupId: row.group_id,
        userId: row.user_id,
        role: groupAdminIds.has(row.group_id) ? "group_admin" : row.role,
        joinedAt: row.joined_at ?? "",
        group: mapGroup(group),
      } satisfies GroupMembership;
    })
    .filter(Boolean) as GroupMembership[];
}

export async function fetchNotifications(userId?: string | null): Promise<Notification[]> {
  requireSupabase();
  if (!userId) return [];

  const [userResult, adminResult] = await Promise.all([
    supabase
      .from("notifications")
      .select("id,user_id,title,body,type,movement_id,target_type,target_id,is_read,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("admin_notifications")
      .select("id,admin_user_id,title,body,type,target_type,target_id,is_read,created_at")
      .eq("admin_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (userResult.error) {
    logSupabaseError("fetchNotifications optional failure", userResult.error);
  }
  if (adminResult.error && !isMissingOptionalTable(adminResult.error)) {
    logSupabaseError("fetchAdminNotifications optional failure", adminResult.error);
  }

  const userNotifications = userResult.error
    ? []
    : ((userResult.data ?? []) as NotificationRow[]).map((row) => ({
        id: row.id,
        title: row.title || "Benachrichtigung",
        body: row.body || "",
        type: row.type,
        movementId: row.movement_id,
        targetType: row.target_type,
        targetId: row.target_id,
        isRead: Boolean(row.is_read),
        createdAt: row.created_at ?? undefined,
      }));

  const adminNotifications = adminResult.error
    ? []
    : ((adminResult.data ?? []) as AdminNotificationRow[]).map((row) => ({
        id: row.id,
        title: row.title || "Admin-Benachrichtigung",
        body: row.body || "",
        type: row.type,
        targetType: row.target_type,
        targetId: row.target_id,
        isAdminNotification: true,
        isRead: Boolean(row.is_read),
        createdAt: row.created_at ?? undefined,
      }));

  return [...userNotifications, ...adminNotifications].sort(
    (a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
  );
}

export async function markNotificationRead(notification: Notification) {
  requireSupabase();
  const table = notification.isAdminNotification ? "admin_notifications" : "notifications";
  const { error } = await supabase.from(table).update({ is_read: true }).eq("id", notification.id);
  if (error) {
    logSupabaseError("markNotificationRead optional failure", error);
  }
}

export async function markNotificationsRead(userId?: string | null) {
  requireSupabase();
  if (!userId) return;

  const [userResult, adminResult] = await Promise.all([
    supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false),
    supabase
      .from("admin_notifications")
      .update({ is_read: true })
      .eq("admin_user_id", userId)
      .eq("is_read", false),
  ]);

  if (userResult.error) {
    logSupabaseError("markNotificationsRead optional failure", userResult.error);
  }
  if (adminResult.error && !isMissingOptionalTable(adminResult.error)) {
    logSupabaseError("markAdminNotificationsRead optional failure", adminResult.error);
  }
}

export async function savePushSubscription(userId: string, subscription: PushSubscriptionJSON) {
  requireSupabase();
  if (!subscription.endpoint) throw new Error("Push Subscription enthält keinen Endpoint.");
  const { error } = await supabase.from("user_push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: subscription.endpoint,
      subscription,
      user_agent: navigator.userAgent,
      revoked_at: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" },
  );

  if (error) {
    logSupabaseError("savePushSubscription failed", error);
    throw error;
  }
}

export async function revokePushSubscription(endpoint: string) {
  requireSupabase();
  const { error } = await supabase
    .from("user_push_subscriptions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("endpoint", endpoint);

  if (error) {
    logSupabaseError("revokePushSubscription optional failure", error);
  }
}

/*
export async function fetchNotifications(userId?: string | null): Promise<Notification[]> {
  requireSupabase();
  if (!userId) return [];

  const { data, error } = await supabase
    .from("notifications")
    .select("id,user_id,title,body,type,movement_id,is_read,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    logSupabaseError("fetchNotifications optional failure", error);
    return [];
  }

  return ((data ?? []) as NotificationRow[]).map((row) => ({
    id: row.id,
    title: row.title || "Benachrichtigung",
    body: row.body || "",
    type: row.type,
    movementId: row.movement_id,
    isRead: Boolean(row.is_read),
    createdAt: row.created_at ?? undefined,
  }));
}

export async function markNotificationsRead(userId?: string | null) {
  requireSupabase();
  if (!userId) return;

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) {
    logSupabaseError("markNotificationsRead optional failure", error);
  }
}
*/

export async function fetchSettingsBundle(userId?: string | null): Promise<SettingsBundle> {
  requireSupabase();
  if (!userId) {
    return {
      userSettings: defaultUserSettings,
      notificationPreferences: defaultNotificationPreferences,
      interests: [],
    };
  }

  const [settingsResult, notificationResult, interestsResult] = await Promise.all([
    supabase
      .from("user_settings")
      .select("user_id,theme,privacy_visibility,feed_preferences")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("notification_preferences")
      .select("user_id,new_group_posts,own_post_support,supported_updates,group_trending,implemented_projects,group_ids")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase.from("user_interests").select("category").eq("user_id", userId).order("category", { ascending: true }),
  ]);

  if (settingsResult.error && !isMissingOptionalTable(settingsResult.error)) {
    logSupabaseError("fetchSettingsBundle user_settings optional failure", settingsResult.error);
  }
  if (notificationResult.error && !isMissingOptionalTable(notificationResult.error)) {
    logSupabaseError("fetchSettingsBundle notification_preferences optional failure", notificationResult.error);
  }
  if (interestsResult.error && !isMissingOptionalTable(interestsResult.error)) {
    logSupabaseError("fetchSettingsBundle user_interests optional failure", interestsResult.error);
  }

  return {
    userSettings: settingsResult.error ? defaultUserSettings : mapUserSettings(settingsResult.data as UserSettingsRow | null),
    notificationPreferences: notificationResult.error
      ? defaultNotificationPreferences
      : mapNotificationPreferences(notificationResult.data as NotificationPreferencesRow | null),
    interests: interestsResult.error ? [] : ((interestsResult.data ?? []) as UserInterestRow[]).map((row) => row.category),
  };
}

export async function saveUserSettings(userId: string, settings: UserSettings) {
  requireSupabase();
  const { error } = await supabase.from("user_settings").upsert(
    {
      user_id: userId,
      theme: settings.theme,
      privacy_visibility: settings.privacyVisibility,
      feed_preferences: settings.feedPreferences,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) {
    logSupabaseError("saveUserSettings failed", error);
    throw error;
  }
}

export async function saveNotificationPreferences(userId: string, preferences: NotificationPreferences) {
  requireSupabase();
  const { error } = await supabase.from("notification_preferences").upsert(
    {
      user_id: userId,
      new_group_posts: preferences.newGroupPosts,
      own_post_support: preferences.ownPostSupport,
      supported_updates: preferences.supportedUpdates,
      group_trending: preferences.groupTrending,
      implemented_projects: preferences.implementedProjects,
      group_ids: preferences.groupIds,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) {
    logSupabaseError("saveNotificationPreferences failed", error);
    throw error;
  }
}

export async function saveUserInterests(userId: string, categories: string[]) {
  requireSupabase();
  const uniqueCategories = [...new Set(categories.map((category) => category.trim()).filter(Boolean))];
  const { error: deleteError } = await supabase.from("user_interests").delete().eq("user_id", userId);
  if (deleteError) {
    logSupabaseError("saveUserInterests delete failed", deleteError);
    throw deleteError;
  }
  if (!uniqueCategories.length) return;
  const { error } = await supabase.from("user_interests").insert(
    uniqueCategories.map((category) => ({
      user_id: userId,
      category,
    })),
  );
  if (error) {
    logSupabaseError("saveUserInterests insert failed", error);
    throw error;
  }
}

export async function createFeedback(userId: string, input: FeedbackInput) {
  requireSupabase();
  const { error } = await supabase.from("feedback").insert({
    user_id: userId,
    subject: input.subject,
    body: input.body,
  });
  if (error) {
    logSupabaseError("createFeedback failed", error);
    throw error;
  }
}

export async function fetchModerationSummary(userId?: string | null): Promise<ModerationSummary> {
  requireSupabase();
  if (!userId) return { blockedUsers: [], reportedContents: [], ownReports: [] };

  const [blocksResult, adminReportsResult, ownReportsResult] = await Promise.all([
    supabase
      .from("user_blocks")
      .select("id,created_at,blocked_profile:blocked_user_id(id,email,username,display_name,role)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("reports")
      .select("id,reason,created_at,movements:movement_id(title)")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("reports")
      .select("id,reason,created_at,movements:movement_id(title)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (blocksResult.error && !isMissingOptionalTable(blocksResult.error)) {
    logSupabaseError("fetchModerationSummary blocks optional failure", blocksResult.error);
  }
  if (adminReportsResult.error && !isMissingOptionalTable(adminReportsResult.error)) {
    logSupabaseError("fetchModerationSummary admin reports optional failure", adminReportsResult.error);
  }
  if (ownReportsResult.error && !isMissingOptionalTable(ownReportsResult.error)) {
    logSupabaseError("fetchModerationSummary own reports optional failure", ownReportsResult.error);
  }

  const mapReport = (row: ReportSummaryRow) => {
    const movement = Array.isArray(row.movements) ? row.movements[0] : row.movements;
    return {
      id: row.id,
      title: movement?.title ?? "Gemeldeter Inhalt",
      reason: row.reason ?? undefined,
      createdAt: row.created_at ?? undefined,
    };
  };

  return {
    blockedUsers: blocksResult.error
      ? []
      : ((blocksResult.data ?? []) as unknown as BlockRow[]).map((row) => {
          const blocked = Array.isArray(row.blocked_profile) ? row.blocked_profile[0] : row.blocked_profile;
          return {
            id: row.id,
            username: blocked?.username || blocked?.display_name || "Anonymer Nutzer",
            createdAt: row.created_at ?? undefined,
          };
        }),
    reportedContents: adminReportsResult.error ? [] : ((adminReportsResult.data ?? []) as unknown as ReportSummaryRow[]).map(mapReport),
    ownReports: ownReportsResult.error ? [] : ((ownReportsResult.data ?? []) as unknown as ReportSummaryRow[]).map(mapReport),
  };
}

export async function leaveGroup(groupId: string, userId: string) {
  requireSupabase();
  const { error } = await supabase
    .from("group_members")
    .delete()
    .match({ group_id: groupId, user_id: userId });
  if (error) {
    logSupabaseError("leaveGroup failed", error);
    throw error;
  }
}

export async function reportMovement(movementId: string, userId: string, reason: string) {
  requireSupabase();
  const { error } = await supabase.from("reports").insert({ movement_id: movementId, user_id: userId, reason });
  if (error) {
    logSupabaseError("reportMovement failed", error);
    throw error;
  }
}

function mapGroupAdmin(row: GroupAdminRow): GroupAdmin {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  return {
    id: row.id,
    groupId: row.group_id,
    userId: row.user_id,
    createdAt: row.created_at ?? undefined,
    username: profile?.username ?? "",
    displayName: profile?.display_name ?? profile?.username ?? "Nutzer",
    email: profile?.email ?? "",
    avatarUrl: profile?.avatar_url,
  };
}

export async function fetchGroupAdmins(groupIds?: string[]): Promise<GroupAdmin[]> {
  requireSupabase();
  let query = supabase
    .from("group_admins")
    .select("id,group_id,user_id,created_at,profiles:user_id(id,email,username,display_name,avatar_url,role)")
    .order("created_at", { ascending: true });

  if (groupIds?.length) query = query.in("group_id", groupIds);

  const { data, error } = await query;
  if (error) {
    if (isMissingOptionalTable(error)) return [];
    logSupabaseError("fetchGroupAdmins failed", error);
    throw error;
  }
  return ((data ?? []) as unknown as GroupAdminRow[]).map(mapGroupAdmin);
}

export async function addGroupAdmin(groupId: string, userId: string, createdBy: string) {
  requireSupabase();
  const memberInsert = await supabase.from("group_members").insert({ group_id: groupId, user_id: userId, role: "member" });
  if (memberInsert.error && memberInsert.error.code !== "23505") {
    logSupabaseError("addGroupAdmin member insert failed", memberInsert.error);
    throw memberInsert.error;
  }
  const { error } = await supabase.from("group_admins").insert({ group_id: groupId, user_id: userId, created_by: createdBy });
  if (error && error.code !== "23505") {
    logSupabaseError("addGroupAdmin failed", error);
    throw error;
  }
}

export async function removeGroupAdmin(groupId: string, userId: string) {
  requireSupabase();
  const { error } = await supabase.from("group_admins").delete().match({ group_id: groupId, user_id: userId });
  if (error) {
    logSupabaseError("removeGroupAdmin failed", error);
    throw error;
  }
}

export async function removeGroupMember(groupId: string, userId: string) {
  requireSupabase();
  const { error } = await supabase.from("group_members").delete().match({ group_id: groupId, user_id: userId });
  if (error) {
    logSupabaseError("removeGroupMember failed", error);
    throw error;
  }
}

export async function createGroup(input: AdminGroupInput & { scope?: Scope; createdBy: string }) {
  requireSupabase();
  const inviteCode = input.inviteCode.trim().toUpperCase();
  const { data, error } = await supabase.from("groups").insert({
    name: input.name.trim(),
    category: input.category,
    scope: input.scope ?? "internal",
    icon: input.icon || input.name.slice(0, 2).toUpperCase(),
    logo_url: input.logoUrl || null,
    description: input.description || null,
    invite_code: inviteCode,
    created_by: input.createdBy,
  }).select("id").single();
  if (error) {
    logSupabaseError("createGroup failed", error);
    throw error;
  }
  return data.id as string;
}

export async function updateGroup(input: AdminGroupInput) {
  requireSupabase();
  if (!input.id) throw new Error("Gruppe fehlt.");
  const { error } = await supabase
    .from("groups")
    .update({
      name: input.name.trim(),
      category: input.category.trim() || "Intern",
      icon: input.icon || input.name.slice(0, 2).toUpperCase(),
      logo_url: input.logoUrl || null,
      description: input.description || null,
      invite_code: input.inviteCode.trim().toUpperCase(),
    })
    .eq("id", input.id);
  if (error) {
    logSupabaseError("updateGroup failed", error);
    throw error;
  }
}

export async function deleteGroup(groupId: string) {
  requireSupabase();
  const { error } = await supabase.from("groups").delete().eq("id", groupId);
  if (error) {
    logSupabaseError("deleteGroup failed", error);
    throw error;
  }
}

export async function uploadGroupLogo(userId: string, file: File) {
  requireSupabase();
  if (!file.type.startsWith("image/")) throw new Error("Bitte wähle eine Bilddatei.");
  const extension = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `${userId}/group-${Date.now()}.${extension}`;
  const { error } = await supabase.storage.from("movement-media").upload(path, file, {
    cacheControl: "31536000",
    upsert: true,
    contentType: file.type,
  });
  if (error) {
    logSupabaseError("uploadGroupLogo failed", error);
    throw error;
  }
  const { data } = supabase.storage.from("movement-media").getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteMovement(movementId: string) {
  requireSupabase();
  const { error } = await supabase.from("movements").delete().eq("id", movementId);
  if (error) {
    logSupabaseError("deleteMovement failed", error);
    throw error;
  }
}

export async function updateMovement(input: UpdateMovementInput, userId: string) {
  requireSupabase();
  const payload: Record<string, string | null> = {
    title: input.title,
    description: input.description,
    category: input.category,
    type: input.type,
    emoji: input.emoji || null,
  };

  if (input.removeImage) payload.image_url = null;
  if (typeof input.imageUrl !== "undefined") payload.image_url = input.imageUrl;
  if (typeof input.backgroundType !== "undefined") payload.background_type = input.backgroundType;
  if (typeof input.backgroundValue !== "undefined") payload.background_value = input.backgroundValue;

  const { error } = await supabase
    .from("movements")
    .update(payload)
    .eq("id", input.id);

  if (error) {
    logSupabaseError("updateMovement failed", error);
    throw error;
  }
}

export async function updateMovementStatus(movementId: string, userId: string, status: MovementStatus, text?: string) {
  requireSupabase();
  const { error } = await supabase.from("movements").update({ status }).eq("id", movementId);
  if (error) {
    logSupabaseError("updateMovementStatus failed", error);
    throw error;
  }
  const statusLabel = {
    submitted: "Eingereicht",
    trending: "Trendet",
    review: "In Prüfung",
    implementation: "In Umsetzung",
    done: "Fertig",
  }[status];
  const body = [text?.trim(), `Status geändert zu: ${statusLabel}`].filter(Boolean).join("\n\n");
  const insert = await supabase.from("movement_updates").insert({
    movement_id: movementId,
    body,
    status,
    created_by: userId,
  });
  if (insert.error) {
    const fallback = await supabase.from("movement_updates").insert({
      movement_id: movementId,
      body,
      created_by: userId,
    });
    if (fallback.error) {
      logSupabaseError("updateMovementStatus update insert failed", fallback.error);
      throw fallback.error;
    }
  }
}

export async function searchUsers(query: string): Promise<AdminUserResult[]> {
  requireSupabase();
  const normalized = query.trim();
  if (!normalized) return [];
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,username,display_name,avatar_url,role")
    .or(`email.ilike.%${normalized}%,username.ilike.%${normalized}%`)
    .limit(12);
  if (error) {
    logSupabaseError("searchUsers failed", error);
    throw error;
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    email: row.email ?? "",
    username: row.username ?? "",
    displayName: row.display_name ?? row.username ?? "",
    role: (row.role ?? "user") as UserRole,
    avatarUrl: row.avatar_url,
  }));
}

export async function searchGroupAdminCandidates(query: string, groupId: string): Promise<AdminUserResult[]> {
  requireSupabase();
  const normalized = query.trim();
  if (!normalized) return [];
  const { data, error } = await supabase.rpc("search_group_admin_candidates", {
    query_text: normalized,
    target_group_id: groupId,
  });
  if (error) {
    logSupabaseError("searchGroupAdminCandidates failed", error);
    throw error;
  }
  return ((data ?? []) as Array<{
    id: string;
    email: string | null;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
    role: UserRole | null;
  }>).map((row) => ({
    id: row.id,
    email: row.email ?? "",
    username: row.username ?? "",
    displayName: row.display_name ?? row.username ?? "",
    role: (row.role ?? "user") as UserRole,
    avatarUrl: row.avatar_url,
  }));
}

export async function updateProfileSettings(input: {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  hasSeenConductNotice?: boolean;
}) {
  requireSupabase();
  const payload: Record<string, string | boolean | null | undefined> = {
    username: input.username,
    display_name: input.displayName,
  };
  if (typeof input.avatarUrl !== "undefined") {
    payload.avatar_url = input.avatarUrl;
  }
  if (typeof input.hasSeenConductNotice === "boolean") {
    payload.has_seen_conduct_notice = input.hasSeenConductNotice;
  }
  const { error } = await supabase.from("profiles").update(payload).eq("id", input.id);
  if (error) {
    logSupabaseError("updateProfileSettings failed", error);
    throw error;
  }
}

export async function uploadProfileAvatar(userId: string, file: Blob, extension: "avif" | "webp") {
  requireSupabase();
  const path = `${userId}/avatar-${Date.now()}.${extension}`;
  const { error } = await supabase.storage.from("movement-media").upload(path, file, {
    cacheControl: "31536000",
    upsert: true,
    contentType: `image/${extension}`,
  });
  if (error) {
    logSupabaseError("uploadProfileAvatar failed", error);
    throw error;
  }
  const { data } = supabase.storage.from("movement-media").getPublicUrl(path);
  return data.publicUrl;
}

export async function markConductNoticeSeen(userId: string) {
  requireSupabase();
  const { error } = await supabase
    .from("profiles")
    .update({ has_seen_conduct_notice: true })
    .eq("id", userId);
  if (error) {
    logSupabaseError("markConductNoticeSeen failed", error);
    throw error;
  }
}

export async function requestAccountDeletion(userId: string) {
  requireSupabase();
  const { error } = await supabase
    .from("profiles")
    .update({
      deletion_requested_at: new Date().toISOString(),
      display_name: "Citrus Nutzer",
      avatar_url: null,
    })
    .eq("id", userId);
  if (error) {
    logSupabaseError("requestAccountDeletion failed", error);
    throw error;
  }
}

export async function anonymizeUserProfile(userId: string) {
  requireSupabase();
  const shortId = userId.replace(/-/g, "").slice(0, 8);
  const { error } = await supabase
    .from("profiles")
    .update({
      status: "banned",
      is_banned: true,
      deleted_at: new Date().toISOString(),
      username: `deleted_user_${shortId}`,
      display_name: "Geloeschter Nutzer",
      avatar_url: null,
    })
    .eq("id", userId);
  if (error) {
    logSupabaseError("anonymizeUserProfile failed", error);
    throw error;
  }
}

export async function banUserProfile(userId: string) {
  requireSupabase();
  const { error } = await supabase
    .from("profiles")
    .update({
      status: "banned",
      is_banned: true,
      deleted_at: new Date().toISOString(),
      display_name: "Geloeschter Nutzer",
      avatar_url: null,
    })
    .eq("id", userId);
  if (error) {
    logSupabaseError("banUserProfile failed", error);
    throw error;
  }
}

export async function deleteUserMovements(userId: string) {
  requireSupabase();
  const { error } = await supabase.from("movements").delete().eq("user_id", userId);
  if (error) {
    logSupabaseError("deleteUserMovements failed", error);
    throw error;
  }
}

export async function uploadMovementMedia(userId: string, file: Blob, extension: "avif" | "webp") {
  requireSupabase();
  const path = `${userId}/${Date.now()}.${extension}`;
  const { error } = await supabase.storage.from("movement-media").upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
    contentType: `image/${extension}`,
  });
  if (error) {
    logSupabaseError("uploadMovementMedia failed", error);
    throw error;
  }
  const { data } = supabase.storage.from("movement-media").getPublicUrl(path);
  return data.publicUrl;
}

export async function fetchNotificationDetail(notification: Notification): Promise<NotificationDetail> {
  requireSupabase();
  let movement: Movement | undefined;
  let content = notification.body;
  let actorName: string | undefined;
  let actorEmail: string | undefined;
  let groupName: string | undefined;
  const adminActions: string[] = [];

  const movementId =
    notification.movementId ||
    (notification.targetType === "movement" ? notification.targetId ?? undefined : undefined);

  if (movementId) {
    const movements = await fetchMovements();
    movement = movements.find((item) => item.id === movementId);
    groupName = movement?.groupName;
  }

  if (notification.isAdminNotification && notification.targetType === "report" && notification.targetId) {
    const { data } = await supabase
      .from("reports")
      .select("id,reason,created_at,user_id,movements:movement_id(id,title,description,group_id,user_id,groups:group_id(name),profiles:user_id(email,username,display_name))")
      .eq("id", notification.targetId)
      .maybeSingle();
    const report = data as any;
    content = report?.reason || content;
    const reportUser = report?.movements?.profiles;
    actorName = reportUser?.display_name || reportUser?.username;
    actorEmail = reportUser?.email;
    groupName = report?.movements?.groups?.name;
    adminActions.push("Beitrag öffnen", "Beitrag löschen", "Status ändern");
  } else if (notification.isAdminNotification && notification.targetType === "feedback" && notification.targetId) {
    const { data } = await supabase
      .from("feedback")
      .select("id,subject,body,created_at,user_id,profiles:user_id(email,username,display_name)")
      .eq("id", notification.targetId)
      .maybeSingle();
    const feedback = data as any;
    content = [feedback?.subject, feedback?.body].filter(Boolean).join("\n\n") || content;
    actorName = feedback?.profiles?.display_name || feedback?.profiles?.username;
    actorEmail = feedback?.profiles?.email;
    adminActions.push("Feedback prüfen");
  } else if (movement) {
    content = movement.description || content;
    actorName = movement.authorDisplayName || movement.authorUsername || undefined;
    groupName = movement.groupName;
    adminActions.push("Beitrag öffnen");
    if (notification.isAdminNotification) adminActions.push("Beitrag löschen", "Status ändern");
  }

  const typeLabel = notification.isAdminNotification
    ? `Admin: ${notification.type || notification.targetType || "Hinweis"}`
    : notification.type || notification.targetType || "Benachrichtigung";

  return {
    notification,
    movement,
    typeLabel,
    content,
    actorName,
    actorEmail,
    groupName,
    createdAt: notification.createdAt,
    adminActions,
  };
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
  const weeklyReach = relevantMovements.reduce(
    (totals, movement) =>
      totals.map((value, index) => value + (movement.activityHistory?.[index] ?? 0)),
    Array.from({ length: 7 }, () => 0),
  );

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
    weeklyReach,
  };
}
