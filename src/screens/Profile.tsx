import { useEffect, useMemo, useRef, useState, type FormEvent, type PointerEvent } from "react";
import { useAuth } from "../auth/AuthProvider";
import { addGroupAdmin, anonymizeUserProfile, banUserProfile, createGroup, deleteGroup, deleteMovement, deleteUserMovements, fetchGroupAdmins, removeGroupAdmin, removeGroupMember, requestAccountDeletion, searchGroupAdminCandidates, searchUsers, updateGroup, updateMovementStatus, updateProfileSettings, uploadGroupLogo } from "../data/queries";
import type { AdminUserResult, Group, GroupAdmin, GroupMembership, Movement, User, UserStats } from "../types";
import { GroupVisual } from "../components/GroupVisual";
import { Icon } from "../components/Icon";
import { SettingsScreen } from "./Settings";

type ProfileProps = {
  user: User;
  groups: Group[];
  memberships: GroupMembership[];
  movements: Movement[];
  stats: UserStats;
  isAuthenticated: boolean;
  onOpenGroups: () => void;
  onOpenGroup: (groupId: string) => void;
  onOpenMovement: (movement: Movement) => void;
  onJoinCode: (code: string) => Promise<void> | void;
  onLeaveGroup: (membership: GroupMembership) => Promise<void> | void;
  onReset: () => void;
  onPlus: () => void;
  onToast: (message: string) => void;
  onAuth: () => void;
  onAbmelden: () => void;
  onRefresh: () => Promise<void>;
};

type ProfileActivity = {
  id: string;
  label: string;
  title: string;
  timestamp?: string;
  movement: Movement;
  icon: string;
};

function formatCompactNumber(value: number) {
  if (value >= 1000) {
    return `${new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 }).format(value / 1000)}k`;
  }
  return value.toLocaleString("de-DE");
}

function formatRelativeTime(value?: string) {
  if (!value) return "";
  const diffMs = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(diffMs)) return "";
  const minutes = Math.max(1, Math.floor(diffMs / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}M`;
  return `${Math.floor(months / 12)}J`;
}

function formatMonthYear(value?: string) {
  if (!value) return "Nicht verfügbar";
  return new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric" }).format(new Date(value));
}

function calculateProfileProgress(input: {
  ownMovements: number;
  supportedMovements: number;
  receivedVotes: number;
  implementedIdeas: number;
}) {
  const xp =
    input.ownMovements * 120 +
    input.supportedMovements * 45 +
    input.receivedVotes * 8 +
    input.implementedIdeas * 220;
  const level = Math.max(1, Math.floor(xp / 1000) + 1);
  const currentLevelStart = (level - 1) * 1000;
  const nextLevel = level * 1000;
  return {
    xp,
    level,
    currentXp: xp - currentLevelStart,
    nextLevelXp: nextLevel - currentLevelStart,
  };
}

function buildImpactRank(movements: Movement[], userId: string) {
  const impactByUser = new Map<string, number>();
  for (const movement of movements) {
    if (!movement.userId) continue;
    impactByUser.set(movement.userId, (impactByUser.get(movement.userId) ?? 0) + movement.supporters);
  }
  if (!impactByUser.size || !impactByUser.has(userId)) return "Noch offen";
  const sorted = [...impactByUser.entries()].sort((a, b) => b[1] - a[1]);
  const rank = sorted.findIndex(([id]) => id === userId) + 1;
  const percentile = Math.max(1, Math.round((rank / sorted.length) * 100));
  return `Top ${percentile}%`;
}

function initialsFrom(value: string) {
  return (
    value
      .split(/[ ._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "C"
  );
}

const statusLabels: Record<Movement["status"], string> = {
  submitted: "Eingereicht",
  trending: "Trendet",
  review: "In Prüfung",
  implementation: "In Umsetzung",
  done: "Fertig",
};

const statusOptions: Movement["status"][] = ["submitted", "trending", "review", "implementation", "done"];

function membershipRoleLabel(role: GroupMembership["role"]) {
  if (role === "admin") return "Admin";
  if (role === "group_admin") return "Gruppenadmin";
  return "Mitglied";
}

export function Profile({
  user,
  groups,
  memberships,
  movements,
  stats,
  isAuthenticated,
  onOpenGroups,
  onOpenGroup,
  onOpenMovement,
  onJoinCode,
  onLeaveGroup,
  onReset,
  onPlus,
  onToast,
  onAuth,
  onAbmelden,
  onRefresh,
}: ProfileProps) {
  const { profile, updateEmail, updatePassword } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [username, setUsername] = useState(profile?.username ?? user.username ?? "");
  const [displayName, setDisplayName] = useState(profile?.displayName ?? user.name);
  const [newEmail, setNewEmail] = useState(user.email ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupCategory, setGroupCategory] = useState("");
  const [groupIcon, setGroupIcon] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupCode, setGroupCode] = useState("");
  const [groupLogoUrl, setGroupLogoUrl] = useState("");
  const [groupLogoFile, setGroupLogoFile] = useState<File | undefined>();
  const [editingGroupId, setEditingGroupId] = useState<string | undefined>();
  const [groupAdmins, setGroupAdmins] = useState<GroupAdmin[]>([]);
  const [selectedGroupAdmins, setSelectedGroupAdmins] = useState<AdminUserResult[]>([]);
  const [groupAdminSearch, setGroupAdminSearch] = useState("");
  const [groupAdminResults, setGroupAdminResults] = useState<AdminUserResult[]>([]);
  const [groupAdminNotice, setGroupAdminNotice] = useState("");
  const [movementSearch, setMovementSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState<AdminUserResult[]>([]);
  const [inviteCode, setInviteCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [activityExpanded, setActivityExpanded] = useState(false);
  const edgeSwipeStart = useRef<{ x: number; y: number } | null>(null);

  const userGroups = groups.filter((group) => user.groupIds.includes(group.id));
  const internalMemberships = memberships.filter((membership) => membership.group.scope === "internal");
  const isAdmin = profile?.role === "admin" || user.role === "admin";
  const groupAdminMemberships = useMemo(
    () => memberships.filter((membership) => membership.group.scope === "internal" && (membership.role === "group_admin" || membership.role === "admin")),
    [memberships],
  );
  const managedGroupIdList = useMemo(
    () => (isAdmin ? groups.map((group) => group.id) : groupAdminMemberships.map((membership) => membership.groupId)),
    [groupAdminMemberships, groups, isAdmin],
  );
  const managedGroupIdsKey = managedGroupIdList.join("|");
  const managedGroupIds = useMemo(() => new Set(managedGroupIdList), [managedGroupIdList]);
  const manageableGroups = useMemo(() => groups.filter((group) => managedGroupIds.has(group.id)), [groups, managedGroupIds]);
  const canUseManagement = isAdmin || manageableGroups.length > 0;
  const ownMovements = useMemo(
    () => movements.filter((movement) => movement.userId === user.id),
    [movements, user.id],
  );
  const supportedMovements = useMemo(
    () => movements.filter((movement) => movement.supportedByUser),
    [movements],
  );
  const receivedVotes = ownMovements.reduce((sum, movement) => sum + movement.supporters, 0);
  const givenVotes = supportedMovements.length;
  const relevantMovements = useMemo(
    () =>
      [...new Map([...ownMovements, ...supportedMovements].map((movement) => [movement.id, movement])).values()],
    [ownMovements, supportedMovements],
  );
  const implementedProjects = relevantMovements.filter((movement) => movement.status === "done").length;
  const impact = relevantMovements.reduce((sum, movement) => sum + movement.supporters, 0);
  const progress = calculateProfileProgress({
    ownMovements: ownMovements.length,
    supportedMovements: supportedMovements.length,
    receivedVotes,
    implementedIdeas: implementedProjects,
  });
  const activityItems = useMemo<ProfileActivity[]>(() => {
    const created = ownMovements.map((movement) => ({
      id: `created-${movement.id}`,
      label: "Du hast gestartet",
      title: movement.title,
      timestamp: movement.createdAt,
      movement,
      icon: movement.emoji,
    }));
    const supported = supportedMovements.map((movement) => ({
      id: `support-${movement.id}`,
      label: "Deine Stimme für",
      title: movement.title,
      timestamp: movement.userSupportCreatedAt,
      movement,
      icon: movement.emoji,
    }));

    return [...created, ...supported].sort(
      (a, b) => new Date(b.timestamp ?? 0).getTime() - new Date(a.timestamp ?? 0).getTime(),
    );
  }, [ownMovements, supportedMovements]);
  const visibleActivities = activityExpanded ? activityItems : activityItems.slice(0, 3);
  const favoriteTopics = useMemo(() => {
    const counts = new Map<string, number>();
    for (const movement of relevantMovements) {
      counts.set(movement.category, (counts.get(movement.category) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category]) => category);
  }, [relevantMovements]);
  const impactRank = buildImpactRank(movements, user.id);
  const verifiedStatus = profile?.role === "admin" ? "Verifiziert" : "Nicht verifiziert";

  useEffect(() => {
    if (!canUseManagement) {
      setGroupAdmins([]);
      return;
    }
    void fetchGroupAdmins(managedGroupIdList)
      .then(setGroupAdmins)
      .catch((error) => onToast(error instanceof Error ? error.message : "Gruppenadmins konnten nicht geladen werden."));
  }, [canUseManagement, managedGroupIdsKey]);

  const movementResults = useMemo(() => {
    const query = movementSearch.trim().toLowerCase();
    const source = isAdmin ? movements : movements.filter((movement) => managedGroupIds.has(movement.groupId));
    if (!query) return source.slice(0, 6);
    return source
      .filter((movement) =>
        [movement.title, movement.groupName, movement.authorUsername].join(" ").toLowerCase().includes(query),
      )
      .slice(0, 12);
  }, [isAdmin, managedGroupIds, movementSearch, movements]);

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    setBusy(true);
    try {
      await updateProfileSettings({
        id: profile.id,
        username,
        displayName,
      });
      if (newEmail && newEmail !== profile.email) {
        await updateEmail(newEmail);
        onToast("E-Mail-Änderung gespeichert. Je nach Supabase-Einstellung musst du sie bestätigen.");
      }
      if (newPassword) {
        await updatePassword(newPassword);
        setNewPassword("");
        onToast("Passwort aktualisiert.");
      }
      await onRefresh();
      onToast("Einstellungen gespeichert.");
    } catch (error) {
      onToast(error instanceof Error ? error.message : "Einstellungen konnten nicht gespeichert werden.");
    } finally {
      setBusy(false);
    }
  }

  async function requestDeletion() {
    if (!profile) return;
    setBusy(true);
    try {
      await requestAccountDeletion(profile.id);
      await onRefresh();
      onToast("Account-Löschung wurde vorgemerkt. Eine vollständige Auth-Löschung benötigt serverseitige Admin-Rechte.");
    } catch (error) {
      onToast(error instanceof Error ? error.message : "Löschanfrage konnte nicht gespeichert werden.");
    } finally {
      setBusy(false);
    }
  }

  async function reloadGroupAdmins() {
    if (!canUseManagement) return;
    setGroupAdmins(await fetchGroupAdmins(managedGroupIdList));
  }

  async function syncGroupAdmins(groupId: string) {
    if (!profile) return;
    const existing = groupAdmins.filter((admin) => admin.groupId === groupId);
    const selectedIds = new Set(selectedGroupAdmins.map((admin) => admin.id));
    const existingIds = new Set(existing.map((admin) => admin.userId));

    for (const admin of selectedGroupAdmins) {
      if (!existingIds.has(admin.id)) await addGroupAdmin(groupId, admin.id, profile.id);
    }
    for (const admin of existing) {
      if (!selectedIds.has(admin.userId)) await removeGroupAdmin(groupId, admin.userId);
    }
  }

  async function submitGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    if (!groupName.trim()) {
      onToast("Gruppenname darf nicht leer sein.");
      return;
    }
    if (groupCode.length !== 5) {
      onToast("Interne Gruppen brauchen genau 5 Zeichen Einladungscode.");
      return;
    }
    setBusy(true);
    try {
      const wasEditing = Boolean(editingGroupId);
      const logoUrl = groupLogoFile ? await uploadGroupLogo(profile.id, groupLogoFile) : groupLogoUrl;
      const payload = {
        id: editingGroupId,
        name: groupName,
        category: groupCategory || "Intern",
        icon: groupIcon,
        logoUrl,
        description: groupDescription,
        inviteCode: groupCode,
      };
      if (editingGroupId) {
        await updateGroup(payload);
        await syncGroupAdmins(editingGroupId);
      } else {
        const groupId = await createGroup({
          ...payload,
          scope: "internal",
          createdBy: profile.id,
        });
        await syncGroupAdmins(groupId);
      }
      resetGroupForm();
      await onRefresh();
      await reloadGroupAdmins();
      onToast(wasEditing ? "Gruppe aktualisiert." : "Gruppe erstellt.");
    } catch (error) {
      onToast(error instanceof Error ? error.message : "Gruppe konnte nicht erstellt werden.");
    } finally {
      setBusy(false);
    }
  }

  function resetGroupForm() {
    setGroupName("");
    setGroupCategory("");
    setGroupIcon("");
    setGroupDescription("");
    setGroupCode("");
    setGroupLogoUrl("");
    setGroupLogoFile(undefined);
    setEditingGroupId(undefined);
    setSelectedGroupAdmins([]);
    setGroupAdminSearch("");
    setGroupAdminResults([]);
    setGroupAdminNotice("");
  }

  function editGroup(group: Group) {
    setEditingGroupId(group.id);
    setGroupName(group.name);
    setGroupCategory(group.category);
    setGroupIcon(group.icon || "");
    setGroupDescription(group.description || "");
    setGroupCode((group.inviteCode || "").toUpperCase());
    setGroupLogoUrl(group.logoUrl || "");
    setGroupLogoFile(undefined);
    setSelectedGroupAdmins(
      groupAdmins
        .filter((admin) => admin.groupId === group.id)
        .map((admin) => ({
          id: admin.userId,
          email: admin.email,
          username: admin.username,
          displayName: admin.displayName,
          role: "user",
          avatarUrl: admin.avatarUrl,
        })),
    );
    setGroupAdminSearch("");
    setGroupAdminResults([]);
    setGroupAdminNotice("");
  }

  async function removeGroup(group: Group) {
    const isCitrus = group.name.toLowerCase().includes("citrus");
    const message = isCitrus
      ? "Citrus-Systemgruppe wirklich löschen? Das kann bestehende Beiträge betreffen."
      : "Diese Gruppe wirklich löschen? Bestehende Beiträge können dadurch betroffen sein.";
    if (!window.confirm(message)) return;
    setBusy(true);
    try {
      await deleteGroup(group.id);
      await onRefresh();
      onToast("Gruppe gelöscht.");
    } catch (error) {
      onToast(error instanceof Error ? error.message : "Gruppe konnte nicht gelöscht werden.");
    } finally {
      setBusy(false);
    }
  }

  async function changeMovementStatus(id: string, status: Movement["status"]) {
    if (!profile) return;
    setBusy(true);
    try {
      await updateMovementStatus(id, profile.id, status);
      await onRefresh();
      onToast("Status aktualisiert.");
    } catch (error) {
      onToast(error instanceof Error ? error.message : "Status konnte nicht gespeichert werden.");
    } finally {
      setBusy(false);
    }
  }

  async function removeMovement(id: string) {
    if (!window.confirm("Diesen Beitrag wirklich löschen?")) return;
    setBusy(true);
    try {
      await deleteMovement(id);
      await onRefresh();
      onToast("Beitrag gelöscht.");
    } catch (error) {
      onToast(error instanceof Error ? error.message : "Beitrag konnte nicht gelöscht werden.");
    } finally {
      setBusy(false);
    }
  }

  async function runUserSearch() {
    setBusy(true);
    try {
      setUserResults(await searchUsers(userSearch));
    } catch (error) {
      onToast(error instanceof Error ? error.message : "Nutzer konnten nicht geladen werden.");
    } finally {
      setBusy(false);
    }
  }

  async function runGroupAdminSearch(targetGroupId?: string) {
    const query = groupAdminSearch.trim();
    if (!query) return;
    setBusy(true);
    setGroupAdminNotice("");
    try {
      const results = targetGroupId
        ? await searchGroupAdminCandidates(query, targetGroupId)
        : await searchUsers(query);
      const selectedIds = new Set(selectedGroupAdmins.map((admin) => admin.id));
      const filtered = results.filter((result) => !selectedIds.has(result.id));
      setGroupAdminResults(filtered);
      setGroupAdminNotice(filtered.length ? "" : "Kein passender Nutzer gefunden.");
    } catch (error) {
      onToast(error instanceof Error ? error.message : "Nutzer konnten nicht geladen werden.");
    } finally {
      setBusy(false);
    }
  }

  function addSelectedGroupAdmin(item: AdminUserResult) {
    setSelectedGroupAdmins((current) => current.some((admin) => admin.id === item.id) ? current : [...current, item]);
    setGroupAdminResults((current) => current.filter((result) => result.id !== item.id));
    setGroupAdminNotice("");
  }

  function removeSelectedGroupAdmin(userId: string) {
    setSelectedGroupAdmins((current) => current.filter((admin) => admin.id !== userId));
  }

  async function removeMemberFromGroup(groupId: string, item: AdminUserResult) {
    if (!window.confirm("Nutzer aus dieser Gruppe entfernen?")) return;
    setBusy(true);
    try {
      await removeGroupMember(groupId, item.id);
      await removeGroupAdmin(groupId, item.id);
      await onRefresh();
      await reloadGroupAdmins();
      onToast("Nutzer aus Gruppe entfernt.");
    } catch (error) {
      onToast(error instanceof Error ? error.message : "Nutzer konnte nicht entfernt werden.");
    } finally {
      setBusy(false);
    }
  }


  async function removeUser(item: AdminUserResult, deletePosts: boolean) {
    const label = deletePosts ? "Nutzer anonymisieren und alle Beiträge löschen?" : "Nutzer anonymisieren und Beiträge behalten?";
    if (!window.confirm(label)) return;
    setBusy(true);
    try {
      if (deletePosts) await deleteUserMovements(item.id);
      await anonymizeUserProfile(item.id);
      setUserResults((current) => current.filter((userResult) => userResult.id !== item.id));
      await onRefresh();
      onToast(deletePosts ? "Nutzer anonymisiert und Beiträge gelöscht." : "Nutzer anonymisiert.");
    } catch (error) {
      onToast(error instanceof Error ? error.message : "Nutzer konnte nicht gelöscht werden.");
    } finally {
      setBusy(false);
    }
  }

  async function banUser(item: AdminUserResult) {
    if (!window.confirm("Diesen Nutzer sperren und aus aktiven Sessions blockieren?")) return;
    setBusy(true);
    try {
      await banUserProfile(item.id);
      setUserResults((current) => current.filter((userResult) => userResult.id !== item.id));
      await onRefresh();
      onToast("Nutzer gesperrt.");
    } catch (error) {
      onToast(error instanceof Error ? error.message : "Nutzer konnte nicht gesperrt werden.");
    } finally {
      setBusy(false);
    }
  }

  async function submitInviteCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inviteCode.length !== 5) {
      onToast("Bitte gib einen 5-stelligen Einladungscode ein.");
      return;
    }
    setBusy(true);
    try {
      await onJoinCode(inviteCode);
      setInviteCode("");
    } finally {
      setBusy(false);
    }
  }

  function startEdgeSwipe(event: PointerEvent<HTMLDivElement>) {
    if (event.clientX > 28) return;
    edgeSwipeStart.current = { x: event.clientX, y: event.clientY };
  }

  function moveEdgeSwipe(event: PointerEvent<HTMLDivElement>) {
    const start = edgeSwipeStart.current;
    if (!start) return;
    const deltaX = event.clientX - start.x;
    const deltaY = Math.abs(event.clientY - start.y);
    if (deltaX > 72 && deltaY < 54) {
      edgeSwipeStart.current = null;
      setSettingsOpen(false);
    }
  }

  function endEdgeSwipe() {
    edgeSwipeStart.current = null;
  }

  function renderGroupAdminPicker(targetGroupId?: string) {
    return (
      <div className="group-admin-picker">
        <label>
          Nutzer als Gruppenadmin suchen
          <div className="admin-search-row">
            <input value={groupAdminSearch} onChange={(event) => setGroupAdminSearch(event.target.value)} placeholder="Benutzername" />
            <button type="button" onClick={() => void runGroupAdminSearch(targetGroupId)} disabled={busy || !groupAdminSearch.trim()}>
              Suchen
            </button>
          </div>
        </label>
        {groupAdminNotice ? <small className="role-note">{groupAdminNotice}</small> : null}
        {groupAdminResults.length ? (
          <div className="admin-results compact-admin-results">
            {groupAdminResults.map((item) => (
              <article key={item.id}>
                <span>
                  <strong>{item.displayName || item.username || "Nutzer"}</strong>
                  <small>{item.username || item.email || "Ohne Benutzername"}</small>
                </span>
                <div className="admin-result-actions">
                  <button type="button" onClick={() => addSelectedGroupAdmin(item)} disabled={busy}>Hinzufügen</button>
                  {targetGroupId ? <button type="button" onClick={() => void removeMemberFromGroup(targetGroupId, item)} disabled={busy}>Aus Gruppe entfernen</button> : null}
                </div>
              </article>
            ))}
          </div>
        ) : null}
        <div className="selected-group-admins">
          {selectedGroupAdmins.length ? selectedGroupAdmins.map((admin) => (
            <span key={admin.id}>
              {admin.avatarUrl ? <img src={admin.avatarUrl} alt="" /> : null}
              <strong>{admin.displayName || admin.username || "Nutzer"}</strong>
              <button type="button" onClick={() => removeSelectedGroupAdmin(admin.id)} aria-label="Gruppenadmin entfernen">Entfernen</button>
            </span>
          )) : <small>Noch keine Gruppenadmins ausgewählt.</small>}
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="screen profile-reference-screen">
        <header className="profile-reference-header">
          <button className="profile-round-button" type="button" onClick={onPlus} aria-label="Beitrag erstellen">
            <Icon name="plus" size={25} />
          </button>
          <button className="profile-round-button" type="button" onClick={onAuth} aria-label="Einstellungen öffnen">
            <Icon name="settings" size={23} />
          </button>
          <h1>Dein Profil</h1>
        </header>
        <section className="profile-reference-hero guest-profile">
          <div className="profile-avatar-fallback">C</div>
          <div className="profile-identity">
            <h2>Gast</h2>
            <strong>Level 1</strong>
            <span>0 / 1.000 XP</span>
          </div>
        </section>
        <button className="primary-button" type="button" onClick={onAuth}>
          Konto erstellen oder einloggen
        </button>
      </div>
    );
  }

  if (isAuthenticated) {
    if (settingsOpen) {
      return (
        <SettingsScreen
          user={user}
          groups={groups}
          memberships={memberships}
          movements={movements}
          stats={stats}
          onBack={() => setSettingsOpen(false)}
          onOpenGroups={onOpenGroups}
          onOpenGroup={onOpenGroup}
          onJoinCode={onJoinCode}
          onLeaveGroup={onLeaveGroup}
          onReset={onReset}
          onToast={onToast}
          onAbmelden={onAbmelden}
          onRefresh={onRefresh}
        />
      );
    }

    if (settingsOpen) {
      return (
        <div
          className="screen profile-reference-screen profile-settings-screen"
          onPointerDown={startEdgeSwipe}
          onPointerMove={moveEdgeSwipe}
          onPointerUp={endEdgeSwipe}
          onPointerCancel={endEdgeSwipe}
        >
          <header className="profile-layer-header">
            <button className="profile-round-button" type="button" onClick={() => setSettingsOpen(false)} aria-label="Zurück zum Profil">
              <Icon name="chevronRight" size={23} />
            </button>
            <div>
              <span>Profil</span>
              <h1>Einstellungen</h1>
            </div>
          </header>

          <section className="settings-panel profile-reference-settings">
            <div className="profile-panel-heading">
              <span>
                <Icon name="settings" size={19} />
              </span>
              <div>
                <h2>Konto</h2>
                <p>Benutzername, E-Mail und Passwort</p>
              </div>
            </div>

            <form className="admin-form profile-reference-form" onSubmit={saveSettings}>
              <label>
                Benutzername
                <input value={username} onChange={(event) => setUsername(event.target.value)} required />
              </label>
              <label>
                Anzeigename
                <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required />
              </label>
              <label>
                E-Mail
                <input type="email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} />
              </label>
              <label>
                Neues Passwort
                <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={6} />
              </label>
              <button className="primary-button" type="submit" disabled={busy}>
                Einstellungen speichern
              </button>
            </form>
          </section>

          <section className="settings-panel profile-reference-settings-extra">
            <div className="profile-panel-heading">
              <span>
                <Icon name="rules" size={19} />
              </span>
              <div>
                <h2>Weitere Optionen</h2>
                <p>Gruppen, Regeln und lokale App-Optionen</p>
              </div>
            </div>
            <div className="profile-reference-actions">
              <button type="button" onClick={onOpenGroups}>
                <Icon name="groups" size={20} />
                <span>
                  <strong>Gruppen verwalten</strong>
                  <small>Gruppen ansehen, öffnen und Feed filtern</small>
                </span>
                <Icon name="chevronRight" size={18} />
              </button>
              <button type="button" onClick={() => onToast("Community-Regeln: sachlich, konkret, lösungsorientiert.")}>
                <Icon name="rules" size={20} />
                <span>
                  <strong>Datenschutz / Regeln / Impressum</strong>
                  <small>MVP-Informationen und Community-Regeln</small>
                </span>
                <Icon name="chevronRight" size={18} />
              </button>
              <button type="button" onClick={onAbmelden}>
                <Icon name="profile" size={20} />
                <span>
                  <strong>Abmelden</strong>
                  <small>Aktuelle Sitzung beenden</small>
                </span>
                <Icon name="chevronRight" size={18} />
              </button>
              <button type="button" onClick={requestDeletion} disabled={busy}>
                <Icon name="reset" size={20} />
                <span>
                  <strong>Account-Löschung vormerken</strong>
                  <small>Speichert die Löschanfrage am Profil</small>
                </span>
                <Icon name="chevronRight" size={18} />
              </button>
              <button type="button" onClick={onReset}>
                <Icon name="reset" size={20} />
                <span>
                  <strong>Lokales Onboarding zurücksetzen</strong>
                  <small>Setzt nur den lokalen Einstieg zurück</small>
                </span>
                <Icon name="chevronRight" size={18} />
              </button>
            </div>
          </section>

          {isAdmin ? (
            <section className="admin-panel profile-reference-admin">
              <button className="admin-toggle" type="button" onClick={() => setAdminOpen((value) => !value)}>
                <span>Verwaltung</span>
                <strong>{adminOpen ? "Schließen" : "Öffnen"}</strong>
              </button>
              {adminOpen ? (
                <div className="admin-stack">
                  <form className="admin-form profile-reference-form" onSubmit={submitGroup}>
                    <h3>Gruppen erstellen</h3>
                    <input value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="Name" required />
                    <input value={groupCategory} onChange={(event) => setGroupCategory(event.target.value)} placeholder="Kategorie" required />
                    <input value="Intern" readOnly aria-label="Gruppentyp" />
                    <textarea value={groupDescription} onChange={(event) => setGroupDescription(event.target.value)} placeholder="Beschreibung" rows={3} />
                    <label className="image-upload-field">
                      Profilbild
                      <input type="file" accept="image/png,image/jpeg,image/webp,image/avif" onChange={(event) => setGroupLogoFile(event.target.files?.[0])} />
                    </label>
                    <input
                      value={groupCode}
                      onChange={(event) => setGroupCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5))}
                      placeholder="5-stelliger Einladungscode"
                      maxLength={5}
                      required
                    />
                    <button className="primary-button" type="submit" disabled={busy}>
                      Gruppe erstellen
                    </button>
                  </form>

                  <div className="admin-form profile-reference-form">
                    <h3>Beiträge löschen</h3>
                    <input value={movementSearch} onChange={(event) => setMovementSearch(event.target.value)} placeholder="Titel, Nutzername oder Gruppe suchen" />
                    <div className="admin-results">
                      {movementResults.map((movement) => (
                        <article key={movement.id}>
                          <span>
                            <strong>{movement.title}</strong>
                            <small>{movement.groupName} · {movement.authorUsername || "Unbekannt"}</small>
                          </span>
                          <button type="button" onClick={() => removeMovement(movement.id)}>
                            Löschen
                          </button>
                        </article>
                      ))}
                    </div>
                  </div>

                  <div className="admin-form profile-reference-form">
                    <h3>Nutzer suchen</h3>
                    <div className="admin-search-row">
                      <input value={userSearch} onChange={(event) => setUserSearch(event.target.value)} placeholder="E-Mail oder Benutzername" />
                      <button type="button" onClick={runUserSearch} disabled={busy || !userSearch.trim()}>
                        Suchen
                      </button>
                    </div>
                    <div className="admin-results">
                      {userResults.map((item) => (
                        <article key={item.id}>
                          <span>
                            <strong>{item.displayName || item.username || "Nutzer"}</strong>
                            <small>{item.email} · {item.role}</small>
                          </span>
                        </article>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}
        </div>
      );
    }

    return (
      <div className="screen profile-reference-screen">
        <header className="profile-reference-header">
          <button className="profile-round-button" type="button" onClick={onPlus} aria-label="Beitrag erstellen">
            <Icon name="plus" size={25} />
          </button>
          <button
            className="profile-round-button"
            type="button"
            onClick={() => setSettingsOpen((value) => !value)}
            aria-label="Einstellungen öffnen"
          >
            <Icon name="settings" size={23} />
          </button>
          <h1>Dein Profil</h1>
        </header>

        <section className="profile-reference-hero">
          {profile?.avatarUrl ? (
            <img className="profile-reference-avatar" src={profile.avatarUrl} alt="" />
          ) : (
            <div className="profile-avatar-fallback">
              <span>{initialsFrom(user.name || user.username || "Citrus")}</span>
            </div>
          )}
          <div className="profile-identity">
            <h2>{profile?.displayName || user.name}</h2>
            <strong>Level {progress.level}</strong>
            <span>
              {progress.currentXp.toLocaleString("de-DE")} / {progress.nextLevelXp.toLocaleString("de-DE")} XP
            </span>
          </div>
        </section>

        <section className="profile-stat-card">
          <div>
            <strong>{formatCompactNumber(ownMovements.length)}</strong>
            <span>Ideen</span>
          </div>
          <div>
            <strong>{formatCompactNumber(receivedVotes + givenVotes)}</strong>
            <span>Stimmen</span>
          </div>
          <div>
            <strong>{formatCompactNumber(implementedProjects)}</strong>
            <span>Projekte</span>
          </div>
          <div>
            <strong>{formatCompactNumber(impact)}</strong>
            <span>Impact</span>
          </div>
        </section>

        <section className="profile-reference-section">
          <div className="profile-section-title">
            <h2>Aktuelle Aktivität</h2>
            <button type="button" onClick={() => setActivityExpanded((value) => !value)}>
              Alle anzeigen <Icon name="chevronRight" size={18} />
            </button>
          </div>
          <div className="profile-activity-card">
            {visibleActivities.length ? (
              visibleActivities.map((item) => (
                <button
                  className="profile-activity-row"
                  type="button"
                  key={item.id}
                  onClick={() => onOpenMovement(item.movement)}
                >
                  <span className="activity-avatar">{item.icon}</span>
                  <span>
                    <small>{item.label}</small>
                    <strong>{item.title}</strong>
                  </span>
                  <em>{formatRelativeTime(item.timestamp)}</em>
                </button>
              ))
            ) : (
              <div className="profile-empty-line">Noch keine echte Aktivität vorhanden.</div>
            )}
          </div>
        </section>

        <section className="profile-reference-section">
          <div className="profile-section-title">
            <h2>Deine Lieblings-Themen</h2>
            <button
              type="button"
              onClick={() => {
                setSettingsOpen(true);
                onToast("Eigene Interessenfelder existieren noch nicht. Themen werden aktuell aus deiner Aktivität abgeleitet.");
              }}
            >
              Bearbeiten <Icon name="chevronRight" size={18} />
            </button>
          </div>
          <div className="favorite-topic-chips">
            {favoriteTopics.length ? (
              favoriteTopics.map((topic) => (
                <span key={topic}>
                  {topic}
                  <Icon name="spark" size={17} />
                </span>
              ))
            ) : (
              <span>Keine Themen</span>
            )}
          </div>
        </section>

        <section className="profile-info-card">
          <div>
            <span>Mitglied seit</span>
            <strong>{formatMonthYear(profile?.createdAt)}</strong>
          </div>
          <div>
            <span>Dein Impact-Rang</span>
            <strong>{impactRank}</strong>
          </div>
          <div>
            <span>Verifizierungsstatus</span>
            <strong className={verifiedStatus === "Verifiziert" ? "verified" : ""}>
              {verifiedStatus}
              {verifiedStatus === "Verifiziert" ? <Icon name="checkCircle" size={19} /> : null}
            </strong>
          </div>
        </section>

        {settingsOpen ? (
          <section className="settings-panel">
            <h2>Einstellungen</h2>
            <form className="admin-form" onSubmit={saveSettings}>
              <label>
                Benutzername
                <input value={username} onChange={(event) => setUsername(event.target.value)} required />
              </label>
              <label>
                Anzeigename
                <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required />
              </label>
              <label>
                E-Mail
                <input type="email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} />
              </label>
              <label>
                Neues Passwort
                <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={6} />
              </label>
              <button className="primary-button" type="submit" disabled={busy}>
                Einstellungen speichern
              </button>
            </form>
            <button className="secondary-button full" type="button" onClick={onOpenGroups}>
              Gruppen verwalten
            </button>
            <button className="secondary-button full" type="button" onClick={onAbmelden}>
              Abmelden
            </button>
            <button className="reset-button" type="button" onClick={onReset}>
              Lokales Onboarding zurücksetzen
            </button>
          </section>
        ) : null}

        {settingsOpen ? (
          <section className="settings-panel profile-reference-settings-extra">
            <div className="profile-panel-heading">
              <span>
                <Icon name="rules" size={19} />
              </span>
              <div>
                <h2>Weitere Optionen</h2>
                <p>Alles, was vorher im Profil sichtbar war.</p>
              </div>
            </div>
            <div className="profile-reference-actions">
              <button type="button" onClick={() => onToast("Community-Regeln: sachlich, konkret, lösungsorientiert.")}>
                <Icon name="rules" size={20} />
                <span>
                  <strong>Datenschutz / Regeln / Impressum</strong>
                  <small>MVP-Informationen und Community-Regeln</small>
                </span>
                <Icon name="chevronRight" size={18} />
              </button>
              <button type="button" onClick={requestDeletion} disabled={busy}>
                <Icon name="reset" size={20} />
                <span>
                  <strong>Account-Löschung vormerken</strong>
                  <small>Speichert die Löschanfrage am Profil</small>
                </span>
                <Icon name="chevronRight" size={18} />
              </button>
            </div>
          </section>
        ) : null}

        <section className="membership-panel profile-reference-membership">
          <div className="profile-panel-heading">
            <span>
              <Icon name="groups" size={19} />
            </span>
            <div>
              <h2>Meine Gruppen</h2>
              <p>Interne Räume und Einladungscodes</p>
            </div>
          </div>

          <form className="invite-inline" onSubmit={submitInviteCode}>
            <input
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5))}
              placeholder="5-stelliger Code"
              maxLength={5}
            />
            <button type="submit" disabled={busy || inviteCode.length !== 5}>
              Beitreten
            </button>
          </form>

          {internalMemberships.length ? (
            <div className="membership-list">
              {internalMemberships.map((membership) => (
                <article className="membership-card" key={membership.id}>
                  <GroupVisual group={membership.group} className="group-avatar" />
                  <div>
                    <strong>{membership.group.name}</strong>
                    <small>
                      {membership.group.category} · {membershipRoleLabel(membership.role)} · seit{" "}
                      {membership.joinedAt
                        ? new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "short", year: "numeric" }).format(
                            new Date(membership.joinedAt),
                          )
                        : "heute"}
                    </small>
                    {membership.role === "admin" || membership.role === "group_admin" ? (
                      <small className="role-note">Admin-Mitgliedschaften können nicht direkt verlassen werden.</small>
                    ) : null}
                  </div>
                  <div className="membership-actions">
                    <button type="button" onClick={() => onOpenGroup(membership.groupId)}>
                      Öffnen
                    </button>
                    <button
                      type="button"
                      onClick={() => onLeaveGroup(membership)}
                      disabled={busy || membership.role === "admin" || membership.role === "group_admin"}
                    >
                      Verlassen
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="profile-empty-line">Noch keine interne Gruppe. Du kannst mit einem Code beitreten.</div>
          )}
        </section>

        {canUseManagement ? (
          <section className="admin-panel profile-reference-admin">
            <button className="admin-toggle" type="button" onClick={() => setAdminOpen((value) => !value)}>
              <span>Verwaltung</span>
              <strong>{adminOpen ? "Schließen" : "Öffnen"}</strong>
            </button>
            {adminOpen ? (
              <div className="admin-stack">
                {isAdmin && !editingGroupId ? (
                <form className="admin-form profile-reference-form" onSubmit={submitGroup}>
                  <h3>Gruppen erstellen</h3>
                  <input value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="Name" required />
                  <input value={groupCategory} onChange={(event) => setGroupCategory(event.target.value)} placeholder="Kategorie" required />
                    <input value="Intern" readOnly aria-label="Gruppentyp" />
                  <textarea value={groupDescription} onChange={(event) => setGroupDescription(event.target.value)} placeholder="Beschreibung" rows={3} />
                  <label className="image-upload-field">
                    Profilbild
                    <input type="file" accept="image/png,image/jpeg,image/webp,image/avif" onChange={(event) => setGroupLogoFile(event.target.files?.[0])} />
                  </label>
                    <input
                      value={groupCode}
                      onChange={(event) => setGroupCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5))}
                      placeholder="5-stelliger Einladungscode"
                      maxLength={5}
                      required
                    />
                  {renderGroupAdminPicker()}
                  <button className="primary-button" type="submit" disabled={busy}>
                    Gruppe erstellen
                  </button>
                </form>
                ) : null}

                <div className="admin-form profile-reference-form">
                  <h3>Gruppen verwalten</h3>
                  <div className="admin-results group-admin-results">
                    {manageableGroups.map((group) => (
                      <article key={group.id}>
                        <GroupVisual group={group} className="group-avatar" />
                        <span>
                          <strong>{group.name}</strong>
                          <small>{group.category} · Code {group.inviteCode || "fehlt"}</small>
                        </span>
                        <div className="admin-result-actions">
                          <button type="button" onClick={() => editGroup(group)} disabled={busy}>Bearbeiten</button>
                          {isAdmin ? <button type="button" onClick={() => removeGroup(group)} disabled={busy}>Löschen</button> : null}
                        </div>
                        {editingGroupId === group.id ? (
                          <form className="admin-form profile-reference-form inline-group-edit" onSubmit={submitGroup}>
                            <h3>Gruppe bearbeiten</h3>
                            <input value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="Name" required />
                            <input value={groupCategory} onChange={(event) => setGroupCategory(event.target.value)} placeholder="Kategorie" required />
                            <input value="Intern" readOnly aria-label="Gruppentyp" />
                            <textarea value={groupDescription} onChange={(event) => setGroupDescription(event.target.value)} placeholder="Beschreibung" rows={3} />
                            <label className="image-upload-field">
                              Profilbild
                              <input type="file" accept="image/png,image/jpeg,image/webp,image/avif" onChange={(event) => setGroupLogoFile(event.target.files?.[0])} />
                            </label>
                            <input
                              value={groupCode}
                              onChange={(event) => setGroupCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5))}
                              placeholder="5-stelliger Einladungscode"
                              maxLength={5}
                              required
                            />
                            {renderGroupAdminPicker(group.id)}
                            <button className="primary-button" type="submit" disabled={busy}>
                              Änderungen speichern
                            </button>
                            <button className="secondary-button full" type="button" onClick={resetGroupForm}>
                              Abbrechen
                            </button>
                          </form>
                        ) : null}
                      </article>
                    ))}
                  </div>
                </div>

                <div className="admin-form profile-reference-form">
                  <h3>Beiträge löschen</h3>
                  <input value={movementSearch} onChange={(event) => setMovementSearch(event.target.value)} placeholder="Titel, Nutzername oder Gruppe suchen" />
                  <div className="admin-results">
                    {movementResults.map((movement) => (
                      <article key={movement.id}>
                        <span>
                          <strong>{movement.title}</strong>
                          <span className="admin-result-actions">
                            <button type="button" onClick={() => onOpenMovement(movement)}>Öffnen</button>
                            <select value={movement.status} onChange={(event) => changeMovementStatus(movement.id, event.target.value as Movement["status"])} disabled={busy}>
                              {statusOptions.map((status) => <option value={status} key={status}>{statusLabels[status]}</option>)}
                            </select>
                          </span>
                          <small>{movement.groupName} · {movement.authorUsername || "Unbekannt"}</small>
                        </span>
                        <button type="button" onClick={() => removeMovement(movement.id)}>
                          Löschen
                        </button>
                      </article>
                    ))}
                  </div>
                </div>

                <div className="admin-form profile-reference-form">
                  <h3>Nutzer suchen</h3>
                  <div className="admin-search-row">
                    <input value={userSearch} onChange={(event) => setUserSearch(event.target.value)} placeholder="E-Mail oder Benutzername" />
                    <button type="button" onClick={runUserSearch} disabled={busy || !userSearch.trim()}>
                      Suchen
                    </button>
                  </div>
                  <div className="admin-results">
                    {userResults.map((item) => (
                      <article key={item.id}>
                        <span>
                          <strong>{item.displayName || item.username || "Nutzer"}</strong>
                          <small>{item.email} · {item.role}</small>
                        </span>
                        <div className="admin-result-actions">
                          <button type="button" onClick={() => banUser(item)} disabled={busy}>Sperren</button>
                          <button type="button" onClick={() => removeUser(item, false)} disabled={busy}>Anonymisieren</button>
                          <button type="button" onClick={() => removeUser(item, true)} disabled={busy}>Nutzer + Beiträge löschen</button>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="screen stack">
        <section className="profile-hero guest-profile">
          <div className="avatar-large">C</div>
          <div>
            <span className="eyebrow">Gastmodus</span>
            <h1>Willkommen bei Citrus</h1>
            <p>Du kannst lesen, suchen und beginnen. Zum Speichern meldest du dich kurz an.</p>
          </div>
        </section>
        <button className="primary-button" type="button" onClick={onAuth}>
          Konto erstellen oder einloggen
        </button>
        <div className="profile-actions">
          <button type="button" onClick={onOpenGroups}>
            <Icon name="groups" size={20} />
            <span>
              <strong>Gruppen ansehen</strong>
              <small>Interne Räume und Einladungscodes</small>
            </span>
          </button>
          <button type="button" onClick={() => onToast("Community-Regeln: sachlich, konkret, lösungsorientiert.")}>
            <Icon name="rules" size={20} />
            <span>
              <strong>Community-Regeln</strong>
              <small>Klar, respektvoll, lösungsorientiert</small>
            </span>
          </button>
        </div>
        <button className="reset-button" type="button" onClick={onReset}>
          <Icon name="reset" size={18} />
          Lokales Onboarding zurücksetzen
        </button>
      </div>
    );
  }

  return (
    <div className="screen stack">
      <section className="profile-hero">
        <div className="avatar-large">{user.avatarInitials}</div>
        <div>
          <span className="eyebrow">{isAdmin ? "Admin Profil" : "Profil"}</span>
          <h1>{user.name}</h1>
          <p>{user.email}</p>
        </div>
      </section>

      <div className="profile-actions">
        <button type="button" onClick={onOpenGroups}>
          <Icon name="groups" size={20} />
          <span>
            <strong>Gruppen</strong>
            <small>{Math.max(userGroups.length, stats.activeGroups)} aktive Kontexte</small>
          </span>
        </button>
        <button type="button" onClick={() => setSettingsOpen((value) => !value)}>
          <Icon name="settings" size={20} />
          <span>
            <strong>Einstellungen</strong>
            <small>Benutzername, E-Mail, Passwort</small>
          </span>
        </button>
        <button type="button" onClick={() => onToast("Community-Regeln: sachlich, konkret, lösungsorientiert.")}>
          <Icon name="rules" size={20} />
          <span>
            <strong>Datenschutz / Regeln / Impressum</strong>
            <small>MVP-Informationen und Community-Regeln</small>
          </span>
        </button>
      </div>

      <section className="membership-panel">
        <SectionTitle title="Meine Gruppen" />
        <form className="invite-inline" onSubmit={submitInviteCode}>
          <input
            value={inviteCode}
            onChange={(event) => setInviteCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5))}
            placeholder="5-stelliger Code"
            maxLength={5}
          />
          <button type="submit" disabled={busy || inviteCode.length !== 5}>
            Beitreten
          </button>
        </form>
        {internalMemberships.length ? (
          <div className="membership-list">
            {internalMemberships.map((membership) => (
              <article className="membership-card" key={membership.id}>
                <GroupVisual group={membership.group} className="group-avatar" />
                <div>
                  <strong>{membership.group.name}</strong>
                  <small>
                    {membership.group.category} · {membershipRoleLabel(membership.role)} · seit{" "}
                    {membership.joinedAt
                      ? new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "short", year: "numeric" }).format(
                          new Date(membership.joinedAt),
                        )
                      : "heute"}
                  </small>
                  {membership.role === "admin" || membership.role === "group_admin" ? (
                    <small className="role-note">Admin-Mitgliedschaften können nicht direkt verlassen werden.</small>
                  ) : null}
                </div>
                <div className="membership-actions">
                  <button type="button" onClick={() => onOpenGroup(membership.groupId)}>
                    Öffnen
                  </button>
                  <button
                    type="button"
                    onClick={() => onLeaveGroup(membership)}
                    disabled={busy || membership.role === "admin" || membership.role === "group_admin"}
                  >
                    Verlassen
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state compact-empty">
            <strong>Keine interne Gruppe.</strong>
            <span>Mit einem Einladungscode kannst du einem internen Raum beitreten.</span>
          </div>
        )}
      </section>

      {settingsOpen ? (
        <section className="settings-panel">
          <h2>Einstellungen</h2>
          <form className="admin-form" onSubmit={saveSettings}>
            <label>
              Benutzername
              <input value={username} onChange={(event) => setUsername(event.target.value)} required />
            </label>
            <label>
              Anzeigename
              <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required />
            </label>
            <label>
              E-Mail
              <input type="email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} />
              <small>E-Mail-Änderungen können je nach Supabase-Einstellung eine Bestätigungsmail auslösen.</small>
            </label>
            <label>
              Neues Passwort
              <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={6} />
            </label>
            <button className="primary-button" type="submit" disabled={busy}>
              Einstellungen speichern
            </button>
          </form>
          <button className="secondary-button full" type="button" onClick={onAbmelden}>
            Abmelden
          </button>
          <button className="reset-button" type="button" onClick={requestDeletion} disabled={busy}>
            Account-Löschung vormerken
          </button>
          <button className="reset-button" type="button" onClick={onReset}>
            Lokales Onboarding zurücksetzen
          </button>
        </section>
      ) : null}

      {isAdmin ? (
        <section className="admin-panel">
          <button className="admin-toggle" type="button" onClick={() => setAdminOpen((value) => !value)}>
            Verwaltung
            <span>{adminOpen ? "Schließen" : "Öffnen"}</span>
          </button>
          {adminOpen ? (
            <div className="admin-stack">
              <form className="admin-form" onSubmit={submitGroup}>
                <h3>Gruppen erstellen</h3>
                <input value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="Name" required />
                <input value={groupCategory} onChange={(event) => setGroupCategory(event.target.value)} placeholder="Kategorie" required />
                <input value="Intern" readOnly aria-label="Gruppentyp" />
                <textarea value={groupDescription} onChange={(event) => setGroupDescription(event.target.value)} placeholder="Beschreibung" rows={3} />
                <label className="image-upload-field">
                  Profilbild
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/avif" onChange={(event) => setGroupLogoFile(event.target.files?.[0])} />
                </label>
                <input
                  value={groupCode}
                  onChange={(event) => setGroupCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5))}
                  placeholder="5-stelliger Einladungscode"
                  maxLength={5}
                  required
                />
                <button className="primary-button" type="submit" disabled={busy}>
                  Gruppe erstellen
                </button>
              </form>

              <div className="admin-form">
                <h3>Beiträge löschen</h3>
                <input value={movementSearch} onChange={(event) => setMovementSearch(event.target.value)} placeholder="Titel, Nutzername oder Gruppe suchen" />
                <div className="admin-results">
                  {movementResults.map((movement) => (
                    <article key={movement.id}>
                      <span>
                        <strong>{movement.title}</strong>
                        <small>{movement.groupName} · {movement.authorUsername || "Unbekannt"}</small>
                      </span>
                      <button type="button" onClick={() => removeMovement(movement.id)}>
                        Löschen
                      </button>
                    </article>
                  ))}
                </div>
              </div>

              <div className="admin-form">
                <h3>Nutzer suchen</h3>
                <div className="admin-search-row">
                  <input value={userSearch} onChange={(event) => setUserSearch(event.target.value)} placeholder="E-Mail oder Benutzername" />
                  <button type="button" onClick={runUserSearch} disabled={busy || !userSearch.trim()}>
                    Suchen
                  </button>
                </div>
                <div className="admin-results">
                  {userResults.map((item) => (
                    <article key={item.id}>
                      <span>
                        <strong>{item.displayName || item.username || "Nutzer"}</strong>
                        <small>{item.email} · {item.role}</small>
                      </span>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <section>
        <div className="profile-group-preview">
          {(userGroups.length ? userGroups : groups.slice(0, 4)).slice(0, 4).map((group) => (
            <span key={group.id}>{group.name}</span>
          ))}
        </div>
      </section>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="section-header">
      <h2>{title}</h2>
    </div>
  );
}
