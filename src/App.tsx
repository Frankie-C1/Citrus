import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "./auth/AuthProvider";
import { AppShell } from "./components/AppShell";
import { AuthModal } from "./components/AuthModal";
import { BottomSheet } from "./components/BottomSheet";
import { Toast } from "./components/Toast";
import { addSupport, createMovement, deriveStats, fetchGroups, fetchMovements, removeSupport } from "./data/queries";
import { getSupabaseConfigError } from "./lib/supabase";
import { Feed } from "./screens/Feed";
import { Groups } from "./screens/Groups";
import { Home } from "./screens/Home";
import { Insights } from "./screens/Insights";
import { MovementDetail } from "./screens/MovementDetail";
import { Onboarding } from "./screens/Onboarding";
import { Profile } from "./screens/Profile";
import type { CreateMovementInput, Group, Movement, Scope, Tab, Toast as ToastType, User } from "./types";

const STORAGE_KEYS = {
  onboarded: "citrus:onboarded",
};

type PendingAction =
  | { type: "create"; input: CreateMovementInput }
  | { type: "support"; movementId: string };

function initialsFromName(name: string) {
  return name
    .split(/[ ._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "C";
}

function fallbackUser(profileName?: string, email?: string): User {
  const name = profileName || email?.split("@")[0] || "Gast";
  return {
    id: "guest",
    name,
    email,
    avatarInitials: initialsFromName(name),
    influence: 0,
    groupIds: [],
  };
}

function App() {
  const { authUser, profile, signOut } = useAuth();
  const [onboarded, setOnboarded] = useState(() => localStorage.getItem(STORAGE_KEYS.onboarded) === "true");
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [scopeFilter, setScopeFilter] = useState<Scope | "all">("all");
  const [search, setSearch] = useState("");
  const [groupFilterId, setGroupFilterId] = useState<string | undefined>();
  const [detailMovementId, setDetailMovementId] = useState<string | undefined>();
  const [groupsViewOpen, setGroupsViewOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | undefined>();
  const [toast, setToast] = useState<ToastType | undefined>();
  const [groups, setGroups] = useState<Group[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState(getSupabaseConfigError());

  const currentUserId = authUser?.id ?? null;

  const loadData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [nextGroups, nextMovements] = await Promise.all([fetchGroups(), fetchMovements(currentUserId)]);
      setGroups(nextGroups);
      setMovements(nextMovements);
      setDataError(getSupabaseConfigError());
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "Daten konnten nicht geladen werden.");
    } finally {
      setLoadingData(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const stats = useMemo(() => deriveStats(movements, currentUserId), [currentUserId, movements]);
  const userGroups = useMemo(() => {
    const groupIds = new Set(
      movements
        .filter((movement) => movement.userId === currentUserId || movement.supportedByUser)
        .map((movement) => movement.groupId),
    );
    return groups.filter((group) => groupIds.has(group.id));
  }, [currentUserId, groups, movements]);

  const user = useMemo<User>(() => {
    if (!authUser) return fallbackUser();
    const name = profile?.displayName || authUser.email?.split("@")[0] || "Citrus";
    return {
      id: authUser.id,
      name,
      email: authUser.email,
      avatarInitials: initialsFromName(name),
      influence: stats.reached,
      groupIds: userGroups.map((group) => group.id),
    };
  }, [authUser, profile, stats.reached, userGroups]);

  const selectedMovement = detailMovementId
    ? movements.find((movement) => movement.id === detailMovementId)
    : undefined;

  const filteredMovements = useMemo(() => {
    const query = search.trim().toLowerCase();
    return movements
      .filter((movement) => (scopeFilter === "all" ? true : movement.scope === scopeFilter))
      .filter((movement) => (groupFilterId ? movement.groupId === groupFilterId : true))
      .filter((movement) => {
        if (!query) return true;
        return [movement.title, movement.description, movement.groupName, movement.category]
          .join(" ")
          .toLowerCase()
          .includes(query);
      })
      .sort((a, b) => b.weeklyGrowth + b.supporters - (a.weeklyGrowth + a.supporters));
  }, [groupFilterId, movements, scopeFilter, search]);

  function showToast(message: string) {
    const nextToast = { id: Date.now(), message };
    setToast(nextToast);
    window.setTimeout(() => {
      setToast((current) => (current?.id === nextToast.id ? undefined : current));
    }, 2600);
  }

  function completeOnboarding() {
    localStorage.setItem(STORAGE_KEYS.onboarded, "true");
    setOnboarded(true);
    setActiveTab("home");
  }

  async function saveMovement(input: CreateMovementInput, userId: string) {
    const newMovementId = await createMovement(input, userId);
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
      await loadData();
    } catch (error) {
      await loadData();
      showToast(error instanceof Error ? error.message : "Unterstützung konnte nicht gespeichert werden.");
    }
  }

  async function continuePendingAction() {
    if (!pendingAction || !authUser) return;
    const action = pendingAction;
    setPendingAction(undefined);
    try {
      if (action.type === "create") {
        await saveMovement(action.input, authUser.id);
      } else {
        await addSupport(action.movementId, authUser.id);
        await loadData();
        showToast("Unterstützung gespeichert.");
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

  function reportMovement() {
    showToast("Danke, wir prüfen das.");
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
    setOnboarded(false);
    setSearch("");
    setScopeFilter("all");
    setGroupFilterId(undefined);
    setGroupsViewOpen(false);
    setDetailMovementId(undefined);
    showToast("Lokales Onboarding wurde zurückgesetzt.");
  }

  if (!onboarded) {
    return (
      <>
        <Onboarding
          onComplete={completeOnboarding}
          onInviteCode={() => showToast("Einladungscode kann im MVP lokal vorbereitet werden.")}
          onQrCode={() => showToast("Scanner wird später aktiviert.")}
        />
        <Toast toast={toast} />
      </>
    );
  }

  let content = (
    <Home
      userName={user.name}
      isAuthenticated={Boolean(authUser)}
      stats={stats}
      movements={movements}
      loading={loadingData}
      error={dataError}
      onOpenMovement={openMovement}
      onToggleSupport={handleToggleSupport}
      onOpenFeed={() => changeTab("feed")}
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
      />
    );
  } else if (activeTab === "insights") {
    content = <Insights stats={stats} isAuthenticated={Boolean(authUser)} onAuth={() => setAuthOpen(true)} />;
  } else if (activeTab === "profile") {
    content = (
      <Profile
        user={user}
        groups={groups}
        stats={stats}
        isAuthenticated={Boolean(authUser)}
        onOpenGroups={() => setGroupsViewOpen(true)}
        onReset={resetLocalApp}
        onToast={showToast}
        onAuth={() => setAuthOpen(true)}
        onLogout={handleLogout}
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
        onClose={() => setSheetOpen(false)}
        onCreate={handleCreateMovement}
      />
      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={() => setAuthOpen(false)}
      />
      <Toast toast={toast} />
    </>
  );
}

export default App;
