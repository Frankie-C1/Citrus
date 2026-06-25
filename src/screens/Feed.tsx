import { useEffect, useRef, useState } from "react";
import type { Movement, Scope } from "../types";
import { Icon } from "../components/Icon";
import { displayAuthorName, movementImageUrl, movementVisualStyle, shouldHideAuthorIdentity } from "../lib/movementPresentation";

type FeedProps = {
  movements: Movement[];
  scopeFilter: Scope | "all";
  search: string;
  groupFilterId?: string;
  loading: boolean;
  onScopeChange: (scope: Scope | "all") => void;
  onSearchChange: (search: string) => void;
  onClearGroupFilter: () => void;
  onOpenMovement: (movement: Movement) => void;
  onToggleSupport: (id: string) => void;
  onShare: (movement: Movement) => void;
  onReport: (movement: Movement) => void;
  onOpenGroup: (groupId: string) => void;
  onPlus: () => void;
};

const filterOptions: Array<{ id: Scope | "all"; label: string; hint: string }> = [
  { id: "internal", label: "Intern", hint: "Nur deine Gruppen" },
  { id: "external", label: "Extern", hint: "Andere Gruppen" },
  { id: "all", label: "Öffentlich / Alles", hint: "Alle Beiträge" },
];

function relativeTime(value?: string) {
  if (!value) return "";
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.round(diff / 60000));
  if (minutes < 60) return `vor ${minutes} Min.`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  const days = Math.round(hours / 24);
  if (days < 7) return `vor ${days} Tagen`;
  return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "short" }).format(new Date(value));
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

export function Feed({
  movements,
  scopeFilter,
  groupFilterId,
  loading,
  onScopeChange,
  onClearGroupFilter,
  onOpenMovement,
  onToggleSupport,
  onShare,
  onReport,
  onOpenGroup,
  onPlus,
}: FeedProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [menuMovementId, setMenuMovementId] = useState<string | undefined>();
  const [activeIndex, setActiveIndex] = useState(0);
  const filterRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef({ x: 0, y: 0 });
  const ignoreNextClick = useRef(false);
  const wheelLocked = useRef(false);
  const lastTap = useRef(0);
  const activeFilter = filterOptions.find((option) => option.id === scopeFilter) ?? filterOptions[2];
  const groupName = groupFilterId ? movements.find((movement) => movement.groupId === groupFilterId)?.groupName : "";

  useEffect(() => {
    setActiveIndex((index) => Math.min(index, Math.max(0, movements.length)));
  }, [movements.length]);

  useEffect(() => {
    if (!filterOpen) return;
    function closeOnOutside(event: PointerEvent) {
      if (!filterRef.current?.contains(event.target as Node)) setFilterOpen(false);
    }
    window.addEventListener("pointerdown", closeOnOutside);
    return () => window.removeEventListener("pointerdown", closeOnOutside);
  }, [filterOpen]);

  function snapToSlide(direction: 1 | -1) {
    const maxIndex = Math.max(0, movements.length);
    setActiveIndex((index) => Math.min(maxIndex, Math.max(0, index + direction)));
  }

  useEffect(() => {
    function handleTouchStart(event: TouchEvent) {
      const touch = event.touches[0];
      if (!touch) return;
      touchStart.current = { x: touch.clientX, y: touch.clientY };
    }

    function handleTouchEnd(event: TouchEvent) {
      const touch = event.changedTouches[0];
      if (!touch) return;
      const deltaY = touchStart.current.y - touch.clientY;
      const deltaX = touchStart.current.x - touch.clientX;
      if (Math.abs(deltaY) <= 34 || Math.abs(deltaY) <= Math.abs(deltaX) * 1.15) return;
      ignoreNextClick.current = true;
      snapToSlide(deltaY > 0 ? 1 : -1);
      window.setTimeout(() => {
        ignoreNextClick.current = false;
      }, 280);
    }

    function handleWheel(event: WheelEvent) {
      if (wheelLocked.current || Math.abs(event.deltaY) < 18) return;
      event.preventDefault();
      wheelLocked.current = true;
      snapToSlide(event.deltaY > 0 ? 1 : -1);
      window.setTimeout(() => {
        wheelLocked.current = false;
      }, 360);
    }

    window.addEventListener("touchstart", handleTouchStart, { passive: true, capture: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true, capture: true });
    window.addEventListener("wheel", handleWheel, { passive: false, capture: true });
    return () => {
      window.removeEventListener("touchstart", handleTouchStart, { capture: true });
      window.removeEventListener("touchend", handleTouchEnd, { capture: true });
      window.removeEventListener("wheel", handleWheel, { capture: true });
    };
  }, [movements.length]);

  function openFromContent(movement: Movement) {
    if (ignoreNextClick.current) return;
    onOpenMovement(movement);
  }

  function likeFromImage(movement: Movement) {
    if (!movement.supportedByUser) onToggleSupport(movement.id);
  }

  function handleImageTap(movement: Movement) {
    const now = Date.now();
    if (now - lastTap.current < 320) {
      ignoreNextClick.current = true;
      likeFromImage(movement);
      window.setTimeout(() => {
        ignoreNextClick.current = false;
      }, 220);
    }
    lastTap.current = now;
  }

  return (
    <div className="feed-screen fullscreen-feed">
      <header className="feed-topbar">
        <div className="feed-filter-wrap" ref={filterRef}>
          <button
            className="feed-title-button"
            type="button"
            onClick={() => setFilterOpen((open) => !open)}
            aria-expanded={filterOpen}
          >
            <span>Feed</span>
            <Icon name="chevron" size={18} />
          </button>
          {filterOpen ? (
            <div className="feed-filter-menu">
              {filterOptions.map((option) => (
                <button
                  type="button"
                  key={option.id}
                  className={scopeFilter === option.id ? "active" : ""}
                  onClick={() => {
                    onScopeChange(option.id);
                    setFilterOpen(false);
                  }}
                >
                  <span>
                    <strong>{option.label}</strong>
                    <small>{option.hint}</small>
                  </span>
                  {scopeFilter === option.id ? <Icon name="checkCircle" size={18} /> : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <button className="feed-camera-button" type="button" onClick={onPlus} aria-label="Beitrag erstellen">
          <Icon name="camera" size={22} />
        </button>
      </header>

      {groupFilterId ? (
        <button className="feed-group-filter" type="button" onClick={onClearGroupFilter}>
          {groupName || "Gruppe"} <Icon name="x" size={14} />
        </button>
      ) : null}

      <div
        className="feed-reels"
        aria-label={`${activeFilter.label} Feed`}
        onWheel={(event) => {
          if (wheelLocked.current || Math.abs(event.deltaY) < 24) return;
          wheelLocked.current = true;
          snapToSlide(event.deltaY > 0 ? 1 : -1);
          window.setTimeout(() => {
            wheelLocked.current = false;
          }, 430);
        }}
        onTouchStart={(event) => {
          const touch = event.touches[0];
          touchStart.current = { x: touch.clientX, y: touch.clientY };
        }}
        onTouchEnd={(event) => {
          const touch = event.changedTouches[0];
          const deltaY = touchStart.current.y - touch.clientY;
          const deltaX = touchStart.current.x - touch.clientX;
          if (Math.abs(deltaY) > 44 && Math.abs(deltaY) > Math.abs(deltaX) * 1.25) {
            ignoreNextClick.current = true;
            snapToSlide(deltaY > 0 ? 1 : -1);
            window.setTimeout(() => {
              ignoreNextClick.current = false;
            }, 260);
          }
        }}
      >
        <div className="feed-reel-track" style={{ transform: `translate3d(0, -${activeIndex * 100}dvh, 0)` }}>
        {loading ? (
          <article className="feed-slide feed-slide-loading">
            <div className="feed-slide-gradient" />
            <div className="feed-slide-content">
              <span className="feed-category skeleton-line" />
              <span className="feed-title-skeleton skeleton-line" />
              <span className="feed-copy-skeleton skeleton-line" />
            </div>
          </article>
          ) : movements.length ? (
            <>
            {movements.map((movement, index) => {
            const authorName = displayAuthorName(movement);
            const imageUrl = movementImageUrl(movement);
            const hideAuthor = shouldHideAuthorIdentity(movement);
            const menuOpen = menuMovementId === movement.id;

            return (
              <article className={`feed-slide ${imageUrl ? "has-image" : "feed-slide-art"}`} key={movement.id} style={movementVisualStyle(movement)}>
                {imageUrl ? (
                  <img
                    className="feed-slide-image"
                    src={imageUrl}
                    alt=""
                    loading={index < 2 ? "eager" : "lazy"}
                    decoding="async"
                    onDoubleClick={() => likeFromImage(movement)}
                    onPointerUp={(event) => {
                      if (event.pointerType === "touch") handleImageTap(movement);
                    }}
                  />
                ) : (
                  <div className="feed-slide-emoji" aria-hidden="true">{movement.emoji || "*"}</div>
                )}
                <div className="feed-slide-gradient" />

                <div className="feed-action-rail" aria-label="Beitragsaktionen">
                  <button
                    className={`feed-action-button support ${movement.supportedByUser ? "active" : ""}`}
                    type="button"
                    onClick={() => onToggleSupport(movement.id)}
                    aria-label="Unterstützen"
                  >
                    <Icon name="star" size={28} />
                    <span>{movement.supporters.toLocaleString("de-DE")}</span>
                  </button>
                  <button
                    className="feed-action-button"
                    type="button"
                    onClick={() => onOpenMovement(movement)}
                    aria-label="Kommentare öffnen"
                  >
                    <Icon name="message" size={27} />
                    <span>Details</span>
                  </button>
                  <button className="feed-action-button" type="button" onClick={() => onShare(movement)} aria-label="Teilen">
                    <Icon name="share" size={26} />
                    <span>Teilen</span>
                  </button>
                  <button className="feed-action-button" type="button" onClick={() => onReport(movement)} aria-label="Melden">
                    <Icon name="flag" size={25} />
                    <span>Melden</span>
                  </button>
                  <div className="feed-more-wrap">
                    <button
                      className="feed-action-button"
                      type="button"
                      onClick={() => setMenuMovementId(menuOpen ? undefined : movement.id)}
                      aria-label="Mehr Optionen"
                      aria-expanded={menuOpen}
                    >
                      <Icon name="more" size={26} />
                    </button>
                    {menuOpen ? (
                      <div className="feed-more-menu">
                        <button type="button" onClick={() => onOpenMovement(movement)}>Beitrag öffnen</button>
                        <button type="button" onClick={() => copyMovementLink(movement)}>Link kopieren</button>
                        <button type="button" onClick={() => onOpenMovement(movement)}>Autor anzeigen</button>
                        <button type="button" onClick={() => onOpenGroup(movement.groupId)}>Gruppe öffnen</button>
                        <button type="button" onClick={() => onReport(movement)}>Melden</button>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div
                  className="feed-slide-content"
                  role="button"
                  tabIndex={0}
                  onClick={() => openFromContent(movement)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") onOpenMovement(movement);
                  }}
                >
                  <span className="feed-category">{movement.category}</span>
                  <h1>{movement.title}</h1>
                  <p className="feed-description">{movement.description}</p>

                  <div className="feed-author-row">
                    <span className="feed-avatar">
                      {!hideAuthor && movement.authorAvatarUrl ? <img src={movement.authorAvatarUrl} alt="" /> : initials(authorName)}
                    </span>
                    <span>
                      <strong>
                        {authorName}
                        {!hideAuthor && movement.authorRole === "admin" ? <small className="verified-badge">Admin</small> : null}
                      </strong>
                      <small>{movement.groupName} · {relativeTime(movement.createdAt)}</small>
                    </span>
                  </div>

                  <div className="feed-bottom-meta">
                    {movement.supporterPreviews?.length ? (
                      <span className="supporter-stack" aria-hidden="true">
                        {movement.supporterPreviews.map((supporter) => (
                          <span className="supporter-avatar" key={supporter.id}>
                            {supporter.avatarUrl ? <img src={supporter.avatarUrl} alt="" /> : initials(supporter.name)}
                          </span>
                        ))}
                      </span>
                    ) : null}
                    <span className="supporter-count">{movement.supporters.toLocaleString("de-DE")} Unterstützer</span>
                    <button
                      className="feed-group-pill"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpenGroup(movement.groupId);
                      }}
                    >
                      {movement.groupName}
                    </button>
                  </div>
                </div>
              </article>
            );
            })}
            <article className="feed-slide feed-end-slide">
              <div className="feed-slide-gradient" />
              <div className="feed-slide-content">
                <span className="feed-category">DU BIST DRAN</span>
                <h1>Alles gesehen.</h1>
                <p className="feed-description">Starte jetzt selbst einen Beitrag und bring dein Thema in Bewegung.</p>
                <button className="feed-end-cta" type="button" onClick={onPlus}>
                  Beitrag posten
                </button>
              </div>
            </article>
            </>
          ) : (
          <article className="feed-slide feed-empty-slide">
            <div className="feed-slide-gradient" />
            <div className="feed-slide-content">
              <span className="feed-category">CITRUS</span>
              <h1>Keine Beiträge gefunden.</h1>
              <p>Für diesen Filter gibt es aktuell keine Bildbeiträge.</p>
            </div>
          </article>
        )}
        </div>
      </div>
    </div>
  );
}
