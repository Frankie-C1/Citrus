export type Scope = "internal" | "external";

export type MovementStatus =
  | "submitted"
  | "trending"
  | "review"
  | "implementation"
  | "done";

export type MovementType = "problem" | "idea" | "improvement" | "question";
export type BackgroundType = "image" | "color" | "gradient" | "emoji";

export type UserRole = "user" | "admin";

export type Profile = {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  role: UserRole;
  hasSeenConductNotice: boolean;
  deletionRequestedAt?: string | null;
  deletedAt?: string | null;
  createdAt?: string;
};

export type User = {
  id: string;
  name: string;
  username?: string;
  email?: string;
  avatarInitials: string;
  influence: number;
  groupIds: string[];
  role?: UserRole;
};

export type Group = {
  id: string;
  name: string;
  scope: Scope;
  category: string;
  members: number;
  accent: string;
  icon?: string | null;
  logoUrl?: string | null;
  description?: string | null;
  inviteCode?: string | null;
};

export type GroupMembership = {
  id: string;
  groupId: string;
  userId: string;
  role: "member" | "admin";
  joinedAt: string;
  group: Group;
};

export type Update = {
  id: string;
  text: string;
  createdAt: string;
};

export type Movement = {
  id: string;
  title: string;
  description: string;
  emoji: string;
  imageUrl?: string | null;
  backgroundType?: BackgroundType | null;
  backgroundValue?: string | null;
  groupId: string;
  groupName: string;
  groupIcon?: string | null;
  scope: Scope;
  type: MovementType;
  supporters: number;
  weeklyGrowth: number;
  status: MovementStatus;
  category: string;
  updates: Update[];
  supportedByUser: boolean;
  userSupportCreatedAt?: string;
  userId?: string | null;
  authorUsername?: string | null;
  authorDisplayName?: string | null;
  authorAvatarUrl?: string | null;
  authorRole?: UserRole | null;
  isAnonymous?: boolean;
  commentCount?: number;
  supporterPreviews?: Array<{
    id: string;
    name: string;
    avatarUrl?: string | null;
  }>;
  reportCount?: number;
  createdAt?: string;
  recentSupporters?: number;
  recentUpdates?: number;
  trendingScore?: number;
  supportHistory?: number[];
  activityHistory?: number[];
};

export type Notification = {
  id: string;
  title: string;
  body: string;
  type?: string | null;
  movementId?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  isAdminNotification?: boolean;
  isRead: boolean;
  createdAt?: string;
};

export type CreateMovementInput = {
  title: string;
  description: string;
  groupId: string;
  groupName: string;
  scope: Scope;
  type: MovementType;
  category: string;
  emoji?: string;
  imageUrl?: string;
  imageFile?: File;
  backgroundType?: BackgroundType;
  backgroundValue?: string;
  isAnonymous?: boolean;
};

export type UpdateMovementInput = {
  id: string;
  title: string;
  description: string;
  category: string;
  type: MovementType;
  emoji?: string;
  imageUrl?: string | null;
  backgroundType?: BackgroundType | null;
  backgroundValue?: string | null;
  removeImage?: boolean;
  imageFile?: File;
};

export type UserStats = {
  reached: number;
  supportedTopics: number;
  ownMovements: number;
  implementedIdeas: number;
  topCategory: string;
  activeGroups: number;
  comments: number;
  risingTopics: number;
  weeklyReach: number[];
};

export type AdminUserResult = {
  id: string;
  email: string;
  username: string;
  displayName: string;
  role: UserRole;
};

export type Tab = "home" | "feed" | "insights" | "profile";

export type Toast = {
  id: number;
  message: string;
};

export type NotificationFrequency = "off" | "daily" | "instant";

export type ThemePreference = "light" | "dark" | "system";

export type PrivacyVisibility = "visible" | "anonymous";

export type FeedPreferences = {
  prioritizeForYou: boolean;
  onlyGroups: boolean;
  highlightSupported: boolean;
  boostTrending: boolean;
  newestFirst: boolean;
};

export type UserSettings = {
  theme: ThemePreference;
  privacyVisibility: PrivacyVisibility;
  feedPreferences: FeedPreferences;
};

export type NotificationPreferences = {
  newGroupPosts: NotificationFrequency;
  ownPostSupport: NotificationFrequency;
  supportedUpdates: NotificationFrequency;
  groupTrending: NotificationFrequency;
  implementedProjects: NotificationFrequency;
  groupIds: string[];
};

export type SettingsBundle = {
  userSettings: UserSettings;
  notificationPreferences: NotificationPreferences;
  interests: string[];
};

export type FeedbackInput = {
  subject: string;
  body: string;
};

export type ModerationSummary = {
  blockedUsers: Array<{ id: string; username: string; createdAt?: string }>;
  reportedContents: Array<{ id: string; title: string; reason?: string; createdAt?: string }>;
  ownReports: Array<{ id: string; title: string; reason?: string; createdAt?: string }>;
};
