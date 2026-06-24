import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "./auth/AuthProvider";
import { AppShell } from "./components/AppShell";
import { AuthModal } from "./components/AuthModal";
import { BottomSheet } from "./components/BottomSheet";
import { ConductNotice } from "./components/ConductNotice";
import { ReportModal } from "./components/ReportModal";
import { SearchSheet } from "./components/SearchSheet";
import { Toast } from "./components/Toast";
import {
  addSupport,
  createMovement,
  createMovementUpdate,
  deleteMovement,
  deriveStats,
  fetchGroupMemberships,
  fetchGroups,
  fetchMovements,
  fetchNotifications,
  fetchSettingsBundle,
  joinGroupByCode,
  leaveGroup,
  markConductNoticeSeen,
  markNotificationRead,
  markNotificationsRead,
  removeSupport,
  reportMovement as saveReport,
  updateMovement,
  uploadMovementMedia,
} from "./data/queries";
import { getSupabaseConfigError } from "./lib/supabase";
import { isSupabaseConfigured } from "./lib/supabase";
import { Feed } from "./screens/Feed";
import { FirstRunFlow } from "./screens/FirstRunFlow";
import { Groups } from "./screens/Groups";
import { Home } from "./screens/Home";
import { Insights } from "./screens/Insights";
import { MovementDetail } from "./screens/MovementDetail";
import { Notifications } from "./screens/Notifications";
import { Onboarding } from "./screens/Onboarding";
import { Profile } from "./screens/Profile";
import type {
  CreateMovementInput,
  Group,
  GroupMembership,
  Movement,
  Notification,
  Scope,
  Tab,
  Toast as ToastType,
  UpdateMovementInput,
  User,
  UserSettings,
} from "./types";

const STORAGE_KEYS = {
  onboarded: "citrus:onboarded",
  firstRun: "citrus:first-run",
};

const defaultUserSettings: UserSettings = {
  theme: "system",
  privacyVisibility: "visible",
  feedPreferences: {
    prioritizeForYou: true,
    onlyGroups: false,
    highlightSupported: true,
    boostTrending: true,
    newestFirst: false,
  },
};

type PendingAction =
  | { type: "create"; input: CreateMovementInput }
  | { type: "support"; movementId: string }
  | { type: "join"; code: string }
  | { type: "report"; movementId: string; reason: string };

function initialsFromName(name: string) {
  return (
    name
      .split(/[ ._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "C"
  );
}

function fallbackUser(): User {
  return {
    id: "guest",
    name: "Gast",
    avatarInitials: "C",
    influence: 0,
    groupIds: [],
  };
}

async function compressImage(file: File): Promise<{ blob: Blob; extension: "avif" | "webp" }> {
  if (!file.type.startsWith("image/")) throw new Error("Bitte wähle eine Bilddatei.");

  const bitmap = await createImageBitmap(file);
  const maxWidth = 1440;
  const maxHeight = 2560;
  const scale = Math.min(1, maxWidth / bitmap.width, maxHeight / bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Bild konnte nicht verarbeitet werden.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  const toBlob = (type: string, quality: number) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob((blob) => resolve(blob), type, quality));

  const avif = await toBlob("image/avif", 0.45);
  if (avif) return { blob: avif, extension: "avif" };
  const webp = await toBlob("image/webp", 0.64);
  if (webp) return { blob: webp, extension: "webp" };
  throw new Error("Dieser Browser kann das Bild nicht als AVIF oder WebP komprimieren.");
}

function App() {
  const { authUser, profile, signOut, refreshProfile } = useAuth();
  const [onboarded, setOnboarded] = useState(() => localStorage.getItem(STORAGE_KEYS.onboarded) === "true");
  const [firstRunCompleted, setFirstRunCompleted] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [scopeFilter, setScopeFilter] = useState<Scope | "all">("all");
  const [search, setSearch] = useState("");
  const [groupFilterId, setGroupFilterId] = useState<string | undefined>();
  const [detailMovementId, setDetailMovementId] = useState<string | undefined>();
  const [groupsViewOpen, setGroupsViewOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | undefined>();
  const [reportTarget, setReportTarget] = useState<Movement | undefined>();
  const [toast, setToast] = useState<ToastType | undefined>();
  const [groups, setGroups] = useState<Group[]>([]);
  const [memberships, setMemberships] = useState<GroupMembership[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [userSettings, setUserSettings] = useState<UserSettings>(defaultUserSettings);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState(getSupabaseConfigError());

  const currentUserId = authUser?.id ?? null;

  useEffect(() => {
    if (!authUser) {
      setFirstRunCompleted(true);
      return;
    }
    setFirstRunCompleted(localStorage.getItem(`${STORAGE_KEYS.firstRun}:${authUser.id}`) === "true");
  }, [authUser]);

  const loadData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [nextGroups, nextMovements, nextMemberships] = await Promise.all([
        fetchGroups(),
        fetchMovements(currentUserId),
        fetchGroupMemberships(currentUserId),
      ]);
      const nextNotifications = currentUserId ? await fetchNotifications(currentUserId) : [];
      const settingsBundle = currentUserId ? await fetchSettingsBundle(currentUserId) : undefined;
      if (settingsBundle) {
        setUserSettings(settingsBundle.userSettings);
        document.documentElement.dataset.theme = settingsBundle.userSettings.theme;
        localStorage.setItem("citrus:theme", settingsBundle.userSettings.theme);
      }
      setGroups(nextGroups);
      setMovements(nextMovements);
      setMemberships(nextMemberships);
      setNotifications(nextNotifications);
      setDataError(getSupabaseConfigError());
    } catch (error) {
      setDataError(getSupabaseConfigError());
      showToast(error instanceof Error ? error.message : "Supabase-Anfrage fehlgeschlagen.");
    } finally {
      setLoadingData(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    if (sheetOpen || searchOpen) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [sheetOpen, searchOpen]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    console.info("[Citrus Debug]", {
      supabaseUrlPresent: Boolean(import.meta.env.VITE_SUPABASE_URL),
      supabaseAnonKeyPresent: Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY),
      supabaseConfigured: isSupabaseConfigured,
      sessionPresent: Boolean(authUser),
      userId: authUser?.id ?? null,
      profileLoaded: Boolean(profile),
      groups: groups.length,
      memberships: memberships.length,
      movements: movements.length,
      lastSupabaseError: dataError || null,
    });
  }, [authUser, dataError, groups.length, memberships.length, movements.length, profile]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const notificationMovementId = params.get("movementId");
    if (notificationMovementId && movements.some((movement) => movement.id === notificationMovementId)) {
      setDetailMovementId(notificationMovementId);
      setNotificationsOpen(false);
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }
    if (params.get("notifications") === "1") {
      setNotificationsOpen(true);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [movements]);

  const stats = useMemo(() => deriveStats(movements, currentUserId), [currentUserId, movements]);
  const visibleMovements = useMemo(
    () =>
      movements.map((movement) =>
        userSettings.privacyVisibility === "anonymous" && movement.userId === currentUserId
          ? { ...movement, authorUsername: "Anonym" }
          : movement,
      ),
    [currentUserId, movements, userSettings.privacyVisibility],
  );
  const userGroups = useMemo(() => {
    const groupIds = new Set(
      movements
        .filter((movement) => movement.userId === currentUserId || movement.supportedByUser)
        .map((movement) => movement.groupId),
    );
    const membershipGroupIds = new Set(memberships.map((membership) => membership.groupId));
    return groups.filter((group) => membershipGroupIds.has(group.id) || groupIds.has(group.id));
  }, [currentUserId, groups, memberships, movements]);

  const user = useMemo<User>(() => {
    if (!authUser) return fallbackUser();
    const name = profile?.displayName || profile?.username || authUser.email?.split("@")[0] || "Citrus";
    return {
      id: authUser.id,
      name,
      username: profile?.username,
      email: authUser.email,
      avatarInitials: initialsFromName(name),
      influence: stats.reached,
      groupIds: userGroups.map((group) => group.id),
      role: profile?.role ?? "user",
    };
  }, [authUser, profile, stats.reached, userGroups]);

  const selectedMovement = detailMovementId
    ? visibleMovements.find((movement) => movement.id === detailMovementId)
    : undefined;

  const filteredMovements = useMemo(() => {
    const query = search.trim().toLowerCase();
    const membershipGroupIds = new Set(memberships.map((membership) => membership.groupId));
    const deduped = [...new Map(visibleMovements.map((movement) => [movement.id, movement])).values()];
    const filtered = deduped
      .filter((movement) => Boolean(movement.imageUrl))
      .filter((movement) => {
        if (scopeFilter === "internal") return membershipGroupIds.has(movement.groupId);
        if (scopeFilter === "external") {
          return movement.scope === "external" && !membershipGroupIds.has(movement.groupId);
        }
        return movement.scope === "external" || membershipGroupIds.has(movement.groupId);
      })
      .filter((movement) => (groupFilterId ? movement.groupId === groupFilterId : true))
      .filter((movement) => (userSettings.feedPreferences.onlyGroups ? membershipGroupIds.has(movement.groupId) : true))
      .filter((movement) => {
        if (!query) return true;
        return [movement.title, movement.description, movement.groupName, movement.category, movement.authorUsername]
          .join(" ")
          .toLowerCase()
          .includes(query);
      })
      .sort((a, b) => {
        if (userSettings.feedPreferences.newestFirst) {
          return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
        }
        const supportBoost = userSettings.feedPreferences.highlightSupported
          ? Number(b.supportedByUser) * 30 - Number(a.supportedByUser) * 30
          : 0;
        const trendingScore = userSettings.feedPreferences.boostTrending
          ? (b.trendingScore ?? 0) - (a.trendingScore ?? 0)
          : b.weeklyGrowth + b.supporters - (a.weeklyGrowth + a.supporters);
        return supportBoost + trendingScore;
      });

    if (userSettings.feedPreferences.newestFirst) return filtered;
    const high = filtered.filter((_, index) => index % 4 !== 3);
    const lower = filtered.filter((_, index) => index % 4 === 3).reverse();
    return high.flatMap((movement, index) => (index > 0 && index % 3 === 0 && lower.length ? [lower.shift()!, movement] : [movement]));
  }, [groupFilterId, memberships, scopeFilter, search, userSettings.feedPreferences, visibleMovements]);

  function showToast(message: string) {
    const nextToast = { id: Date.now(), message };
    setToast(nextToast);
    window.setTimeout(() => {
      setToast((current) => (current?.id === nextToast.id ? undefined : current));
    }, 2800);
  }

  function completeOnboarding() {
    localStorage.setItem(STORAGE_KEYS.onboarded, "true");
    setOnboarded(true);
    setActiveTab("home");
  }

  function completeFirstRun(userId: string) {
    localStorage.setItem(`${STORAGE_KEYS.firstRun}:${userId}`, "true");
    setFirstRunCompleted(true);
    completeOnboarding();
  }

  async function saveMovement(input: CreateMovementInput, userId: string) {
    if (!input.imageFile) throw new Error("Bitte füge ein Bild hinzu.");

    let imageUrl = input.imageUrl;
    if (input.imageFile) {
      const compressed = await compressImage(input.imageFile);
      imageUrl = await uploadMovementMedia(userId, compressed.blob, compressed.extension);
    }

    const newMovementId = await createMovement({ ...input, imageUrl }, userId);
    await loadData();
    setScopeFilter("all");
    setSearch("");
    setGroupFilterId(undefined);
    setActiveTab("feed");
    setDetailMovementId(newMovementId);
    showToast("Bewegung gespeichert.");
  }

  async function handleCreateMovement(input: CreateMovementInput) {
    if (!authUser) {
      setPendingAction({ type: "create", input });
      setAuthOpen(true);
      return;
    }

    try {
      await saveMovement(input, authUser.id);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Bewegung konnte nicht gespeichert werden.");
    }
  }

  async function handleUpdateMovement(input: UpdateMovementInput) {
    if (!authUser) {
      setAuthOpen(true);
      return;
    }

    try {
      let imageUrl = input.imageUrl;
      if (input.imageFile) {
        const compressed = await compressImage(input.imageFile);
        imageUrl = await uploadMovementMedia(authUser.id, compressed.blob, compressed.extension);
      }
      await updateMovement({ ...input, imageUrl }, authUser.id);
      await loadData();
      showToast("Beitrag aktualisiert.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Beitrag konnte nicht gespeichert werden.");
    }
  }

  async function handleDeleteOwnMovement(id: string) {
    if (!authUser) {
      setAuthOpen(true);
      return;
    }

    try {
      await deleteMovement(id);
      if (detailMovementId === id) setDetailMovementId(undefined);
      await loadData();
      showToast("Beitrag gelöscht.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Beitrag konnte nicht gelöscht werden.");
    }
  }

  async function handlePostMovementUpdate(id: string, text: string) {
    if (!authUser) {
      setAuthOpen(true);
      return;
    }
    try {
      await createMovementUpdate(id, authUser.id, text);
      await loadData();
      showToast("Update gepostet.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Update konnte nicht gespeichert werden.");
    }
  }

  async function handleToggleSupport(id: string) {
    if (!authUser) {
      setPendingAction({ type: "support", movementId: id });
      setAuthOpen(true);
      return;
    }

    const target = movements.find((movement) => movement.id === id);
    if (!target) return;

    setMovements((current) =>
      current.map((movement) =>
        movement.id === id
          ? {
              ...movement,
              supportedByUser: !movement.supportedByUser,
              supporters: movement.supporters + (movement.supportedByUser ? -1 : 1),
              weeklyGrowth: Math.max(0, movement.weeklyGrowth + (movement.supportedByUser ? -1 : 1)),
            }
          : movement,
      ),
    );

    try {
      if (target.supportedByUser) {
        await removeSupport(id, authUser.id);
      } else {
        await addSupport(id, authUser.id);
      }
    } catch (error) {
      await loadData();
      showToast(error instanceof Error ? error.message : "Unterstützung konnte nicht gespeichert werden.");
    }
  }

  async function handleJoinCode(code: string) {
    if (code.trim().length !== 5) return;
    if (!authUser) {
      setPendingAction({ type: "join", code });
      setAuthOpen(true);
      return;
    }

    try {
      await joinGroupByCode(code);
      await loadData();
      completeOnboarding();
      showToast("Gruppe beigetreten.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Einladungscode ist ungültig.");
    }
  }

  async function handleJoinCitrusFirstRun(code: string) {
    if (!authUser) {
      setAuthOpen(true);
      return;
    }

    await joinGroupByCode(code);
    await loadData();
    completeFirstRun(authUser.id);
    showToast("Willkommen in der Citrus-Gruppe.");
  }

  async function handleLeaveGroup(membership: GroupMembership) {
    if (!authUser) {
      setAuthOpen(true);
      return;
    }
    if (membership.role === "admin") {
      showToast("Admin-Mitgliedschaften können nicht direkt verlassen werden.");
      return;
    }
    if (!window.confirm("Gruppe verlassen?\nDu siehst danach keine internen Bewegungen dieser Gruppe mehr.")) return;

    try {
      await leaveGroup(membership.groupId, authUser.id);
      await loadData();
      showToast("Gruppe verlassen.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Gruppe konnte nicht verlassen werden.");
    }
  }

  async function continuePendingAction() {
    if (!pendingAction || !authUser) return;
    const action = pendingAction;
    setPendingAction(undefined);
    try {
      if (action.type === "create") {
        await saveMovement(action.input, authUser.id);
      } else if (action.type === "support") {
        await addSupport(action.movementId, authUser.id);
        await loadData();
        showToast("Unterstützung gespeichert.");
      } else if (action.type === "join") {
        await joinGroupByCode(action.code);
        await loadData();
        completeOnboarding();
        showToast("Gruppe beigetreten.");
      } else {
        await saveReport(action.movementId, authUser.id, action.reason);
        await loadData();
        showToast("Danke, wir prüfen das.");
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Aktion konnte nicht abgeschlossen werden.");
    }
  }

  useEffect(() => {
    if (authUser && pendingAction && !authOpen) {
      void continuePendingAction();
    }
  }, [authOpen, authUser, pendingAction]);

  async function shareMovement(movement: Movement) {
    const url = `${window.location.origin}${window.location.pathname}#${movement.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: movement.title, text: movement.description, url });
      } else {
        await navigator.clipboard.writeText(url);
        showToast("Link kopiert.");
      }
    } catch {
      showToast("Teilen wurde abgebrochen.");
    }
  }

  function reportMovement(movement: Movement) {
    setReportTarget(movement);
  }

  async function submitReport(reason: string) {
    if (!reportTarget) return;
    if (!authUser) {
      setPendingAction({ type: "report", movementId: reportTarget.id, reason });
      setReportTarget(undefined);
      setAuthOpen(true);
      return;
    }

    try {
      await saveReport(reportTarget.id, authUser.id, reason);
      setReportTarget(undefined);
      await loadData();
      showToast("Danke, wir prüfen das.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Meldung konnte nicht gespeichert werden.");
    }
  }

  async function acceptConductNotice() {
    if (!authUser) return;
    try {
      await markConductNoticeSeen(authUser.id);
      await refreshProfile();
      showToast("Danke.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Hinweis konnte nicht gespeichert werden.");
    }
  }

  function openMovement(movement: Movement) {
    setDetailMovementId(movement.id);
  }

  function openGroup(groupId: string) {
    setGroupsViewOpen(false);
    setGroupFilterId(groupId);
    setScopeFilter("all");
    setSearch("");
    setActiveTab("feed");
  }

  function changeTab(tab: Tab) {
    setActiveTab(tab);
    setDetailMovementId(undefined);
    setGroupsViewOpen(false);
    setNotificationsOpen(false);
    setSearchOpen(false);
  }

  async function handleMarkNotificationsRead() {
    if (!authUser) return;
    setNotifications((current) => current.map((notification) => ({ ...notification, isRead: true })));
    await markNotificationsRead(authUser.id);
    await loadData();
  }

  async function handleLogout() {
    try {
      await signOut();
      await loadData();
      showToast("Du bist ausgeloggt.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Logout fehlgeschlagen.");
    }
  }

  function resetLocalApp() {
    localStorage.removeItem(STORAGE_KEYS.onboarded);
    if (authUser) localStorage.removeItem(`${STORAGE_KEYS.firstRun}:${authUser.id}`);
    setOnboarded(false);
    setFirstRunCompleted(false);
    setSearch("");
    setScopeFilter("all");
    setGroupFilterId(undefined);
    setGroupsViewOpen(false);
    setNotificationsOpen(false);
    setSearchOpen(false);
    setDetailMovementId(undefined);
    showToast("Lokales Onboarding wurde zurückgesetzt.");
  }

  if (!authUser) {
    return (
      <>
        <Onboarding onAuthenticated={completeOnboarding} />
        <Toast toast={toast} />
      </>
    );
  }

  if (!firstRunCompleted) {
    return (
      <>
        <FirstRunFlow onJoinCitrus={handleJoinCitrusFirstRun} />
        <Toast toast={toast} />
      </>
    );
  }

  let content = (
    <Home
      userName={user.name}
      isAuthenticated={Boolean(authUser)}
      stats={stats}
      movements={visibleMovements}
      notifications={notifications}
      loading={loadingData}
      error={dataError}
      onOpenMovement={openMovement}
      onToggleSupport={handleToggleSupport}
      onOpenFeed={() => changeTab("feed")}
      onOpenSearch={() => setSearchOpen(true)}
      onOpenNotifications={() => setNotificationsOpen(true)}
      onPlus={() => setSheetOpen(true)}
      onAuth={() => setAuthOpen(true)}
    />
  );

  if (selectedMovement) {
    content = (
      <MovementDetail
        movement={selectedMovement}
        onBack={() => setDetailMovementId(undefined)}
        onToggleSupport={handleToggleSupport}
        onShare={shareMovement}
        onReport={reportMovement}
        canManage={Boolean(authUser && selectedMovement.userId === authUser.id)}
        onPostUpdate={handlePostMovementUpdate}
        onDelete={handleDeleteOwnMovement}
      />
    );
  } else if (notificationsOpen) {
    content = (
      <Notifications
        notifications={notifications}
        movements={visibleMovements}
        isAuthenticated={Boolean(authUser)}
        onBack={() => setNotificationsOpen(false)}
        onOpenNotification={async (notification) => {
          setNotifications((current) =>
            current.map((item) => (item.id === notification.id ? { ...item, isRead: true } : item)),
          );
          await markNotificationRead(notification);
        }}
        onOpenMovement={(movement) => {
          setNotificationsOpen(false);
          openMovement(movement);
        }}
        onMarkAllRead={handleMarkNotificationsRead}
        onAuth={() => setAuthOpen(true)}
      />
    );
  } else if (groupsViewOpen) {
    content = <Groups groups={groups} onBack={() => setGroupsViewOpen(false)} onOpenGroup={openGroup} />;
  } else if (activeTab === "feed") {
    content = (
      <Feed
        movements={filteredMovements}
        scopeFilter={scopeFilter}
        search={search}
        groupFilterId={groupFilterId}
        loading={loadingData}
        onScopeChange={setScopeFilter}
        onSearchChange={setSearch}
        onClearGroupFilter={() => setGroupFilterId(undefined)}
        onOpenMovement={openMovement}
        onToggleSupport={handleToggleSupport}
        onShare={shareMovement}
        onReport={reportMovement}
        onOpenGroup={openGroup}
        onPlus={() => setSheetOpen(true)}
      />
    );
  } else if (activeTab === "insights") {
    content = (
      <Insights
        stats={stats}
        isAuthenticated={Boolean(authUser)}
        movements={visibleMovements}
        groups={userGroups}
        userId={currentUserId}
        onAuth={() => setAuthOpen(true)}
        onOpenMovement={openMovement}
      />
    );
  } else if (activeTab === "profile") {
    content = (
      <Profile
        user={user}
        groups={groups}
        memberships={memberships}
        movements={visibleMovements}
        stats={stats}
        isAuthenticated={Boolean(authUser)}
        onOpenGroups={() => setGroupsViewOpen(true)}
        onOpenGroup={openGroup}
        onOpenMovement={openMovement}
        onJoinCode={handleJoinCode}
        onLeaveGroup={handleLeaveGroup}
        onReset={resetLocalApp}
        onPlus={() => setSheetOpen(true)}
        onToast={showToast}
        onAuth={() => setAuthOpen(true)}
        onLogout={handleLogout}
        onRefresh={async () => {
          await refreshProfile();
          await loadData();
        }}
      />
    );
  }

  return (
    <>
      <AppShell activeTab={activeTab} onTabChange={changeTab} onPlus={() => setSheetOpen(true)}>
        {content}
      </AppShell>
      <BottomSheet
        open={sheetOpen}
        groups={groups}
        memberships={memberships}
        isAuthenticated={Boolean(authUser)}
        onClose={() => setSheetOpen(false)}
        onAuth={() => setAuthOpen(true)}
        onJoinCode={handleJoinCode}
        onCreate={handleCreateMovement}
      />
      <SearchSheet
        open={searchOpen}
        movements={visibleMovements}
        onClose={() => setSearchOpen(false)}
        onOpenMovement={openMovement}
      />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onSuccess={() => setAuthOpen(false)} />
      <ReportModal
        open={Boolean(reportTarget)}
        movement={reportTarget}
        onClose={() => setReportTarget(undefined)}
        onSubmit={submitReport}
      />
      <ConductNotice open={Boolean(authUser && profile && !profile.hasSeenConductNotice)} onAccept={acceptConductNotice} />
      <Toast toast={toast} />
    </>
  );
}

export default App;
