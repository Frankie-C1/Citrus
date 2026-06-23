export type Scope = "internal" | "external";

export type MovementStatus =
  | "submitted"
  | "trending"
  | "review"
  | "implementation"
  | "done";

export type MovementType = "problem" | "idea" | "improvement" | "question";

export type Profile = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
  createdAt?: string;
};

export type User = {
  id: string;
  name: string;
  email?: string;
  avatarInitials: string;
  influence: number;
  groupIds: string[];
};

export type Group = {
  id: string;
  name: string;
  scope: Scope;
  category: string;
  members: number;
  accent: string;
  icon?: string | null;
  description?: string | null;
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
  groupId: string;
  groupName: string;
  scope: Scope;
  type: MovementType;
  supporters: number;
  weeklyGrowth: number;
  status: MovementStatus;
  category: string;
  updates: Update[];
  supportedByUser: boolean;
  userId?: string | null;
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

export type Tab = "home" | "feed" | "insights" | "profile";

export type Toast = {
  id: number;
  message: string;
};
