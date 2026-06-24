import { useMemo, useState } from "react";
import type { Movement, Notification, UserStats } from "../types";
import { Icon } from "../components/Icon";

type HomeTab = "for-you" | "trending" | "groups" | "supported";

type HomeProps = {
  userName: string;
  isAuthenticated: boolean;
  stats: UserStats;
  movements: Movement[];
  notifications: Notification[];
  loading: boolean;
  error?: string;
  onOpenMovement: (movement: Movement) => void;
  onToggleSupport: (id: string) => void;
  onOpenFeed: () => void;
  onOpenSearch: () => void;
  onOpenNotifications: () => void;
  onPlus: () => void;
  onAuth: () => void;
};

const homeTabs: Array<{ id: HomeTab; label: string }> = [
  { id: "for-you", label: "Für dich" },
  { id: "trending", label: "Trending" },
  { id: "groups", label: "Gruppen" },
  { id: "supported", label: "Unterstützte" },
];

function greeting() {
  const hour = new Date().getHours();
  if (hour < 11) return "Guten Morgen";
  if (hour < 17) return "Guten Tag";
  return "Guten Abend";
}

function supportPercent(movement: Movement, movements: Movement[]) {
  const maxSupporters = Math.max(...movements.map((item) => item.supporters), 0);
  if (!maxSupporters) return 0;
  return Math.round((movement.supporters / maxSupporters) * 100);
}

function formatVotes(value: number) {
  if (value >= 1000) {
    return `${new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 }).format(value / 1000)}k`;
  }
  return value.toLocaleString("de-DE");
}

function sparklinePath(values: number[], width = 92, height = 34) {
  if (!values.length) return "";
  const max = Math.max(...values, 1);
  const step = values.length > 1 ? width / (values.length - 1) : width;
  return values
    .map((value, index) => {
      const x = index * step;
      const y = height - (value / max) * (height - 4) - 2;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

export function Home({
  userName,
  isAuthenticated,
  stats,
  movements,
  notifications,
  loading,
  error,
  onOpenMovement,
  onOpenFeed,
  onOpenSearch,
  onOpenNotifications,
  onPlus,
  onAuth,
}: HomeProps) {
  const [activeHomeTab, setActiveHomeTab] = useState<HomeTab>("for-you");
  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  const trending = useMemo(
    () => [...movements].sort((a, b) => (b.trendingScore ?? 0) - (a.trendingScore ?? 0)),
    [movements],
  );

  const topMovement = trending[0];
  const visibleTopics = useMemo(() => {
    const source =
      activeHomeTab === "trending"
        ? trending
        : activeHomeTab === "groups"
          ? movements.filter((movement) => Boolean(movement.groupId))
          : activeHomeTab === "supported"
            ? movements.filter((movement) => movement.supportedByUser)
            : movements;

    return [...source]
      .sort((a, b) => (b.trendingScore ?? 0) + b.supporters - ((a.trendingScore ?? 0) + a.supporters))
      .slice(0, 4);
  }, [activeHomeTab, movements, trending]);

  return (
    <div className="screen home-screen">
      <header className="reference-home-header">
        <div className="home-top-actions">
          <button className="home-round-button" type="button" onClick={onPlus} aria-label="Beitrag erstellen">
            <Icon name="plus" size={25} />
          </button>
          <button
            className="home-bell-button"
            type="button"
            onClick={onOpenNotifications}
            aria-label="Benachrichtigungen öffnen"
          >
            <Icon name="bell" size={31} />
            {unreadCount ? <span>{unreadCount > 9 ? "9+" : unreadCount}</span> : null}
          </button>
        </div>

        <p className="home-greeting">
          {greeting()}
          {isAuthenticated ? `, ${userName}` : ""}
        </p>
        <h1>
          <span>Was ist dir</span>
          <span>heute wichtig?</span>
        </h1>

        <button className="reference-search" type="button" onClick={onOpenSearch}>
          <Icon name="search" size={25} />
          <span>Suche nach Themen, Ideen oder Gruppen</span>
          <Icon name="chevronRight" size={25} />
        </button>

        <nav className="home-tabs" aria-label="Home-Filter">
          {homeTabs.map((tab) => (
            <button
              key={tab.id}
              className={activeHomeTab === tab.id ? "active" : ""}
              type="button"
              onClick={() => setActiveHomeTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      {error ? (
        <section className="soft-note">
          <strong>Supabase-Konfiguration prüfen.</strong>
          <span>{error}</span>
        </section>
      ) : null}

      {topMovement ? (
        <article className={`trending-feature ${topMovement.imageUrl ? "has-image" : "no-image"}`}>
          {topMovement.imageUrl ? <img src={topMovement.imageUrl} alt="" /> : null}
          <div className="trending-overlay" />
          <div className="trending-content">
            <span className="trending-chip">TRENDING</span>
            <h2>{topMovement.title}</h2>
            <div className="trending-stats">
              <span>{supportPercent(topMovement, movements)}% Unterstützung</span>
              <span>{formatVotes(topMovement.supporters)} Stimmen</span>
            </div>
            <div className="trending-footer">
              <div className="support-progress" aria-hidden="true">
                <span style={{ width: `${supportPercent(topMovement, movements)}%` }} />
              </div>
              <button type="button" onClick={() => onOpenMovement(topMovement)} aria-label="Trending-Thema öffnen">
                <Icon name="arrowUpRight" size={34} />
              </button>
            </div>
          </div>
        </article>
      ) : loading ? (
        <section className="trending-feature loading-card">
          <div className="trending-content">
            <span className="trending-chip">TRENDING</span>
            <h2>Lade echte Themen...</h2>
          </div>
        </section>
      ) : null}

      <section className="top-topics-section">
        <div className="reference-section-title">
          <h2>Top Themen</h2>
          <button type="button" onClick={onOpenFeed}>
            Alle anzeigen
            <Icon name="chevronRight" size={18} />
          </button>
        </div>

        {loading ? (
          <div className="empty-state">Lade Themen...</div>
        ) : visibleTopics.length ? (
          <div className="top-topic-list">
            {visibleTopics.map((movement) => {
              const percent = supportPercent(movement, movements);
              const path = sparklinePath(movement.activityHistory ?? []);
              return (
                <button
                  className="top-topic-item"
                  type="button"
                  key={movement.id}
                  onClick={() => onOpenMovement(movement)}
                >
                  <div className="topic-thumb">
                    {movement.imageUrl ? <img src={movement.imageUrl} alt="" /> : <span>{movement.emoji}</span>}
                  </div>
                  <div className="topic-copy">
                    <strong>{movement.title}</strong>
                    <span>{formatVotes(movement.supporters)} Stimmen</span>
                  </div>
                  <svg className="topic-sparkline" viewBox="0 0 92 34" aria-hidden="true">
                    {path ? <path d={path} /> : null}
                  </svg>
                  <em>{percent}%</em>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <strong>Noch keine echten Themen vorhanden.</strong>
            <span>Neue Beiträge erscheinen hier, sobald sie in Supabase gespeichert sind.</span>
            {!isAuthenticated ? (
              <button className="hero-login" type="button" onClick={onAuth}>
                Anmelden
              </button>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
