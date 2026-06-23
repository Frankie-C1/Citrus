import type { Movement, UserStats } from "../types";
import { MovementCard } from "../components/MovementCard";
import { SectionHeader } from "../components/SectionHeader";

type HomeProps = {
  userName: string;
  isAuthenticated: boolean;
  stats: UserStats;
  movements: Movement[];
  loading: boolean;
  error?: string;
  onOpenMovement: (movement: Movement) => void;
  onToggleSupport: (id: string) => void;
  onOpenFeed: () => void;
  onAuth: () => void;
};

function greeting() {
  const hour = new Date().getHours();
  if (hour < 11) return "Guten Morgen";
  if (hour < 17) return "Guten Tag";
  return "Guten Abend";
}

export function Home({
  userName,
  isAuthenticated,
  stats,
  movements,
  loading,
  error,
  onOpenMovement,
  onToggleSupport,
  onOpenFeed,
  onAuth,
}: HomeProps) {
  const weekly = [...movements].sort((a, b) => b.weeklyGrowth - a.weeklyGrowth).slice(0, 3);
  const trending = [...movements].sort((a, b) => b.supporters - a.supporters).slice(0, 4);

  return (
    <div className="screen stack">
      <header className="home-header">
        <span className="eyebrow">Heute</span>
        <h1>
          {greeting()}, {isAuthenticated ? userName : "Citrus"}
        </h1>
      </header>

      <section className={`influence-hero ${!isAuthenticated ? "guest" : ""}`}>
        <div>
          <span>{isAuthenticated ? "Dein Einfluss" : "Citrus bewegt sich"}</span>
          <strong>{isAuthenticated ? stats.reached.toLocaleString("de-DE") : movements.length.toLocaleString("de-DE")}</strong>
          <p>
            {isAuthenticated
              ? "Menschen wurden durch Themen erreicht, die du unterstützt oder gestartet hast."
              : "Melde dich an, um deinen Einfluss dauerhaft zu speichern."}
          </p>
          {!isAuthenticated ? (
            <button className="hero-login" type="button" onClick={onAuth}>
              Einfluss speichern
            </button>
          ) : null}
        </div>
        <div className="impact-orbit" aria-hidden="true">
          <i />
          <b />
        </div>
      </section>

      {error ? (
        <section className="soft-note">
          <strong>Daten konnten nicht geladen werden.</strong>
          <span>{error}</span>
        </section>
      ) : null}

      <section>
        <SectionHeader title="Diese Woche bewegt sich" action="Feed" onAction={onOpenFeed} />
        <div className="weekly-list">
          {loading ? (
            <div className="empty-state">Lade Bewegungen...</div>
          ) : (
            weekly.map((movement, index) => (
              <button className="weekly-item" type="button" key={movement.id} onClick={() => onOpenMovement(movement)}>
                <span>{index + 1}</span>
                <strong>{movement.title}</strong>
                <em>↗ +{movement.weeklyGrowth}</em>
              </button>
            ))
          )}
        </div>
      </section>

      <section>
        <SectionHeader title={isAuthenticated ? "Dein Beitrag" : "Dein Beitrag wartet"} />
        <div className="contribution-card">
          <div>
            <strong>{isAuthenticated ? stats.supportedTopics : "–"}</strong>
            <span>Themen unterstützt</span>
          </div>
          <div>
            <strong>{isAuthenticated ? stats.ownMovements : "–"}</strong>
            <span>Eigene Themen</span>
          </div>
          <div>
            <strong>{isAuthenticated ? stats.risingTopics : "–"}</strong>
            <span>Themen steigen</span>
          </div>
        </div>
      </section>

      <section>
        <SectionHeader title="Trending" />
        <div className="horizontal-cards">
          {trending.map((movement) => (
            <MovementCard
              key={movement.id}
              movement={movement}
              variant="trending"
              onOpen={onOpenMovement}
              onToggleSupport={onToggleSupport}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
