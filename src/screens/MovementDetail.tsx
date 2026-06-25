import { useRef, useState } from "react";
import type { Movement } from "../types";
import { Icon } from "../components/Icon";
import { Timeline } from "../components/Timeline";
import { displayAuthorName, movementImageUrl, movementVisualStyle, shouldHideAuthorIdentity } from "../lib/movementPresentation";

type MovementDetailProps = {
  movement: Movement;
  onBack: () => void;
  onToggleSupport: (id: string) => void;
  onShare: (movement: Movement) => void;
  onReport: (movement: Movement) => void;
  canManage?: boolean;
  onPostUpdate?: (id: string, text: string) => Promise<void> | void;
  onDelete?: (id: string) => Promise<void> | void;
};

const statusLabels: Record<Movement["status"], string> = {
  submitted: "Eingereicht",
  trending: "Trendet",
  review: "In Prüfung",
  implementation: "In Umsetzung",
  done: "Fertig",
};

function relativeTime(value?: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(value));
}

function initials(name: string) {
  return (
    name
      .split(/[ ._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?"
  );
}

function copyMovementLink(movement: Movement) {
  const url = `${window.location.origin}${window.location.pathname}?movement=${movement.id}`;
  void navigator.clipboard?.writeText(url);
}

export function MovementDetail({ movement, onBack, onToggleSupport, onShare, onReport, canManage = false, onPostUpdate, onDelete }: MovementDetailProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [updateText, setUpdateText] = useState("");
  const [busy, setBusy] = useState(false);
  const name = displayAuthorName(movement);
  const imageUrl = movementImageUrl(movement);
  const hideAuthor = shouldHideAuthorIdentity(movement);
  const updateSectionRef = useRef<HTMLElement>(null);
  const updateTextRef = useRef<HTMLTextAreaElement>(null);

  async function submitUpdate() {
    if (!updateText.trim() || !onPostUpdate) return;
    setBusy(true);
    try {
      await onPostUpdate(movement.id, updateText.trim());
      setUpdateText("");
      setUpdateOpen(false);
      setMenuOpen(false);
    } finally {
      setBusy(false);
    }
  }

  function openUpdateForm() {
    setUpdateOpen(true);
    setMenuOpen(false);
    window.setTimeout(() => {
      updateSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      updateTextRef.current?.focus({ preventScroll: true });
    }, 80);
  }

  return (
    <div className={`detail-reel-screen ${imageUrl ? "has-image" : "feed-slide-art"}`} style={movementVisualStyle(movement)}>
      {imageUrl ? <img className="detail-reel-image" src={imageUrl} alt="" /> : <div className="feed-slide-emoji detail-emoji" aria-hidden="true">{movement.emoji || "*"}</div>}
      <div className="detail-reel-gradient" />

      <header className="detail-reel-topbar">
        <button className="detail-top-button" type="button" onClick={onBack} aria-label="Zurück">
          <Icon name="chevronRight" size={22} />
        </button>
        <div className="detail-more-wrap">
          <button
            className="detail-top-button"
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Mehr Optionen"
            aria-expanded={menuOpen}
          >
            <Icon name="more" size={24} />
          </button>
          {menuOpen ? (
            <div className="feed-more-menu detail-menu">
              {canManage ? <button type="button" onClick={openUpdateForm}>Update posten</button> : null}
              {canManage ? (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Beitrag wirklich löschen?")) onDelete?.(movement.id);
                  }}
                >
                  Löschen
                </button>
              ) : null}
              <button type="button" onClick={() => copyMovementLink(movement)}>Link kopieren</button>
              <button type="button" onClick={() => onShare(movement)}>Teilen</button>
              <button type="button" onClick={() => onReport(movement)}>Melden</button>
            </div>
          ) : null}
        </div>
      </header>

      <aside className="detail-action-rail" aria-label="Beitragsaktionen">
        <button
          className={`feed-action-button support ${movement.supportedByUser ? "active" : ""}`}
          type="button"
          onClick={() => onToggleSupport(movement.id)}
          aria-label="Unterstützen"
        >
          <Icon name="star" size={29} />
          <span>{movement.supporters.toLocaleString("de-DE")}</span>
        </button>
        <button className="feed-action-button" type="button" onClick={() => onShare(movement)} aria-label="Teilen">
          <Icon name="share" size={26} />
          <span>Teilen</span>
        </button>
        <button className="feed-action-button" type="button" onClick={() => onReport(movement)} aria-label="Melden">
          <Icon name="flag" size={25} />
          <span>Melden</span>
        </button>
      </aside>

      <main className="detail-reel-content">
        <span className="feed-category">{movement.category}</span>
        <h1>{movement.title}</h1>
        <p>{movement.description}</p>

        <div className="feed-author-row detail-author-row">
          <span className="feed-avatar">
            {!hideAuthor && movement.authorAvatarUrl ? <img src={movement.authorAvatarUrl} alt="" /> : initials(name)}
          </span>
          <span>
            <strong>
              {name}
              {!hideAuthor && movement.authorRole === "admin" ? <small className="verified-badge">Admin</small> : null}
            </strong>
            <small>{movement.groupName} · {relativeTime(movement.createdAt)}</small>
          </span>
        </div>

        <div className="detail-meta-grid two">
          <span>
            <strong>{movement.supporters.toLocaleString("de-DE")}</strong>
            <small>Unterstützer</small>
          </span>
          <span>
            <strong>{statusLabels[movement.status]}</strong>
            <small>Status</small>
          </span>
        </div>

        <section className="detail-glass-block">
          <h2>Status</h2>
          <Timeline status={movement.status} />
        </section>

        <section className="detail-glass-block" ref={updateSectionRef}>
          <h2>Updates</h2>
          {canManage ? <button className="detail-update-jump" type="button" onClick={openUpdateForm}>Update posten</button> : null}
          {updateOpen ? (
            <div className="detail-update-form">
              <textarea ref={updateTextRef} value={updateText} onChange={(event) => setUpdateText(event.target.value)} rows={4} maxLength={500} placeholder="Was gibt es Neues?" />
              <button type="button" onClick={submitUpdate} disabled={busy || !updateText.trim()}>
                {busy ? "Postet..." : "Update posten"}
              </button>
            </div>
          ) : null}
          {movement.updates.length ? (
            <div className="updates-list reel-updates">
              {movement.updates.map((update) => (
                <article key={update.id} className="update-item">
                  <small>{update.createdAt}</small>
                  <p>{update.text}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="detail-empty-note">Noch keine Daten.</p>
          )}
        </section>
      </main>
    </div>
  );
}
