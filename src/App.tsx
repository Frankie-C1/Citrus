import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { useAuth } from "./auth/AuthProvider";
import { AppShell } from "./components/AppShell";
import { AuthModal } from "./components/AuthModal";
import { BottomSheet } from "./components/BottomSheet";
import { ConductNotice } from "./components/ConductNotice";
import { ReportModal } from "./components/ReportModal";
import { SearchSheet } from "./components/SearchSheet";
import { Toast } from "./components/Toast";
import {
  addDislike,
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
  removeDislike,
  removeSupport,
  reportMovement as saveReport,
  updateMovement,
  uploadMovementMedia,
} from "./data/queries";
import saxophoneImage from "./assets/onboarding/saxophone-onboarding.png";
import { getSupabaseConfigError } from "./lib/supabase";
import { isSupabaseConfigured, supabase } from "./lib/supabase";
import { sortMovementsForUser } from "./lib/recommendations";
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

function LoadingScreen() {
  return (
    <div className="app-loading-screen">
      <img className="app-loading-bg" src={saxophoneImage} alt="" />
      <div className="app-loading-overlay" />
      <div className="app-loading-brand">
        <img className="app-loading-logo" src="/app-icon-512.png" alt="Citrus" />
        <h1>Citrus</h1>
        <p>Was zählt, wird sichtbar.</p>
      </div>
    </div>
  );
}

function App() {
  const { authUser, profile, signOut, refreshProfile, loading: authLoading } = useAuth();
  const [onboarded, setOnboarded] = useState(() => localStorage.getItem(STORAGE_KEYS.onboarded) === "true");
  const [firstRunCompleted, setFirstRunCompleted] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [search, setSearch] = useState("");
  const [groupFilterId, setGroupFilterId] = useState<string | undefined>();
  const [feedQueue, setFeedQueue] = useState<string[]>([]);
  const [activeFeedIndex, setActiveFeedIndex] = useState(0);
  const [newFeedItemsAvailable, setNewFeedItemsAvailable] = useState(false);
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
  const [initialDataReady, setInitialDataReady] = useState(false);
  const [dataError, setDataError] = useState(getSupabaseConfigError());
  const [splashReady, setSplashReady] = useState(false);
  const [startupSplashDone, setStartupSplashDone] = useState(false);
  const edgeSwipeStart = useRef<{ x: number; y: number } | null>(null);
  const previousTabRef = useRef<Tab>("home");
  const dataSnapshotRef = useRef({ movementIds: new Set<string>(), notificationIds: new Set<string>() });

  const currentUserId = authUser?.id ?? null;

  useEffect(() => {
    if (!authUser) {
      setFirstRunCompleted(true);
      return;
    }
    setFirstRunCompleted(localStorage.getItem(`${STORAGE_KEYS.firstRun}:${authUser.id}`) === "true");
  }, [authUser]);

  const loadData = useCallback(async (options?: { silent?: boolean }) => {
    const silent = Boolean(options?.silent);
    if (!silent) setLoadingData(true);
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

      const previousSnapshot = dataSnapshotRef.current;
      const nextMovementIds = new Set(nextMovements.map((movement) => movement.id));
      const nextNotificationIds = new Set(nextNotifications.map((notification) => notification.id));
      const hasNewMovement = nextMovements.some((movement) => !previousSnapshot.movementIds.has(movement.id));
      const hasNewNotification = nextNotifications.some((notification) => !previousSnapshot.notificationIds.has(notification.id));

      setGroups(nextGroups);
      setMovements(nextMovements);
      setMemberships(nextMemberships);
      setNotifications(nextNotifications);
      dataSnapshotRef.current = { movementIds: nextMovementIds, notificationIds: nextNotificationIds };
      setDataError(getSupabaseConfigError());
      if (silent && (previousSnapshot.movementIds.size || previousSnapshot.notificationIds.size) && (hasNewMovement || hasNewNotification)) {
        if (hasNewMovement) setNewFeedItemsAvailable(true);
        showToast(hasNewNotification ? "Neue Benachrichtigung geladen." : "Neue Themen geladen.");
      }
    } catch (error) {
      setDataError(getSupabaseConfigError());
      if (!silent) showToast(error instanceof Error ? error.message : "Daten konnten nicht geladen werden.");
    } finally {
      setInitialDataReady(true);
      if (!silent) setLoadingData(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!initialDataReady) return;
    let timeout: number | undefined;
    const refreshSilently = () => {
      if (document.hidden) return;
      void loadData({ silent: true });
    };
    const interval = window.setInterval(refreshSilently, 30000);
    const onVisibilityChange = () => {
      if (!document.hidden) {
        window.clearTimeout(timeout);
        timeout = window.setTimeout(refreshSilently, 400);
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    const channel = isSupabaseConfigured
      ? supabase
          .channel(`citrus-live-${currentUserId ?? "public"}`)
          .on("postgres_changes", { event: "*", schema: "public", table: "movements" }, refreshSilently)
          .on("postgres_changes", { event: "*", schema: "public", table: "supports" }, refreshSilently)
          .on("postgres_changes", { event: "*", schema: "public", table: "movement_reactions" }, refreshSilently)
          .on("postgres_changes", { event: "*", schema: "public", table: "movement_updates" }, refreshSilently)
          .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: currentUserId ? `user_id=eq.${currentUserId}` : undefined }, refreshSilently)
          .subscribe()
      : undefined;
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [currentUserId, initialDataReady, loadData]);

  useEffect(() => {
    const timer = window.setTimeout(() => setSplashReady(true), 900);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (startupSplashDone) return;
    if (splashReady && !authLoading && (initialDataReady || Boolean(dataError))) {
      setStartupSplashDone(true);
    }
  }, [authLoading, dataError, initialDataReady, splashReady, startupSplashDone]);

  useEffect(() => {
    if (activeTab !== "feed" && !sheetOpen && !searchOpen && !authOpen && !reportTarget) return;
    const isFeedLock = activeTab === "feed";
    const scrollY = isFeedLock ? 0 : window.scrollY;
    if (isFeedLock) window.scrollTo(0, 0);
    const previous = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
    };
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    return () => {
      document.body.style.overflow = previous.overflow;
      document.body.style.position = previous.position;
      document.body.style.top = previous.top;
      document.body.style.width = previous.width;
      window.scrollTo(0, scrollY);
    };
  }, [activeTab, authOpen, reportTarget, searchOpen, sheetOpen]);

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
  const internalGroups = useMemo(() => groups.filter((group) => group.scope === "internal"), [groups]);
  const membershipGroupIds = useMemo(() => new Set(memberships.map((membership) => membership.groupId)), [memberships]);
  const visibleMovements = useMemo(
    () =>
      movements.map((movement) =>
        userSettings.privacyVisibility === "anonymous" && movement.userId === currentUserId
          ? { ...movement, authorUsername: "Anonym", authorDisplayName: "Anonym", authorAvatarUrl: null, authorRole: null, isAnonymous: true }
          : movement,
      ),
    [currentUserId, movements, userSettings.privacyVisibility],
  );
  const internalVisibleMovements = useMemo(
    () => visibleMovements.filter((movement) => movement.scope === "internal" && membershipGroupIds.has(movement.groupId)),
    [membershipGroupIds, visibleMovements],
  );
  const userGroups = useMemo(() => {
    const groupIds = new Set(
      movements
        .filter((movement) => movement.scope === "internal" && (movement.userId === currentUserId || movement.supportedByUser))
        .map((movement) => movement.groupId),
    );
    return internalGroups.filter((group) => membershipGroupIds.has(group.id) || groupIds.has(group.id));
  }, [currentUserId, internalGroups, membershipGroupIds, movements]);

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
    ? internalVisibleMovements.find((movement) => movement.id === detailMovementId)
    : undefined;

  const rankedFeedCandidates = useMemo(() => {
    const query = search.trim().toLowerCase();
    const deduped = [...new Map(internalVisibleMovements.map((movement) => [movement.id, movement])).values()];
    const filtered = deduped
      .filter((movement) => (groupFilterId ? movement.groupId === groupFilterId : true))
      .filter((movement) => {
        if (!query) return true;
        return [movement.title, movement.description, movement.groupName, movement.category, movement.authorUsername]
          .join(" ")
          .toLowerCase()
          .includes(query);
      });
    if (userSettings.feedPreferences.newestFirst) {
      return [...filtered].sort((a, b) => {
        const createdDiff = new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
        return createdDiff || a.id.localeCompare(b.id);
      });
    }
    const supportedGroupIds = filtered.filter((movement) => movement.supportedByUser).map((movement) => movement.groupId);
    const interactedCategories = filtered
      .filter((movement) => movement.supportedByUser || movement.userId === currentUserId)
      .map((movement) => movement.category);
    return sortMovementsForUser(filtered, {
      userId: currentUserId,
      membershipGroupIds,
      supportedGroupIds,
      interactedCategories,
      mode: groupFilterId ? "groups" : "for-you",
    });
  }, [currentUserId, groupFilterId, internalVisibleMovements, membershipGroupIds, search, userSettings.feedPreferences.newestFirst]);

  const movementsById = useMemo(() => new Map(internalVisibleMovements.map((movement) => [movement.id, movement])), [internalVisibleMovements]);
  const feedMovements = useMemo(
    () => feedQueue.map((id) => movementsById.get(id)).filter((movement): movement is Movement => Boolean(movement)),
    [feedQueue, movementsById],
  );
  const visibleFeedMovements = feedQueue.length ? feedMovements : rankedFeedCandidates;

  const rebuildFeedQueue = useCallback(() => {
    setFeedQueue(rankedFeedCandidates.map((movement) => movement.id));
    setActiveFeedIndex(0);
    setNewFeedItemsAvailable(false);
  }, [rankedFeedCandidates]);

  useEffect(() => {
    if (activeTab !== "feed" || feedQueue.length || loadingData) return;
    rebuildFeedQueue();
  }, [activeTab, feedQueue.length, loadingData, rebuildFeedQueue]);

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

    let imageUrl = input.imageUrl;
    if (input.imageFile) {
      const compressed = await compressImage(input.imageFile);
      imageUrl = await uploadMovementMedia(userId, compressed.blob, compressed.extension);
    }

    const newMovementId = await createMovement({
      ...input,
      imageUrl,
      backgroundType: input.imageFile ? "image" : input.backgroundType,
      backgroundValue: input.imageFile ? imageUrl : input.backgroundValue,
    }, userId);
    await loadData();
    setSearch("");
    setGroupFilterId(undefined);
    setFeedQueue([]);
    setActiveFeedIndex(0);
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
              dislikedByUser: movement.supportedByUser ? movement.dislikedByUser : false,
              supporters: Math.max(0, movement.supporters + (movement.supportedByUser ? -1 : 1)),
              dislikes: Math.max(0, (movement.dislikes ?? 0) - (!movement.supportedByUser && movement.dislikedByUser ? 1 : 0)),
              weeklyGrowth: Math.max(0, movement.weeklyGrowth + (movement.supportedByUser ? -1 : 1)),
            }
          : movement,
      ),
    );

    try {
      if (target.supportedByUser) {
        await removeSupport(id, authUser.id);
      } else {
        if (target.dislikedByUser) await removeDislike(id, authUser.id);
        await addSupport(id, authUser.id);
      }
    } catch (error) {
      await loadData();
      showToast(error instanceof Error ? error.message : "Unterstützung konnte nicht gespeichert werden.");
    }
  }

  async function handleToggleDislike(id: string) {
    if (!authUser) {
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
              dislikedByUser: !movement.dislikedByUser,
              supportedByUser: movement.dislikedByUser ? movement.supportedByUser : false,
              dislikes: Math.max(0, (movement.dislikes ?? 0) + (movement.dislikedByUser ? -1 : 1)),
              supporters: Math.max(0, movement.supporters - (!movement.dislikedByUser && movement.supportedByUser ? 1 : 0)),
              weeklyGrowth: Math.max(0, movement.weeklyGrowth - (!movement.dislikedByUser && movement.supportedByUser ? 1 : 0)),
            }
          : movement,
      ),
    );

    try {
      if (target.dislikedByUser) {
        await removeDislike(id, authUser.id);
      } else {
        if (target.supportedByUser) await removeSupport(id, authUser.id);
        await addDislike(id, authUser.id);
      }
    } catch (error) {
      await loadData();
      showToast(error instanceof Error ? error.message : "Reaktion konnte nicht gespeichert werden.");
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

  function pushInternalState(view: string) {
    window.history.pushState({ citrus: view }, "", window.location.pathname);
  }

  function openMovement(movement: Movement) {
    pushInternalState("detail");
    setDetailMovementId(movement.id);
  }

  function openGroup(groupId: string) {
    setGroupsViewOpen(false);
    setGroupFilterId(groupId);
    setSearch("");
    setFeedQueue([]);
    setActiveFeedIndex(0);
    setActiveTab("feed");
  }

  function changeTab(tab: Tab) {
    if (tab !== activeTab) {
      previousTabRef.current = activeTab;
      pushInternalState(`tab:${tab}`);
    }
    setActiveTab(tab);
    setDetailMovementId(undefined);
    setGroupsViewOpen(false);
    setNotificationsOpen(false);
    setSearchOpen(false);
    if (tab === "feed") {
      setFeedQueue([]);
      setActiveFeedIndex(0);
      setNewFeedItemsAvailable(false);
    }
  }

  async function handleMarkNotificationsRead() {
    if (!authUser) return;
    setNotifications((current) => current.map((notification) => ({ ...notification, isRead: true })));
    await markNotificationsRead(authUser.id);
    await loadData();
  }

  async function handleAbmelden() {
    try {
      await signOut();
      setMovements([]);
      setNotifications([]);
      setMemberships([]);
      setSearch("");
      setGroupFilterId(undefined);
      setFeedQueue([]);
      setActiveFeedIndex(0);
      setNewFeedItemsAvailable(false);
      setDetailMovementId(undefined);
      setGroupsViewOpen(false);
      setNotificationsOpen(false);
      setSearchOpen(false);
      setSheetOpen(false);
      setAuthOpen(false);
      setActiveTab("home");
      previousTabRef.current = "home";
      dataSnapshotRef.current = { movementIds: new Set<string>(), notificationIds: new Set<string>() };
      window.history.replaceState({ citrus: "signed-out" }, "", window.location.pathname);
      showToast("Du wurdest abgemeldet.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Abmelden fehlgeschlagen.");
    }
  }

  function resetLocalApp() {
    localStorage.removeItem(STORAGE_KEYS.onboarded);
    if (authUser) localStorage.removeItem(`${STORAGE_KEYS.firstRun}:${authUser.id}`);
    setOnboarded(false);
    setFirstRunCompleted(false);
    setSearch("");
    setGroupFilterId(undefined);
    setFeedQueue([]);
    setActiveFeedIndex(0);
    setGroupsViewOpen(false);
    setNotificationsOpen(false);
    setSearchOpen(false);
    setDetailMovementId(undefined);
    showToast("Lokales Onboarding wurde zurückgesetzt.");
  }

  useEffect(() => {
    window.history.replaceState({ citrus: "root" }, "", window.location.pathname);
    function handlePopState() {
      if (sheetOpen) { setSheetOpen(false); return; }
      if (authOpen) { setAuthOpen(false); return; }
      if (searchOpen) { setSearchOpen(false); return; }
      if (reportTarget) { setReportTarget(undefined); return; }
      if (detailMovementId) { setDetailMovementId(undefined); return; }
      if (notificationsOpen) { setNotificationsOpen(false); return; }
      if (groupsViewOpen) { setGroupsViewOpen(false); return; }
      if (activeTab !== "home") { setActiveTab(previousTabRef.current === activeTab ? "home" : previousTabRef.current); return; }
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [activeTab, authOpen, detailMovementId, groupsViewOpen, notificationsOpen, reportTarget, searchOpen, sheetOpen]);

  function startEdgeSwipe(event: PointerEvent) {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (sheetOpen || target?.closest("input, textarea, select, button, a")) return;
    if (event.clientX > 32) return;
    edgeSwipeStart.current = { x: event.clientX, y: event.clientY };
  }

  function moveEdgeSwipe(event: PointerEvent) {
    const start = edgeSwipeStart.current;
    if (!start) return;
    const deltaX = event.clientX - start.x;
    const deltaY = Math.abs(event.clientY - start.y);
    if (deltaX > 74 && deltaY < 58) {
      edgeSwipeStart.current = null;
      if (detailMovementId) setDetailMovementId(undefined);
      else if (activeTab !== "home") setActiveTab(previousTabRef.current === activeTab ? "home" : previousTabRef.current);
    }
  }

  function endEdgeSwipe() {
    edgeSwipeStart.current = null;
  }

  const showSplash = !startupSplashDone && (!splashReady || authLoading || (!initialDataReady && loadingData && !dataError));
  if (showSplash) return <LoadingScreen />;

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
      movements={internalVisibleMovements}
      notifications={notifications}
      loading={loadingData}
      error={dataError}
      onOpenMovement={openMovement}
      onToggleSupport={handleToggleSupport}
      onOpenFeed={() => changeTab("feed")}
      onOpenSearch={() => { pushInternalState("search"); setSearchOpen(true); }}
      onOpenNotifications={() => { pushInternalState("notifications"); setNotificationsOpen(true); }}
      onPlus={() => { pushInternalState("sheet"); setSheetOpen(true); }}
      onAuth={() => { pushInternalState("auth"); setAuthOpen(true); }}
      onRefresh={() => loadData({ silent: true })}
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
        movements={internalVisibleMovements}
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
        onAuth={() => { pushInternalState("auth"); setAuthOpen(true); }}
      />
    );
  } else if (groupsViewOpen) {
    content = <Groups groups={internalGroups} onBack={() => setGroupsViewOpen(false)} onOpenGroup={openGroup} />;
  } else if (activeTab === "feed") {
    content = (
      <Feed
        movements={visibleFeedMovements}
        groups={userGroups}
        activeIndex={activeFeedIndex}
        groupFilterId={groupFilterId}
        loading={loadingData}
        newItemsAvailable={newFeedItemsAvailable}
        onActiveIndexChange={setActiveFeedIndex}
        onRefreshQueue={rebuildFeedQueue}
        onClearGroupFilter={() => {
          setGroupFilterId(undefined);
          setFeedQueue([]);
          setActiveFeedIndex(0);
        }}
        onSelectGroup={openGroup}
        onOpenMovement={openMovement}
        onToggleSupport={handleToggleSupport}
        onToggleDislike={handleToggleDislike}
        onShare={shareMovement}
        onReport={reportMovement}
        onPlus={() => { pushInternalState("sheet"); setSheetOpen(true); }}
      />
    );
  } else if (activeTab === "insights") {
    content = (
      <Insights
        stats={stats}
        isAuthenticated={Boolean(authUser)}
        movements={internalVisibleMovements}
        groups={userGroups}
        userId={currentUserId}
        onAuth={() => { pushInternalState("auth"); setAuthOpen(true); }}
        onOpenMovement={openMovement}
      />
    );
  } else if (activeTab === "profile") {
    content = (
      <Profile
        user={user}
        groups={internalGroups}
        memberships={memberships}
        movements={internalVisibleMovements}
        stats={stats}
        isAuthenticated={Boolean(authUser)}
        onOpenGroups={() => setGroupsViewOpen(true)}
        onOpenGroup={openGroup}
        onOpenMovement={openMovement}
        onJoinCode={handleJoinCode}
        onLeaveGroup={handleLeaveGroup}
        onReset={resetLocalApp}
        onPlus={() => { pushInternalState("sheet"); setSheetOpen(true); }}
        onToast={showToast}
        onAuth={() => { pushInternalState("auth"); setAuthOpen(true); }}
        onAbmelden={handleAbmelden}
        onRefresh={async () => {
          await refreshProfile();
          await loadData();
        }}
      />
    );
  }

  return (
    <>
      <div onPointerDown={startEdgeSwipe} onPointerMove={moveEdgeSwipe} onPointerUp={endEdgeSwipe} onPointerCancel={endEdgeSwipe}>
        <AppShell activeTab={activeTab} onTabChange={changeTab} onPlus={() => { pushInternalState("sheet"); setSheetOpen(true); }}>
          {content}
        </AppShell>
      </div>
      <BottomSheet
        open={sheetOpen}
        groups={internalGroups}
        memberships={memberships}
        isAuthenticated={Boolean(authUser)}
        onClose={() => setSheetOpen(false)}
        onAuth={() => { pushInternalState("auth"); setAuthOpen(true); }}
        onJoinCode={handleJoinCode}
        onCreate={handleCreateMovement}
      />
      <SearchSheet
        open={searchOpen}
        movements={internalVisibleMovements}
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
