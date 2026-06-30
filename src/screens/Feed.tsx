import { useEffect, useRef, useState, type PointerEvent, type UIEvent } from "react";
import type { Group, Movement } from "../types";
import { Icon } from "../components/Icon";
import { displayAuthorName, movementImageUrl, movementVisualStyle, shouldHideAuthorIdentity } from "../lib/movementPresentation";

type FeedProps = {
  movements: Movement[];
  groups: Group[];
  activeIndex: number;
  loading: boolean;
  groupFilterId?: string;
  newItemsAvailable?: boolean;
  onActiveIndexChange: (index: number | ((current: number) => number)) => void;
  onRefreshQueue: () => void;
  onClearGroupFilter: () => void;
  onSelectGroup: (groupId: string) => void;
  onOpenMovement: (movement: Movement) => void;
  onToggleSupport: (id: string) => void;
  onToggleDislike: (id: string) => void;
  onShare: (movement: Movement) => void;
  onReport: (movement: Movement) => void;
  onPlus: () => void;
};

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

function voteLabel(value: number) {
  return `${value.toLocaleString("de-DE")} ${value === 1 ? "Stimme" : "Stimmen"}`;
}

function copyMovementLink(movement: Movement) {
  const url = `${window.location.origin}${window.location.pathname}?movement=${movement.id}`;
  void navigator.clipboard?.writeText(url);
}

export function Feed({
  movements,
  groups,
  activeIndex,
  groupFilterId,
  loading,
  newItemsAvailable,
  onActiveIndexChange,
  onRefreshQueue,
  onClearGroupFilter,
  onSelectGroup,
  onOpenMovement,
  onToggleSupport,
  onToggleDislike,
  onShare,
  onReport,
  onPlus,
}: FeedProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [menuMovementId, setMenuMovementId] = useState<string | undefined>();
  const reelRef = useRef<HTMLDivElement>(null);
  const scrollTimer = useRef<number | undefined>(undefined);
  const clickTimer = useRef<number | undefined>(undefined);
  const tapRef = useRef<{ id: string; time: number; x: number; y: number } | null>(null);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const suppressClickUntilRef = useRef(0);
  const maxIndex = loading ? 0 : Math.max(0, movements.length - 1);
  const safeActiveIndex = Math.min(maxIndex, Math.max(0, activeIndex));
  const selectedGroup = groupFilterId ? groups.find((group) => group.id === groupFilterId) : undefined;

  useEffect(() => {
    if (activeIndex > maxIndex) onActiveIndexChange(maxIndex);
  }, [activeIndex, maxIndex, onActiveIndexChange]);

  useEffect(() => {
    const reel = reelRef.current;
    if (!reel) return;
    const target = reel.children.item(safeActiveIndex) as HTMLElement | null;
    target?.scrollIntoView({ block: "nearest" });
  }, [safeActiveIndex, movements.length]);

  useEffect(() => () => {
    window.clearTimeout(scrollTimer.current);
    window.clearTimeout(clickTimer.current);
  }, []);

  function updateActiveFromScroll(event: UIEvent<HTMLDivElement>) {
    window.clearTimeout(scrollTimer.current);
    const element = event.currentTarget;
    scrollTimer.current = window.setTimeout(() => {
      const next = Math.round(element.scrollTop / Math.max(1, element.clientHeight));
      onActiveIndexChange(Math.min(maxIndex, Math.max(0, next)));
    }, 90);
  }

  function chooseAll() {
    setFilterOpen(false);
    onClearGroupFilter();
  }

  function chooseGroup(groupId: string) {
    setFilterOpen(false);
    onSelectGroup(groupId);
  }

  function isInteractiveTarget(target: EventTarget | null) {
    return target instanceof HTMLElement && Boolean(target.closest("button, a, input, textarea, select"));
  }

  function startTap(event: PointerEvent<HTMLElement>) {
    if (isInteractiveTarget(event.target)) return;
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
  }

  function finishTap(event: PointerEvent<HTMLElement>, movement: Movement) {
    if (isInteractiveTarget(event.target)) return;
    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    if (!start) return;
    const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y);
    if (moved > 14) return;
    const now = Date.now();
    const previousTap = tapRef.current;
    if (
      previousTap &&
      previousTap.id === movement.id &&
      now - previousTap.time < 290 &&
      Math.hypot(event.clientX - previousTap.x, event.clientY - previousTap.y) < 34
    ) {
      window.clearTimeout(clickTimer.current);
      tapRef.current = null;
      suppressClickUntilRef.current = now + 360;
      onToggleSupport(movement.id);
      return;
    }
    tapRef.current = { id: movement.id, time: now, x: event.clientX, y: event.clientY };
  }

  function openMovementFromTap(movement: Movement) {
    if (Date.now() < suppressClickUntilRef.current) return;
    window.clearTimeout(clickTimer.current);
    clickTimer.current = window.setTimeout(() => onOpenMovement(movement), 230);
  }

  return (
    <div className="feed-screen fullscreen-feed">
      <header className="feed-topbar">
        <div className="feed-filter-wrap">
          <button className="feed-title-button" type="button" onClick={() => setFilterOpen((open) => !open)} aria-expanded={filterOpen}>
            <span>{selectedGroup ? selectedGroup.name : "Alle"}</span>
            <Icon name="chevron" size={18} />
          </button>
          {filterOpen ? (
            <div className="feed-filter-menu">
              <button className={!groupFilterId ? "active" : ""} type="button" onClick={chooseAll}>
                <span><strong>Alle</strong><small>Alle sichtbaren internen Anliegen</small></span>
                {!groupFilterId ? <Icon name="checkCircle" size={18} /> : null}
              </button>
              {groups.map((group) => (
                <button className={groupFilterId === group.id ? "active" : ""} type="button" key={group.id} onClick={() => chooseGroup(group.id)}>
                  <span><strong>{group.name}</strong><small>{group.category}</small></span>
                  {groupFilterId === group.id ? <Icon name="checkCircle" size={18} /> : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <button className="feed-camera-button" type="button" onClick={onPlus} aria-label="Beitrag erstellen">
          <Icon name="camera" size={22} />
        </button>
      </header>

      {newItemsAvailable ? (
        <button className="feed-new-items" type="button" onClick={onRefreshQueue}>
          Neue Beiträge anzeigen
        </button>
      ) : null}

      <div ref={reelRef} className="feed-reels" aria-label="Interner Citrus-Feed" onScroll={updateActiveFromScroll}>
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
          movements.map((movement, index) => {
            const authorName = displayAuthorName(movement);
            const imageUrl = movementImageUrl(movement);
            const hideAuthor = shouldHideAuthorIdentity(movement);
            const menuOpen = menuMovementId === movement.id;

            return (
              <article
                className={`feed-slide ${imageUrl ? "has-image" : "feed-slide-art"}`}
                key={movement.id}
                style={movementVisualStyle(movement)}
                onPointerDown={startTap}
                onPointerUp={(event) => finishTap(event, movement)}
              >
                {imageUrl ? (
                  <img className="feed-slide-image" src={imageUrl} alt="" loading={index < 2 ? "eager" : "lazy"} decoding="async" />
                ) : (
                  <div className="feed-slide-emoji" aria-hidden="true">{movement.emoji || "*"}</div>
                )}
                <div className="feed-slide-gradient" />

                <div className="feed-action-rail" aria-label="Beitragsaktionen">
                  <button className={`feed-action-button support ${movement.supportedByUser ? "active" : ""}`} type="button" onClick={() => onToggleSupport(movement.id)} aria-label="Unterstützen">
                    <Icon name="thumbsUp" size={28} />
                    <span>{movement.supporters.toLocaleString("de-DE")}</span>
                  </button>
                  <button className={`feed-action-button dislike ${movement.dislikedByUser ? "active" : ""}`} type="button" onClick={() => onToggleDislike(movement.id)} aria-label="Dislike">
                    <Icon name="thumbsDown" size={28} />
                    <span>{(movement.dislikes ?? 0).toLocaleString("de-DE")}</span>
                  </button>
                  <button className="feed-action-button" type="button" onClick={() => onOpenMovement(movement)} aria-label="Details öffnen">
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
                    <button className="feed-action-button" type="button" onClick={() => setMenuMovementId(menuOpen ? undefined : movement.id)} aria-label="Mehr Optionen" aria-expanded={menuOpen}>
                      <Icon name="more" size={26} />
                    </button>
                    {menuOpen ? (
                      <div className="feed-more-menu">
                        <button type="button" onClick={() => onOpenMovement(movement)}>Beitrag öffnen</button>
                        <button type="button" onClick={() => copyMovementLink(movement)}>Link kopieren</button>
                        <button type="button" onClick={() => onOpenMovement(movement)}>Autor anzeigen</button>
                        <button type="button" onClick={() => chooseGroup(movement.groupId)}>Gruppe filtern</button>
                        <button type="button" onClick={() => onReport(movement)}>Melden</button>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="feed-slide-content" role="button" tabIndex={0} onClick={() => openMovementFromTap(movement)} onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") onOpenMovement(movement);
                }}>
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
                    <span className="supporter-count">{voteLabel(movement.supporters)}</span>
                    <button className="feed-group-pill" type="button" onClick={(event) => {
                      event.stopPropagation();
                      chooseGroup(movement.groupId);
                    }}>
                      {movement.groupName}
                    </button>
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <article className="feed-slide feed-empty-slide">
            <div className="feed-slide-gradient" />
            <div className="feed-slide-content">
              <span className="feed-category">CITRUS</span>
              <h1>Keine Beiträge gefunden.</h1>
              <p>In deinen internen Gruppen gibt es aktuell keine Anliegen.</p>
            </div>
          </article>
        )}
      </div>
    </div>
  );
}
