import type { CSSProperties } from "react";
import type { UserStats } from "../types";
import { SectionHeader } from "../components/SectionHeader";
import { StatCard } from "../components/StatCard";

type InsightsProps = {
  stats: UserStats;
  isAuthenticated: boolean;
  onAuth: () => void;
};

export function Insights({ stats, isAuthenticated, onAuth }: InsightsProps) {
  const max = Math.max(...stats.weeklyReach, 1);
  const progress = Math.min(92, Math.max(18, stats.supportedTopics * 9 + stats.ownMovements * 12));

  if (!isAuthenticated) {
    return (
      <div className="screen stack">
        <header>
          <span className="eyebrow">Persönlicher Einfluss</span>
          <h1>Dein Einfluss beginnt hier.</h1>
        </header>
        <section className="insight-hero guest-insight">
          <div className="progress-ring" style={{ "--progress": "24%" } as CSSProperties}>
            <span>0</span>
          </div>
          <div>
            <strong>Ein Konto speichert deine Wirkung.</strong>
            <p>Unterstützte Bewegungen, eigene Themen und aktive Gruppen werden dann dauerhaft verbunden.</p>
          </div>
        </section>
        <button className="primary-button" type="button" onClick={onAuth}>
          Einfluss speichern
        </button>
      </div>
    );
  }

  return (
    <div className="screen stack">
      <header>
        <span className="eyebrow">Persönlicher Einfluss</span>
        <h1>Dein Einfluss</h1>
      </header>

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
        <SectionHeader title="Aktivität" />
        <div className="stats-grid">
          <StatCard label="Themen unterstützt" value={String(stats.supportedTopics)} tone="green" />
          <StatCard label="Eigene Themen" value={String(stats.ownMovements)} />
          <StatCard label="Top Kategorie" value={stats.topCategory} />
          <StatCard label="Aktive Gruppen" value={String(stats.activeGroups)} />
        </div>
      </section>

      <section className="weekly-chart">
        <SectionHeader title="Wochenverlauf" />
        <div className="bar-row">
          {stats.weeklyReach.map((value, index) => (
            <span
              key={`${value}-${index}`}
              style={{ height: `${Math.max(24, (value / max) * 112)}px` }}
              aria-label={`${value} Bewegungen`}
            />
          ))}
        </div>
      </section>

      <section className="soft-note">
        <strong>Beiträge sollten sachlich, konkret und lösungsorientiert sein.</strong>
        <span>So bleibt Citrus ein Ort, an dem Bewegung entstehen kann.</span>
      </section>
    </div>
  );
}
