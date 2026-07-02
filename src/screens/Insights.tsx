import { useMemo, useState, type CSSProperties } from "react";
import type { Group, Movement, UserStats } from "../types";
import { GroupVisual } from "../components/GroupVisual";
import { Icon } from "../components/Icon";
import { SectionHeader } from "../components/SectionHeader";
import { StatCard } from "../components/StatCard";

type InsightsProps = {
  stats: UserStats;
  isAuthenticated: boolean;
  movements: Movement[];
  groups: Group[];
  userId: string | null;
  onAuth: () => void;
  onOpenMovement: (movement: Movement) => void;
};

type PostsView = "mine" | "groups" | "stats";

const viewOptions: Array<{ id: PostsView; label: string; hint: string }> = [
  { id: "mine", label: "Meine Posts", hint: "Alles, was du erstellt hast" },
  { id: "groups", label: "Gruppenposts", hint: "Beiträge aus deinen Gruppen" },
  { id: "stats", label: "Statistiken", hint: "Deine Wirkung in Zahlen" },
];

function tileLabel(movement: Movement) {
  return movement.title || movement.groupName || "Beitrag";
}

export function Insights({
  stats,
  isAuthenticated,
  movements,
  groups,
  userId,
  onAuth,
  onOpenMovement,
}: InsightsProps) {
  const [view, setView] = useState<PostsView>("mine");
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>();

  const ownMovements = useMemo(
    () => movements.filter((movement) => movement.userId === userId),
    [movements, userId],
  );
  const groupMovements = useMemo(
    () => movements.filter((movement) => movement.groupId === selectedGroupId),
    [movements, selectedGroupId],
  );
  const selectedGroup = groups.find((group) => group.id === selectedGroupId);
  const activeOption = viewOptions.find((option) => option.id === view) ?? viewOptions[0];

  if (!isAuthenticated) {
    return (
      <div className="screen posts-screen">
        <header className="posts-header">
          <div>
            <span className="eyebrow">Posts</span>
            <h1>Deine Beiträge</h1>
          </div>
        </header>
        <div className="posts-empty-state">
          <Icon name="grid" size={34} />
          <strong>Melde dich an, um deine Beiträge zu sehen.</strong>
          <button className="primary-button" type="button" onClick={onAuth}>
            Anmelden
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen posts-screen">
      <header className="posts-header">
        <div className="posts-menu-wrap">
          <button
            className="posts-title-button"
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
          >
            <span>{activeOption.label}</span>
            <Icon name="chevron" size={18} />
          </button>
          {menuOpen ? (
            <div className="posts-menu">
              {viewOptions.map((option) => (
                <button
                  type="button"
                  key={option.id}
                  className={view === option.id ? "active" : ""}
                  onClick={() => {
                    setView(option.id);
                    setMenuOpen(false);
                    if (option.id !== "groups") setSelectedGroupId(undefined);
                  }}
                >
                  <span>
                    <strong>{option.label}</strong>
                    <small>{option.hint}</small>
                  </span>
                  {view === option.id ? <Icon name="checkCircle" size={18} /> : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </header>

      <section className="posts-hero-card">
        <div>
          <span>Dein Raster</span>
          <strong>{ownMovements.length} eigene Posts</strong>
          <small>{stats.reached.toLocaleString("de-DE")} Impact · {stats.supportedTopics} unterstützt</small>
        </div>
        <button type="button" onClick={() => setView("stats")}>
          Statistiken
        </button>
      </section>

      {view === "mine" ? (
        <PostGrid
          movements={ownMovements}
          emptyTitle="Noch keine eigenen Posts."
          emptyText="Sobald du etwas postest, erscheint es hier in deinem Raster."
          onOpenMovement={onOpenMovement}
        />
      ) : null}

      {view === "groups" ? (
        selectedGroupId ? (
          <section className="group-posts-view">
            <button className="posts-back-row" type="button" onClick={() => setSelectedGroupId(undefined)}>
              <Icon name="chevronRight" size={18} />
              Gruppen
            </button>
            <SectionHeader title={selectedGroup?.name ?? "Gruppenposts"} />
            <PostGrid
              movements={groupMovements}
              emptyTitle="Noch keine Posts in dieser Gruppe."
              emptyText="Wenn in der Gruppe Beiträge entstehen, tauchen sie hier auf."
              onOpenMovement={onOpenMovement}
            />
          </section>
        ) : (
          <section className="group-picker-view">
            <SectionHeader title="Deine Gruppen" />
            {groups.length ? (
              <div className="posts-group-grid">
                {groups.map((group) => (
                  <button className="posts-group-card" type="button" key={group.id} onClick={() => setSelectedGroupId(group.id)}>
                    <GroupVisual group={group} />
                    <strong>{group.name}</strong>
                    <small>{group.category}</small>
                  </button>
                ))}
              </div>
            ) : (
              <div className="posts-empty-state compact">
                <Icon name="groups" size={32} />
                <strong>Noch keine Gruppen.</strong>
                <span>Gruppen, denen du folgst, erscheinen hier.</span>
              </div>
            )}
          </section>
        )
      ) : null}

      {view === "stats" ? (
        <StatsView stats={stats} />
      ) : null}
    </div>
  );
}

function PostGrid({
  movements,
  emptyTitle,
  emptyText,
  onOpenMovement,
}: {
  movements: Movement[];
  emptyTitle: string;
  emptyText: string;
  onOpenMovement: (movement: Movement) => void;
}) {
  if (!movements.length) {
    return (
      <div className="posts-empty-state">
        <Icon name="grid" size={38} />
        <strong>{emptyTitle}</strong>
        <span>{emptyText}</span>
      </div>
    );
  }

  return (
    <div className="posts-grid" aria-label="Beiträge">
      {movements.map((movement) => (
        <button className="post-tile" type="button" key={movement.id} onClick={() => onOpenMovement(movement)}>
          {movement.imageUrl ? <img src={movement.imageUrl} alt="" /> : <span>{movement.emoji}</span>}
          <small>{tileLabel(movement)}</small>
        </button>
      ))}
    </div>
  );
}

function StatsView({ stats }: { stats: UserStats }) {
  const max = Math.max(...stats.weeklyReach, 1);
  const hasWeeklyActivity = stats.weeklyReach.some((value) => value > 0);
  const progress = Math.min(92, Math.max(18, stats.supportedTopics * 9 + stats.ownMovements * 12));

  return (
    <div className="posts-stats-view">
      <section className="insight-hero">
        <div className="progress-ring" style={{ "--progress": `${progress}%` } as CSSProperties}>
          <span>{stats.reached.toLocaleString("de-DE")}</span>
        </div>
        <div>
          <strong>{stats.reached.toLocaleString("de-DE")} erreicht</strong>
          <p>Deine Unterstützung hilft Themen, sichtbar und entscheidbar zu werden.</p>
        </div>
      </section>

      <section>
        <SectionHeader title="Überblick" />
        <div className="stats-grid">
          <StatCard label="Themen unterstützt" value={String(stats.supportedTopics)} tone="green" />
          <StatCard label="Eigene Themen" value={String(stats.ownMovements)} />
          <StatCard label="Top Kategorie" value={stats.topCategory} />
          <StatCard label="Aktive Gruppen" value={String(stats.activeGroups)} />
        </div>
      </section>

      <section className="weekly-chart">
        <SectionHeader title="Wochenverlauf" />
        {hasWeeklyActivity ? (
          <div className="bar-row">
            {stats.weeklyReach.map((value, index) => (
              <span
                key={`${value}-${index}`}
                style={{ height: `${value ? Math.max(8, (value / max) * 112) : 0}px` }}
                aria-label={`${value} Aktivitäten`}
              />
            ))}
          </div>
        ) : (
          <div className="posts-empty-state compact">Noch keine Aktivität diese Woche</div>
        )}
      </section>
    </div>
  );
}
