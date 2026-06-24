import { isSupabaseConfigured, supabase, getSupabaseConfigError } from "../lib/supabase";
import type {
  AdminUserResult,
  CreateMovementInput,
  FeedbackInput,
  FeedPreferences,
  Group,
  GroupMembership,
  ModerationSummary,
  Movement,
  MovementStatus,
  MovementType,
  Notification,
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

type UpdateRow = {
  id: string;
  movement_id: string;
  body: string;
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
  return scope === "external" ? "#22C55E" : "#111111";
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
    .order("scope", { ascending: true })
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
    .select("id,title,description,type,status,group_id,user_id,scope,emoji,image_url,category,report_count,created_at")
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

  const [groupsResult, supportsResult, updatesResult, profilesResult] = await Promise.all([
    groupIds.length
      ? supabase.from("groups").select("id,name,category,scope,icon,logo_url,description,invite_code").in("id", groupIds)
      : Promise.resolve({ data: [], error: null }),
    supabase.from("supports").select("id,movement_id,user_id,created_at").in("movement_id", movementIds),
    supabase.from("movement_updates").select("id,movement_id,body,created_at").in("movement_id", movementIds),
    authorIds.length && userId
      ? supabase.from("profiles").select("id,email,username,display_name,role").in("id", authorIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (groupsResult.error) logSupabaseError("fetchMovements groups partial failure", groupsResult.error);
  if (supportsResult.error) logSupabaseError("fetchMovements supports partial failure", supportsResult.error);
  if (updatesResult.error) logSupabaseError("fetchMovements updates partial failure", updatesResult.error);
  if (profilesResult.error) logSupabaseError("fetchMovements profiles partial failure", profilesResult.error);

  const groupsById = new Map(((groupsResult.data ?? []) as GroupRow[]).map((group) => [group.id, group]));
  const profilesById = new Map(((profilesResult.data ?? []) as ProfileLiteRow[]).map((profile) => [profile.id, profile]));
  const supportsByMovement = new Map<string, SupportRow[]>();
  const updatesByMovement = new Map<string, UpdateRow[]>();

  for (const support of ((supportsResult.data ?? []) as SupportRow[])) {
    supportsByMovement.set(support.movement_id, [...(supportsByMovement.get(support.movement_id) ?? []), support]);
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
    const updates = updatesByMovement.get(movement.id) ?? [];
    const author = movement.user_id ? profilesById.get(movement.user_id) : undefined;
    const category = movement.category || group?.category || "Allgemein";
    const userSupport = userId ? supports.find((support) => support.user_id === userId) : undefined;
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
      groupId: movement.group_id ?? "",
      groupName: group?.name ?? "Öffentlich",
      groupIcon: group?.icon,
      scope: movement.scope ?? group?.scope ?? "external",
      type: movement.type,
      supporters: supports.length,
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
      userSupportCreatedAt: userSupport?.created_at ?? undefined,
      userId: movement.user_id,
      authorUsername: author?.username,
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

export async function removeSupport(movementId: string, userId: string) {
  requireSupabase();
  const { error } = await supabase.from("supports").delete().match({ movement_id: movementId, user_id: userId });
  if (error) {
    logSupabaseError("removeSupport failed", error);
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

  const { data, error } = await supabase
    .from("group_members")
    .select("id,group_id,user_id,role,joined_at,groups:group_id(id,name,category,scope,icon,logo_url,description,invite_code)")
    .eq("user_id", userId)
    .order("joined_at", { ascending: false });

  if (error) {
    logSupabaseError("fetchGroupMemberships failed", error);
    throw error;
  }

  return ((data ?? []) as unknown as MembershipRow[])
    .map((row) => {
      const group = Array.isArray(row.groups) ? row.groups[0] : row.groups;
      if (!group) return null;
      return {
        id: row.id,
        groupId: row.group_id,
        userId: row.user_id,
        role: row.role,
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

export async function createGroup(input: {
  name: string;
  category: string;
  scope: Scope;
  icon?: string;
  logoUrl?: string;
  description?: string;
  inviteCode?: string;
  createdBy: string;
}) {
  requireSupabase();
  const { error } = await supabase.from("groups").insert({
    name: input.name,
    category: input.category,
    scope: input.scope,
    icon: input.icon || input.name.slice(0, 2).toUpperCase(),
    logo_url: input.logoUrl || null,
    description: input.description || null,
    invite_code: input.scope === "internal" ? input.inviteCode?.toUpperCase() : null,
    created_by: input.createdBy,
  });
  if (error) {
    logSupabaseError("createGroup failed", error);
    throw error;
  }
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

  const { error } = await supabase
    .from("movements")
    .update(payload)
    .eq("id", input.id)
    .eq("user_id", userId);

  if (error) {
    logSupabaseError("updateMovement failed", error);
    throw error;
  }
}

export async function searchUsers(query: string): Promise<AdminUserResult[]> {
  requireSupabase();
  const normalized = query.trim();
  if (!normalized) return [];
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,username,display_name,role")
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
  }));
}

export async function updateProfileSettings(input: {
  id: string;
  username: string;
  displayName: string;
  hasSeenConductNotice?: boolean;
}) {
  requireSupabase();
  const payload: Record<string, string | boolean | undefined> = {
    username: input.username,
    display_name: input.displayName,
  };
  if (typeof input.hasSeenConductNotice === "boolean") {
    payload.has_seen_conduct_notice = input.hasSeenConductNotice;
  }
  const { error } = await supabase.from("profiles").update(payload).eq("id", input.id);
  if (error) {
    logSupabaseError("updateProfileSettings failed", error);
    throw error;
  }
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
