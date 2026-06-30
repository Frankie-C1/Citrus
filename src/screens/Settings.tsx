import { useEffect, useMemo, useRef, useState, type FormEvent, type PointerEvent, type ReactNode } from "react";
import { useAuth } from "../auth/AuthProvider";
import { Icon } from "../components/Icon";
import { GroupVisual } from "../components/GroupVisual";
import { getWebPushSupportMessage, registerForPushNotifications } from "../lib/pushNotifications";
import {
  createFeedback,
  fetchModerationSummary,
  fetchSettingsBundle,
  requestAccountDeletion,
  saveNotificationPreferences,
  saveUserInterests,
  saveUserSettings,
  updateProfileSettings,
  uploadProfileAvatar,
} from "../data/queries";
import type {
  FeedPreferences,
  Group,
  GroupMembership,
  ModerationSummary,
  Movement,
  NotificationFrequency,
  NotificationPreferences,
  ThemePreference,
  User,
  UserSettings,
  UserStats,
} from "../types";

type SettingsScreenProps = {
  user: User;
  groups: Group[];
  memberships: GroupMembership[];
  movements: Movement[];
  stats: UserStats;
  onBack: () => void;
  onOpenGroups: () => void;
  onOpenGroup: (groupId: string) => void;
  onJoinCode: (code: string) => Promise<void> | void;
  onLeaveGroup: (membership: GroupMembership) => Promise<void> | void;
  onReset: () => void;
  onToast: (message: string) => void;
  onAbmelden: () => void;
  onRefresh: () => Promise<void>;
};

type SettingsPane =
  | "main"
  | "editProfile"
  | "username"
  | "email"
  | "password"
  | "deleteAccount"
  | "notifications"
  | "interests"
  | "feed"
  | "appearance"
  | "privacy"
  | "security"
  | "groups"
  | "impact"
  | "moderation"
  | "info"
  | "feedback"
  | "about"
  | "changelog"
  | "privacyText"
  | "terms";

const frequencyOptions: Array<{ value: NotificationFrequency; label: string }> = [
  { value: "off", label: "Aus" },
  { value: "daily", label: "Einmal täglich" },
  { value: "instant", label: "Jederzeit" },
];

const fallbackCategories = ["Mobilität", "Bildung", "Wohnen", "Umwelt", "Digitalisierung", "Gesundheit", "Sicherheit", "Freizeit"];

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

const defaultNotificationPreferences: NotificationPreferences = {
  newGroupPosts: "daily",
  ownPostSupport: "instant",
  supportedUpdates: "daily",
  groupTrending: "daily",
  implementedProjects: "instant",
  groupIds: [],
};

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

function compactNumber(value: number) {
  if (value >= 1000) return `${new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 }).format(value / 1000)}k`;
  return value.toLocaleString("de-DE");
}

function applyTheme(theme: ThemePreference) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  localStorage.setItem("citrus:theme", theme);
}

async function compressAvatar(file: File): Promise<{ blob: Blob; extension: "avif" | "webp" }> {
  if (!file.type.startsWith("image/")) throw new Error("Bitte wähle eine Bilddatei.");
  const bitmap = await createImageBitmap(file);
  const maxSize = 320;
  const scale = Math.min(1, maxSize / bitmap.width, maxSize / bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Profilfoto konnte nicht verarbeitet werden.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const toBlob = (type: string, quality: number) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob((blob) => resolve(blob), type, quality));
  const avif = await toBlob("image/avif", 0.42);
  if (avif) return { blob: avif, extension: "avif" };
  const webp = await toBlob("image/webp", 0.62);
  if (webp) return { blob: webp, extension: "webp" };
  throw new Error("Dieser Browser kann das Profilfoto nicht komprimieren.");
}

function settingTitle(pane: SettingsPane) {
  const titles: Record<SettingsPane, string> = {
    main: "Einstellungen",
    editProfile: "Profil bearbeiten",
    username: "Benutzername",
    email: "E-Mail ändern",
    password: "Passwort ändern",
    deleteAccount: "Account löschen",
    notifications: "Benachrichtigungen",
    interests: "Interessen",
    feed: "Feed",
    appearance: "Darstellung",
    privacy: "Datenschutz",
    security: "Sicherheit",
    groups: "Gruppen",
    impact: "Impact",
    moderation: "Moderation",
    info: "Info",
    feedback: "Feedback",
    about: "Über Citrus",
    changelog: "Changelog",
    privacyText: "Datenschutz",
    terms: "Nutzungsbedingungen",
  };
  return titles[pane];
}

export function SettingsScreen({
  user,
  groups,
  memberships,
  movements,
  stats,
  onBack,
  onOpenGroups,
  onOpenGroup,
  onJoinCode,
  onLeaveGroup,
  onReset,
  onToast,
  onAbmelden,
  onRefresh,
}: SettingsScreenProps) {
  const { authUser, profile, updateEmail, updatePassword, signOutEverywhere } = useAuth();
  const [pane, setPane] = useState<SettingsPane>("main");
  const [userSettings, setUserSettings] = useState<UserSettings>(defaultUserSettings);
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>(defaultNotificationPreferences);
  const [interests, setInterests] = useState<string[]>([]);
  const [moderation, setModeration] = useState<ModerationSummary>({ blockedUsers: [], reportedContents: [], ownReports: [] });
  const [username, setUsername] = useState(profile?.username ?? user.username ?? "");
  const [displayName, setDisplayName] = useState(profile?.displayName ?? user.name);
  const [avatarFile, setAvatarFile] = useState<File | undefined>();
  const [avatarPreview, setAvatarPreview] = useState("");
  const [email, setEmail] = useState(user.email ?? "");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [feedbackSubject, setFeedbackSubject] = useState("");
  const [feedbackBody, setFeedbackBody] = useState("");
  const [busy, setBusy] = useState(false);
  const edgeSwipeStart = useRef<{ x: number; y: number } | null>(null);
  const pushSupportMessage = getWebPushSupportMessage();

  const ownMovements = useMemo(() => movements.filter((movement) => movement.userId === user.id), [movements, user.id]);
  const supportedMovements = useMemo(() => movements.filter((movement) => movement.supportedByUser), [movements]);
  const relevantMovements = useMemo(
    () => [...new Map([...ownMovements, ...supportedMovements].map((movement) => [movement.id, movement])).values()],
    [ownMovements, supportedMovements],
  );
  const receivedVotes = ownMovements.reduce((sum, movement) => sum + movement.supporters, 0);
  const categoryOptions = useMemo(() => {
    const fromMovements = [...new Set(movements.map((movement) => movement.category).filter(Boolean))];
    return fromMovements.length ? fromMovements.sort((a, b) => a.localeCompare(b, "de")) : fallbackCategories;
  }, [movements]);
  const selectableGroups = useMemo(() => {
    const ids = new Set([
      ...memberships.map((membership) => membership.groupId),
      ...movements.filter((movement) => movement.supportedByUser || movement.userId === user.id).map((movement) => movement.groupId),
    ]);
    return groups.filter((group) => ids.has(group.id));
  }, [groups, memberships, movements, user.id]);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview("");
      return;
    }
    const url = URL.createObjectURL(avatarFile);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  useEffect(() => {
    const scroller = document.querySelector(".screen-content");
    scroller?.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pane]);

  useEffect(() => {
    if (!authUser) return;
    let cancelled = false;
    fetchSettingsBundle(authUser.id)
      .then((bundle) => {
        if (cancelled) return;
        setUserSettings(bundle.userSettings);
        setNotificationPreferences(bundle.notificationPreferences);
        setInterests(bundle.interests);
        applyTheme(bundle.userSettings.theme);
      })
      .catch((error) => onToast(error instanceof Error ? error.message : "Einstellungen konnten nicht geladen werden."));
    fetchModerationSummary(authUser.id)
      .then((summary) => {
        if (!cancelled) setModeration(summary);
      })
      .catch(() => {
        if (!cancelled) setModeration({ blockedUsers: [], reportedContents: [], ownReports: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [authUser, onToast]);

  function goBack() {
    if (pane !== "main") {
      setPane("main");
      return;
    }
    onBack();
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
      goBack();
    }
  }

  function endEdgeSwipe() {
    edgeSwipeStart.current = null;
  }

  async function persistUserSettings(next: UserSettings, message = "Einstellungen gespeichert.") {
    if (!authUser) return;
    setUserSettings(next);
    applyTheme(next.theme);
    try {
      await saveUserSettings(authUser.id, next);
      onToast(message);
    } catch (error) {
      onToast(error instanceof Error ? error.message : "Einstellungen konnten nicht gespeichert werden.");
    }
  }

  async function updateFeedPreference(key: keyof FeedPreferences, value: boolean) {
    await persistUserSettings({
      ...userSettings,
      feedPreferences: { ...userSettings.feedPreferences, [key]: value },
    });
  }

  async function updateNotifications(next: NotificationPreferences) {
    if (!authUser) return;
    setNotificationPreferences(next);
    try {
      await saveNotificationPreferences(authUser.id, next);
      onToast("Benachrichtigungen gespeichert.");
    } catch (error) {
      onToast(error instanceof Error ? error.message : "Benachrichtigungen konnten nicht gespeichert werden.");
    }
  }

  async function enablePushNotifications() {
    if (!authUser) return;
    const supportMessage = getWebPushSupportMessage();
    if (supportMessage) {
      onToast(supportMessage);
      return;
    }
    setBusy(true);
    try {
      await registerForPushNotifications(authUser.id);
      onToast("Push-Benachrichtigungen aktiviert.");
      await onRefresh();
    } catch (error) {
      onToast(error instanceof Error ? error.message : "Push konnte nicht aktiviert werden.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleInterest(category: string) {
    if (!authUser) return;
    const next = interests.includes(category) ? interests.filter((item) => item !== category) : [...interests, category];
    setInterests(next);
    try {
      await saveUserInterests(authUser.id, next);
      onToast("Interessen gespeichert.");
    } catch (error) {
      onToast(error instanceof Error ? error.message : "Interessen konnten nicht gespeichert werden.");
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    setBusy(true);
    try {
      let avatarUrl: string | undefined;
      if (avatarFile) {
        const compressed = await compressAvatar(avatarFile);
        avatarUrl = await uploadProfileAvatar(profile.id, compressed.blob, compressed.extension);
      }
      await updateProfileSettings({ id: profile.id, username, displayName, avatarUrl });
      setAvatarFile(undefined);
      await onRefresh();
      onToast("Profil gespeichert.");
      setPane("main");
    } catch (error) {
      onToast(error instanceof Error ? error.message : "Profil konnte nicht gespeichert werden.");
    } finally {
      setBusy(false);
    }
  }

  async function saveEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      await updateEmail(email);
      await onRefresh();
      onToast("E-Mail-Änderung gespeichert. Je nach Supabase-Einstellung musst du sie bestätigen.");
      setPane("main");
    } catch (error) {
      onToast(error instanceof Error ? error.message : "E-Mail konnte nicht gespeichert werden.");
    } finally {
      setBusy(false);
    }
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      await updatePassword(password);
      setPassword("");
      onToast("Passwort aktualisiert.");
      setPane("main");
    } catch (error) {
      onToast(error instanceof Error ? error.message : "Passwort konnte nicht gespeichert werden.");
    } finally {
      setBusy(false);
    }
  }

  async function requestDeletion() {
    if (!authUser) return;
    if (!window.confirm("Account-Löschung vormerken?\nDein Profil wird anonymisiert und für die Löschung markiert.")) return;
    setBusy(true);
    try {
      await requestAccountDeletion(authUser.id);
      await onRefresh();
      onToast("Account-Löschung wurde vorgemerkt.");
      setPane("main");
    } catch (error) {
      onToast(error instanceof Error ? error.message : "Löschanfrage konnte nicht gespeichert werden.");
    } finally {
      setBusy(false);
    }
  }

  async function leaveAllDevices() {
    if (!window.confirm("Wirklich auf allen Geräten abmelden?")) return;
    setBusy(true);
    try {
      await signOutEverywhere();
      onToast("Du wurdest auf allen Geräten abgemeldet.");
      onAbmelden();
    } catch (error) {
      onToast(error instanceof Error ? error.message : "Abmelden auf allen Geräten ist fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  async function joinCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inviteCode.length !== 5) return;
    setBusy(true);
    try {
      await onJoinCode(inviteCode);
      setInviteCode("");
      onToast("Gruppe beigetreten.");
    } finally {
      setBusy(false);
    }
  }

  async function submitFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authUser) return;
    setBusy(true);
    try {
      await createFeedback(authUser.id, { subject: feedbackSubject, body: feedbackBody });
      setFeedbackSubject("");
      setFeedbackBody("");
      onToast("Feedback gespeichert. Danke!");
      setPane("info");
    } catch (error) {
      onToast(error instanceof Error ? error.message : "Feedback konnte nicht gespeichert werden.");
    } finally {
      setBusy(false);
    }
  }

  const headerTitle = settingTitle(pane);

  return (
    <div
      className={`screen profile-reference-screen settings-layer ${pane === "main" ? "settings-layer-main" : "settings-layer-detail"}`}
      onPointerDown={startEdgeSwipe}
      onPointerMove={moveEdgeSwipe}
      onPointerUp={endEdgeSwipe}
      onPointerCancel={endEdgeSwipe}
    >
      <header className="profile-layer-header">
        <button className="profile-round-button" type="button" onClick={goBack} aria-label="Zurück">
          <Icon name="chevronRight" size={23} />
        </button>
        <div>
          <span>{pane === "main" ? "Profil" : "Einstellungen"}</span>
          <h1>{headerTitle}</h1>
        </div>
      </header>

      {pane === "main" ? (
        <>
          <section className="settings-profile-card">
            {profile?.avatarUrl ? (
              <img src={profile.avatarUrl} alt="" />
            ) : (
              <div>{initialsFrom(displayName || username || "Citrus")}</div>
            )}
            <span>
              <strong>{displayName || user.name}</strong>
              <small>Level {Math.max(1, Math.floor((stats.reached + receivedVotes) / 1000) + 1)} · {compactNumber(stats.reached)} Impact</small>
            </span>
            <button type="button" onClick={() => setPane("editProfile")}>Profil bearbeiten</button>
          </section>

          <SettingsSection title="Konto">
            <SettingsItem title="Profil bearbeiten" detail="Name und Anzeige" onClick={() => setPane("editProfile")} />
            <SettingsItem title="Benutzername ändern" detail={`@${username || "citrus"}`} onClick={() => setPane("username")} />
            <SettingsItem title="E-Mail ändern" detail={email || "Keine E-Mail"} onClick={() => setPane("email")} />
            <SettingsItem title="Passwort ändern" detail="Supabase Auth" onClick={() => setPane("password")} />
            <SettingsItem title="Account löschen" detail="Mit Bestätigung" danger onClick={() => setPane("deleteAccount")} />
          </SettingsSection>

          <SettingsSection title="Benachrichtigungen">
            <SettingsItem title="Push- und In-App-Benachrichtigungen" detail="Gruppen, Unterstützung, Updates" onClick={() => setPane("notifications")} />
          </SettingsSection>

          <SettingsSection title="Personalisierung">
            <SettingsItem title="Interessen" detail={interests.length ? `${interests.length} ausgewählt` : "Noch keine Auswahl"} onClick={() => setPane("interests")} />
            <SettingsItem title="Feed-Einstellungen" detail="Priorisierung und Sortierung" onClick={() => setPane("feed")} />
            <SettingsItem title="Darstellung" detail={themeLabel(userSettings.theme)} onClick={() => setPane("appearance")} />
          </SettingsSection>

          <SettingsSection title="Privatsphäre & Sicherheit">
            <SettingsItem title="Datenschutz" detail={userSettings.privacyVisibility === "anonymous" ? "Anonym" : "Sichtbar"} onClick={() => setPane("privacy")} />
            <SettingsItem title="Sicherheit" detail="Alle Geräte abmelden" onClick={() => setPane("security")} />
          </SettingsSection>

          <SettingsSection title="Citrus">
            <SettingsItem title="Gruppen" detail={`${selectableGroups.length} relevante Gruppen`} onClick={() => setPane("groups")} />
            <SettingsItem title="Impact & Statistik" detail={`${compactNumber(stats.reached)} Impact`} onClick={() => setPane("impact")} />
            <SettingsItem title="Moderation" detail="Blockierte Nutzer und Meldungen" onClick={() => setPane("moderation")} />
            <SettingsItem title="Info" detail="Über Citrus, Feedback, Rechtliches" onClick={() => setPane("info")} />
          </SettingsSection>
        </>
      ) : null}

      {pane === "editProfile" || pane === "username" ? (
        <SettingsCard>
          <form className="settings-form" onSubmit={saveProfile}>
            <label className="settings-avatar-upload">
              <span>Profilfoto</span>
              <div>
                {avatarPreview || profile?.avatarUrl ? (
                  <img src={avatarPreview || profile?.avatarUrl || ""} alt="" />
                ) : (
                  <strong>{initialsFrom(displayName || username || "Citrus")}</strong>
                )}
                <small>{avatarFile ? avatarFile.name : "Kleines Foto auswählen"}</small>
              </div>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/avif"
                onChange={(event) => setAvatarFile(event.target.files?.[0])}
              />
            </label>
            <label>
              Anzeigename
              <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required />
            </label>
            <label>
              Benutzername
              <input value={username} onChange={(event) => setUsername(event.target.value)} required />
            </label>
            <button className="primary-button" type="submit" disabled={busy}>Speichern</button>
          </form>
        </SettingsCard>
      ) : null}

      {pane === "email" ? (
        <SettingsCard>
          <form className="settings-form" onSubmit={saveEmail}>
            <label>
              Neue E-Mail
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
              <small>Supabase kann dafür eine Bestätigungsmail senden.</small>
            </label>
            <button className="primary-button" type="submit" disabled={busy}>E-Mail speichern</button>
          </form>
        </SettingsCard>
      ) : null}

      {pane === "password" ? (
        <SettingsCard>
          <form className="settings-form" onSubmit={savePassword}>
            <label>
              Neues Passwort
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} required />
            </label>
            <button className="primary-button" type="submit" disabled={busy}>Passwort speichern</button>
          </form>
        </SettingsCard>
      ) : null}

      {pane === "deleteAccount" ? (
        <SettingsCard>
          <p className="settings-copy">Clientseitig wird dein Profil anonymisiert und eine Löschanfrage gespeichert. Die endgültige Auth-Löschung braucht serverseitige Admin-Rechte.</p>
          <button className="settings-danger-button" type="button" onClick={requestDeletion} disabled={busy}>Account-Löschung vormerken</button>
        </SettingsCard>
      ) : null}

      {pane === "notifications" ? (
        <>
          <SettingsCard>
            <button className="secondary-button full" type="button" onClick={enablePushNotifications} disabled={busy}>
              Push-Benachrichtigungen aktivieren
            </button>
            <FrequencyRow label="Neue Beiträge in ausgewählten Gruppen" value={notificationPreferences.newGroupPosts} onChange={(value) => updateNotifications({ ...notificationPreferences, newGroupPosts: value })} />
            <FrequencyRow label="Neue Unterstützungen auf eigene Beiträge" value={notificationPreferences.ownPostSupport} onChange={(value) => updateNotifications({ ...notificationPreferences, ownPostSupport: value })} />
            <FrequencyRow label="Wichtige Updates zu unterstützten Beiträgen" value={notificationPreferences.supportedUpdates} onChange={(value) => updateNotifications({ ...notificationPreferences, supportedUpdates: value })} />
            <FrequencyRow label="Trending-Hinweise für relevante Gruppen" value={notificationPreferences.groupTrending} onChange={(value) => updateNotifications({ ...notificationPreferences, groupTrending: value })} />
            <FrequencyRow label="Umgesetzte Projekte/Statusänderungen" value={notificationPreferences.implementedProjects} onChange={(value) => updateNotifications({ ...notificationPreferences, implementedProjects: value })} />
          </SettingsCard>
          <SettingsSection title="Gruppen auswählen">
            {selectableGroups.length ? selectableGroups.map((group) => (
              <ToggleItem
                key={group.id}
                title={group.name}
                detail={group.category}
                checked={notificationPreferences.groupIds.includes(group.id)}
                onChange={(checked) =>
                  updateNotifications({
                    ...notificationPreferences,
                    groupIds: checked
                      ? [...notificationPreferences.groupIds, group.id]
                      : notificationPreferences.groupIds.filter((id) => id !== group.id),
                  })
                }
              />
            )) : <EmptyState text="Noch keine relevanten Gruppen vorhanden." />}
          </SettingsSection>
        </>
      ) : null}

      {pane === "interests" ? (
        <div className="settings-chip-grid">
          {categoryOptions.map((category) => (
            <button className={interests.includes(category) ? "selected" : ""} type="button" key={category} onClick={() => toggleInterest(category)}>
              {category}
            </button>
          ))}
        </div>
      ) : null}

      {pane === "feed" ? (
        <SettingsCard>
          <ToggleItem title="Für dich priorisieren" checked={userSettings.feedPreferences.prioritizeForYou} onChange={(value) => updateFeedPreference("prioritizeForYou", value)} />
          <ToggleItem title="Nur Gruppen anzeigen" checked={userSettings.feedPreferences.onlyGroups} onChange={(value) => updateFeedPreference("onlyGroups", value)} />
          <ToggleItem title="Unterstützte Themen hervorheben" checked={userSettings.feedPreferences.highlightSupported} onChange={(value) => updateFeedPreference("highlightSupported", value)} />
          <ToggleItem title="Trending stärker gewichten" checked={userSettings.feedPreferences.boostTrending} onChange={(value) => updateFeedPreference("boostTrending", value)} />
          <ToggleItem title="Neue Beiträge zuerst" checked={userSettings.feedPreferences.newestFirst} onChange={(value) => updateFeedPreference("newestFirst", value)} />
        </SettingsCard>
      ) : null}

      {pane === "appearance" ? (
        <SettingsCard>
          {(["light", "dark", "system"] as ThemePreference[]).map((theme) => (
            <ChoiceItem key={theme} title={themeLabel(theme)} selected={userSettings.theme === theme} onClick={() => persistUserSettings({ ...userSettings, theme }, "Darstellung gespeichert.")} />
          ))}
        </SettingsCard>
      ) : null}

      {pane === "privacy" ? (
        <SettingsCard>
          <ChoiceItem title="Sichtbar" selected={userSettings.privacyVisibility === "visible"} onClick={() => persistUserSettings({ ...userSettings, privacyVisibility: "visible" }, "Datenschutz gespeichert.")} />
          <ChoiceItem title="Anonym" selected={userSettings.privacyVisibility === "anonymous"} onClick={() => persistUserSettings({ ...userSettings, privacyVisibility: "anonymous" }, "Datenschutz gespeichert.")} />
        </SettingsCard>
      ) : null}

      {pane === "security" ? (
        <SettingsCard>
          <button className="secondary-button full" type="button" onClick={onAbmelden} disabled={busy}>Von diesem Gerät abmelden</button>
          <button className="settings-danger-button" type="button" onClick={leaveAllDevices} disabled={busy}>Überall abmelden</button>
        </SettingsCard>
      ) : null}

      {pane === "groups" ? (
        <>
          <SettingsCard>
            <button className="secondary-button full" type="button" onClick={onOpenGroups}>Gruppen verwalten</button>
            <form className="settings-inline-form" onSubmit={joinCode}>
              <input value={inviteCode} onChange={(event) => setInviteCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5))} placeholder="5-stelliger Code" maxLength={5} />
              <button type="submit" disabled={busy || inviteCode.length !== 5}>Beitreten</button>
            </form>
          </SettingsCard>
          {memberships.length ? memberships.map((membership) => (
            <article className="settings-group-card" key={membership.id}>
              <GroupVisual group={membership.group} className="group-avatar" />
              <span>
                <strong>{membership.group.name}</strong>
                <small>{membership.group.category} · {membership.role === "admin" ? "Admin" : "Mitglied"}</small>
              </span>
              <button type="button" onClick={() => onOpenGroup(membership.groupId)}>Öffnen</button>
              <button type="button" onClick={() => onLeaveGroup(membership)} disabled={busy || membership.role === "admin"}>Verlassen</button>
            </article>
          )) : <EmptyState text="Noch keine Gruppenmitgliedschaft." />}
        </>
      ) : null}

      {pane === "impact" ? (
        <SettingsCard>
          <StatLine label="Ideen erstellt" value={String(ownMovements.length)} />
          <StatLine label="Stimmen abgegeben" value={String(supportedMovements.length)} />
          <StatLine label="Unterstützer erhalten" value={String(receivedVotes)} />
          <StatLine label="Unterstützte Themen" value={String(stats.supportedTopics)} />
          <StatLine label="Umgesetzte Projekte" value={String(stats.implementedIdeas)} />
          <StatLine label="Impact-Rang" value={stats.reached ? "Berechnet aus sichtbaren Beiträgen" : "Noch keine Daten"} />
        </SettingsCard>
      ) : null}

      {pane === "moderation" ? (
        <SettingsCard>
          <StatLine label="Blockierte Nutzer" value={moderation.blockedUsers.length ? `${moderation.blockedUsers.length}` : "Keine"} />
          <StatLine label="Gemeldete Inhalte" value={moderation.reportedContents.length ? `${moderation.reportedContents.length}` : "Keine sichtbar"} />
          <StatLine label="Eigene Meldungen" value={moderation.ownReports.length ? `${moderation.ownReports.length}` : "Keine"} />
          <small className="settings-note">Leere Bereiche bedeuten, dass keine Daten vorhanden sind oder du keine Admin-Rechte für gemeldete Inhalte hast.</small>
        </SettingsCard>
      ) : null}

      {pane === "info" ? (
        <SettingsSection title="Info">
          <SettingsItem title="Über Citrus" onClick={() => setPane("about")} />
          <SettingsItem title="Feedback senden" onClick={() => setPane("feedback")} />
          <SettingsItem title="Changelog" onClick={() => setPane("changelog")} />
          <SettingsItem title="Datenschutz" onClick={() => setPane("privacyText")} />
          <SettingsItem title="Nutzungsbedingungen" onClick={() => setPane("terms")} />
        </SettingsSection>
      ) : null}

      {pane === "feedback" ? (
        <SettingsCard>
          <form className="settings-form" onSubmit={submitFeedback}>
            <label>
              Betreff
              <input value={feedbackSubject} onChange={(event) => setFeedbackSubject(event.target.value)} required />
            </label>
            <label>
              Nachricht
              <textarea value={feedbackBody} onChange={(event) => setFeedbackBody(event.target.value)} rows={5} required />
            </label>
            <button className="primary-button" type="submit" disabled={busy}>Feedback senden</button>
          </form>
        </SettingsCard>
      ) : null}

      {pane === "about" ? <InfoText title="Citrus macht Bewegungen sichtbar." text="Citrus hilft Menschen, Themen in Gruppen, Orten und Organisationen zu priorisieren und Fortschritt sichtbar zu machen." /> : null}
      {pane === "changelog" ? <InfoText title="Changelog" text="Aktuelle Änderungen erscheinen hier, sobald sie in der Datenbank oder im Release-Prozess gepflegt werden." /> : null}
      {pane === "privacyText" ? <InfoText title="Datenschutz" text="Citrus speichert Profil-, Gruppen-, Beitrags- und Einstellungsdaten, damit die App personalisiert funktionieren kann." /> : null}
      {pane === "terms" ? <InfoText title="Nutzungsbedingungen" text="Beiträge sollen sachlich, konkret und lösungsorientiert sein. Missbrauch kann gemeldet und moderiert werden." /> : null}
    </div>
  );
}

function themeLabel(theme: ThemePreference) {
  if (theme === "light") return "Hell";
  if (theme === "dark") return "Dunkel";
  return "System";
}

function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="settings-section">
      <h2>{title}</h2>
      <div className="settings-list">{children}</div>
    </section>
  );
}

function SettingsCard({ children }: { children: ReactNode }) {
  return <section className="settings-card">{children}</section>;
}

function SettingsItem({ title, detail, danger, onClick }: { title: string; detail?: string; danger?: boolean; onClick: () => void }) {
  return (
    <button className={`settings-item ${danger ? "danger" : ""}`} type="button" onClick={onClick}>
      <span>
        <strong>{title}</strong>
        {detail ? <small>{detail}</small> : null}
      </span>
      <Icon name="chevronRight" size={18} />
    </button>
  );
}

function ToggleItem({ title, detail, checked, onChange }: { title: string; detail?: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="settings-toggle-row">
      <span>
        <strong>{title}</strong>
        {detail ? <small>{detail}</small> : null}
      </span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

function ChoiceItem({ title, selected, onClick }: { title: string; selected: boolean; onClick: () => void }) {
  return (
    <button className={`settings-choice ${selected ? "selected" : ""}`} type="button" onClick={onClick}>
      <span>{title}</span>
      {selected ? <Icon name="checkCircle" size={19} /> : null}
    </button>
  );
}

function FrequencyRow({ label, value, onChange }: { label: string; value: NotificationFrequency; onChange: (value: NotificationFrequency) => void }) {
  return (
    <label className="settings-frequency-row">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value as NotificationFrequency)}>
        {frequencyOptions.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

function StatLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="settings-stat-line">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="settings-empty">{text}</div>;
}

function InfoText({ title, text }: { title: string; text: string }) {
  return (
    <SettingsCard>
      <h2>{title}</h2>
      <p className="settings-copy">{text}</p>
    </SettingsCard>
  );
}
