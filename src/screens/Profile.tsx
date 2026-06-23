import type { Group, User, UserStats } from "../types";
import { Icon } from "../components/Icon";

type ProfileProps = {
  user: User;
  groups: Group[];
  stats: UserStats;
  isAuthenticated: boolean;
  onOpenGroups: () => void;
  onReset: () => void;
  onToast: (message: string) => void;
  onAuth: () => void;
  onLogout: () => void;
};

export function Profile({
  user,
  groups,
  stats,
  isAuthenticated,
  onOpenGroups,
  onReset,
  onToast,
  onAuth,
  onLogout,
}: ProfileProps) {
  const userGroups = groups.filter((group) => user.groupIds.includes(group.id));

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
              <small>Öffentliche und interne Kontexte</small>
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
          <span className="eyebrow">Supabase Profil</span>
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
        <button type="button" onClick={() => onToast("Benachrichtigungen werden im MVP als Produkt-Option vorbereitet.")}>
          <Icon name="bell" size={20} />
          <span>
            <strong>Benachrichtigungen</strong>
            <small>Trends und Updates</small>
          </span>
        </button>
        <button type="button" onClick={() => onToast("Dein Profil wird aus Supabase Auth geladen.")}>
          <Icon name="settings" size={20} />
          <span>
            <strong>Einstellungen</strong>
            <small>{stats.reached.toLocaleString("de-DE")} erreichte Menschen</small>
          </span>
        </button>
        <button type="button" onClick={() => onToast("Community-Regeln: sachlich, konkret, lösungsorientiert.")}>
          <Icon name="rules" size={20} />
          <span>
            <strong>Rechtliches / Community-Regeln</strong>
            <small>MVP-Regeln ohne Moderationsworkflow</small>
          </span>
        </button>
      </div>

      <section>
        <div className="profile-group-preview">
          {(userGroups.length ? userGroups : groups.slice(0, 4)).slice(0, 4).map((group) => (
            <span key={group.id}>{group.name}</span>
          ))}
        </div>
      </section>

      <button className="secondary-button full" type="button" onClick={onLogout}>
        Logout
      </button>
      <button className="reset-button" type="button" onClick={onReset}>
        <Icon name="reset" size={18} />
        Lokales Onboarding zurücksetzen
      </button>
    </div>
  );
}
