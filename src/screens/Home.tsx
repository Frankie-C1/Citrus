import { useMemo, useRef, useState, type PointerEvent } from "react";
import type { Movement, Notification, UserStats } from "../types";
import { Icon } from "../components/Icon";
import { sortMovementsForUser } from "../lib/recommendations";

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
  onRefresh: () => Promise<void> | void;
};

const homeTabs: Array<{ id: HomeTab; label: string; title: string }> = [
  { id: "for-you", label: "Für dich", title: "Wichtig für dich" },
  { id: "trending", label: "Trending", title: "Themen mit Momentum" },
  { id: "groups", label: "Gruppen", title: "Deine Gruppen" },
  { id: "supported", label: "Unterstützte", title: "Von dir unterstützt" },
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

function formatCompact(value: number) {
  if (value >= 1000) return `${new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 }).format(value / 1000)}k`;
  return value.toLocaleString("de-DE");
}

function voteLabel(value: number) {
  return `${formatCompact(value)} ${value === 1 ? "Stimme" : "Stimmen"}`;
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

function tabSource(tab: HomeTab, movements: Movement[], trending: Movement[]) {
  if (tab === "trending") return trending.filter((movement) => (movement.trendingScore ?? 0) > 0 || movement.supporters > 0);
  if (tab === "groups") return movements.filter((movement) => movement.scope === "internal");
  if (tab === "supported") return movements.filter((movement) => movement.supportedByUser);
  return movements;
}

export function Home({
  userName,
  isAuthenticated,
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
  onRefresh,
}: HomeProps) {
  const [activeHomeTab, setActiveHomeTab] = useState<HomeTab>("for-you");
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshed, setRefreshed] = useState(false);
  const pullStart = useRef<{ y: number; active: boolean } | null>(null);
  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  const trending = useMemo(
    () =>
      sortMovementsForUser(movements, {
        membershipGroupIds: movements.map((movement) => movement.groupId),
        mode: "trending",
      }),
    [movements],
  );

  const visibleTopics = useMemo(() => {
    const source = tabSource(activeHomeTab, movements, trending);
    return sortMovementsForUser(source, {
      membershipGroupIds: movements.map((movement) => movement.groupId),
      supportedGroupIds: movements.filter((movement) => movement.supportedByUser).map((movement) => movement.groupId),
      interactedCategories: movements.filter((movement) => movement.supportedByUser).map((movement) => movement.category),
      mode: activeHomeTab === "trending" ? "trending" : activeHomeTab === "groups" ? "groups" : activeHomeTab === "supported" ? "supported" : "for-you",
    }).slice(0, 5);
  }, [activeHomeTab, movements, trending]);

  const activeTabInfo = homeTabs.find((tab) => tab.id === activeHomeTab) ?? homeTabs[0];
  const featuredMovement = activeHomeTab === "groups" ? undefined : visibleTopics[0];

  function startPull(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse") return;
    const container = event.currentTarget.closest(".screen-content") as HTMLElement | null;
    if ((container?.scrollTop ?? window.scrollY) > 2) return;
    pullStart.current = { y: event.clientY, active: true };
  }

  function movePull(event: PointerEvent<HTMLDivElement>) {
    const start = pullStart.current;
    if (!start?.active || refreshing) return;
    const distance = event.clientY - start.y;
    if (distance <= 0) return;
    setPullDistance(Math.min(96, distance * 0.55));
  }

  async function endPull() {
    const shouldRefresh = pullDistance > 58;
    pullStart.current = null;
    if (!shouldRefresh) {
      setPullDistance(0);
      return;
    }
    setRefreshing(true);
    setPullDistance(72);
    try {
      await onRefresh();
      setRefreshed(true);
      window.setTimeout(() => setRefreshed(false), 1600);
    } finally {
      setRefreshing(false);
      setPullDistance(0);
    }
  }

  return (
    <div
      className="screen home-screen"
      onPointerDown={startPull}
      onPointerMove={movePull}
      onPointerUp={endPull}
      onPointerCancel={endPull}
    >
      <div
        className={`home-pull-refresh ${pullDistance > 4 || refreshing ? "visible" : ""}`}
        style={{ transform: `translateY(${pullDistance}px)` }}
        aria-hidden="true"
      >
        <span className={refreshing || pullDistance > 4 ? "spinning" : ""} />
      </div>

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
          <span>Themen oder Gruppen suchen</span>
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
          <strong>Verbindung prüfen.</strong>
          <span>{error}</span>
        </section>
      ) : null}

      {featuredMovement ? (
        <article className={`trending-feature ${featuredMovement.imageUrl ? "has-image" : "no-image"}`} key={`${activeHomeTab}-${featuredMovement.id}`}>
          {featuredMovement.imageUrl ? <img src={featuredMovement.imageUrl} alt="" /> : null}
          <div className="trending-overlay" />
          <div className="trending-content">
            <span className="trending-chip">{activeHomeTab === "supported" ? "UNTERSTÜTZT" : activeHomeTab === "trending" ? "TRENDING" : "HEUTE"}</span>
            <h2>{featuredMovement.title}</h2>
            <div className="trending-stats">
              <span>{supportPercent(featuredMovement, movements)} % Unterstützung</span>
              <span>{voteLabel(featuredMovement.supporters)}</span>
            </div>
            <div className="trending-footer">
              <div className="support-progress" aria-hidden="true">
                <span style={{ width: `${supportPercent(featuredMovement, movements)}%` }} />
              </div>
              <button type="button" onClick={() => onOpenMovement(featuredMovement)} aria-label="Thema öffnen">
                <Icon name="arrowUpRight" size={34} />
              </button>
            </div>
          </div>
        </article>
      ) : loading ? (
        <section className="trending-feature loading-card">
          <div className="trending-content">
            <span className="trending-chip">CITRUS</span>
            <h2>Lade Themen...</h2>
          </div>
        </section>
      ) : activeHomeTab === "groups" ? (
        <section className="home-tab-note">
          <strong>Gruppenansicht</strong>
          <span>Hier siehst du Themen aus deinen Räumen. Öffne die Übersicht, um nach Gruppe zu filtern.</span>
        </section>
      ) : null}

      <section className="top-topics-section" key={activeHomeTab}>
        <div className="reference-section-title">
          <h2>{activeTabInfo.title}</h2>
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
                    <span>{voteLabel(movement.supporters)}</span>
                  </div>
                  <svg className="topic-sparkline" viewBox="0 0 92 34" aria-hidden="true">
                    {path ? <path d={path} /> : null}
                  </svg>
                  <em>{percent} %</em>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <strong>{activeHomeTab === "supported" ? "Noch nichts unterstützt." : "Noch keine Themen vorhanden."}</strong>
            <span>{activeHomeTab === "supported" ? "Stimme für ein Anliegen, damit es hier erscheint." : "Neue Beiträge erscheinen hier, sobald sie gespeichert sind."}</span>
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
