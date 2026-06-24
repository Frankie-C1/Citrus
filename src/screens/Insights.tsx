import { useMemo, useState, type CSSProperties, type FormEvent } from "react";
import type { Movement, MovementType, UpdateMovementInput, UserStats } from "../types";
import { SectionHeader } from "../components/SectionHeader";
import { StatCard } from "../components/StatCard";

type InsightsProps = {
  stats: UserStats;
  isAuthenticated: boolean;
  movements: Movement[];
  userId: string | null;
  onAuth: () => void;
  onOpenMovement: (movement: Movement) => void;
  onToggleSupport: (id: string) => Promise<void> | void;
  onUpdateMovement: (input: UpdateMovementInput) => Promise<void> | void;
  onDeleteMovement: (id: string) => Promise<void> | void;
};

const typeOptions: Array<{ value: MovementType; label: string }> = [
  { value: "problem", label: "Problem" },
  { value: "idea", label: "Idee" },
  { value: "improvement", label: "Verbesserung" },
  { value: "question", label: "Frage" },
];

function formatDate(value?: string) {
  if (!value) return "Heute";
  return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "short", year: "numeric" }).format(
    new Date(value),
  );
}

export function Insights({
  stats,
  isAuthenticated,
  movements,
  userId,
  onAuth,
  onOpenMovement,
  onToggleSupport,
  onUpdateMovement,
  onDeleteMovement,
}: InsightsProps) {
  const [editing, setEditing] = useState<Movement | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editEmoji, setEditEmoji] = useState("");
  const [editType, setEditType] = useState<MovementType>("idea");
  const [editImageFile, setEditImageFile] = useState<File | undefined>();
  const [removeImage, setRemoveImage] = useState(false);
  const [busy, setBusy] = useState(false);

  const max = Math.max(...stats.weeklyReach, 1);
  const progress = Math.min(92, Math.max(18, stats.supportedTopics * 9 + stats.ownMovements * 12));
  const ownMovements = useMemo(
    () => movements.filter((movement) => movement.userId === userId),
    [movements, userId],
  );
  const supportedMovements = useMemo(
    () => movements.filter((movement) => movement.supportedByUser),
    [movements],
  );

  function openEdit(movement: Movement) {
    setEditing(movement);
    setEditTitle(movement.title);
    setEditDescription(movement.description);
    setEditCategory(movement.category);
    setEditEmoji(movement.emoji);
    setEditType(movement.type);
    setEditImageFile(undefined);
    setRemoveImage(false);
  }

  async function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setBusy(true);
    try {
      await onUpdateMovement({
        id: editing.id,
        title: editTitle.trim(),
        description: editDescription.trim(),
        category: editCategory.trim(),
        type: editType,
        emoji: editEmoji.trim() || editing.emoji,
        imageFile: editImageFile,
        removeImage,
      });
      setEditing(null);
    } finally {
      setBusy(false);
    }
  }

  async function deleteOwnMovement(movement: Movement) {
    if (!window.confirm("Beitrag wirklich löschen?\nDiese Bewegung und ihre Unterstützungen werden gelöscht.")) return;
    setBusy(true);
    try {
      await onDeleteMovement(movement.id);
    } finally {
      setBusy(false);
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="screen stack">
        <header>
          <span className="eyebrow">Persoenlicher Einfluss</span>
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
        <span className="eyebrow">Persoenlicher Einfluss</span>
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
        <SectionHeader title="Ueberblick" />
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

      <section className="activity-section">
        <SectionHeader title="Meine Beiträge" />
        {ownMovements.length ? (
          <div className="activity-list">
            {ownMovements.map((movement) => (
              <article className="activity-card" key={movement.id}>
                <div className="activity-main">
                  <span className="movement-emoji">{movement.emoji}</span>
                  <div>
                    <strong>{movement.title}</strong>
                    <small>
                      {movement.groupName} · {movement.status} · {formatDate(movement.createdAt)}
                    </small>
                  </div>
                </div>
                <div className="activity-meta">
                  <span>{movement.supporters} Unterstützer</span>
                  <span>+{movement.weeklyGrowth} diese Woche</span>
                </div>
                <div className="activity-actions">
                  <button type="button" onClick={() => onOpenMovement(movement)}>
                    Details
                  </button>
                  <button type="button" onClick={() => openEdit(movement)}>
                    Bearbeiten
                  </button>
                  <button type="button" onClick={() => deleteOwnMovement(movement)} disabled={busy}>
                    Löschen
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>Noch keine eigenen Beiträge.</strong>
            <span>Starte über den Plus-Button deine erste Bewegung.</span>
          </div>
        )}
      </section>

      {editing ? (
        <section className="edit-panel">
          <div className="section-header">
            <h2>Beitrag bearbeiten</h2>
            <button className="text-button" type="button" onClick={() => setEditing(null)}>
              Schließen
            </button>
          </div>
          <form className="admin-form" onSubmit={submitEdit}>
            <label>
              Titel
              <input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} maxLength={90} required />
            </label>
            <label>
              Beschreibung
              <textarea
                value={editDescription}
                onChange={(event) => setEditDescription(event.target.value)}
                maxLength={800}
                rows={5}
                required
              />
            </label>
            <label>
              Kategorie
              <input value={editCategory} onChange={(event) => setEditCategory(event.target.value)} maxLength={40} />
            </label>
            <label>
              Typ
              <select value={editType} onChange={(event) => setEditType(event.target.value as MovementType)}>
                {typeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Emoji
              <input value={editEmoji} onChange={(event) => setEditEmoji(event.target.value.slice(0, 4))} maxLength={4} />
            </label>
            <label className="file-picker">
              <span>Bild ersetzen</span>
              <small>{editImageFile ? editImageFile.name : "Neues Foto optional auswählen."}</small>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/avif"
                onChange={(event) => setEditImageFile(event.target.files?.[0])}
              />
            </label>
            {editing.imageUrl ? (
              <button className="secondary-button full" type="button" onClick={() => setRemoveImage((value) => !value)}>
                {removeImage ? "Bild bleibt doch erhalten" : "Vorhandenes Bild entfernen"}
              </button>
            ) : null}
            <button className="primary-button" type="submit" disabled={busy || !editTitle.trim() || !editDescription.trim()}>
              {busy ? "Speichern..." : "Änderungen speichern"}
            </button>
          </form>
        </section>
      ) : null}

      <section className="activity-section">
        <SectionHeader title="Unterstützte Themen" />
        {supportedMovements.length ? (
          <div className="activity-list">
            {supportedMovements.map((movement) => (
              <article className="activity-card" key={movement.id}>
                <div className="activity-main">
                  <span className="movement-emoji">{movement.emoji}</span>
                  <div>
                    <strong>{movement.title}</strong>
                    <small>{movement.groupName} · {movement.category}</small>
                  </div>
                </div>
                <div className="activity-actions">
                  <button type="button" onClick={() => onOpenMovement(movement)}>
                    Details
                  </button>
                  <button type="button" onClick={() => onToggleSupport(movement.id)}>
                    Support entfernen
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>Noch nichts unterstützt.</strong>
            <span>Im Feed kannst du Bewegungen mit einem Tipp sichtbar machen.</span>
          </div>
        )}
      </section>

      <section className="soft-note">
        <strong>Beiträge sollten sachlich, konkret und lösungsorientiert sein.</strong>
        <span>So bleibt Citrus ein Ort, an dem Bewegung entstehen kann.</span>
      </section>
    </div>
  );
}
