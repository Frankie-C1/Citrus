import type { Movement, Scope } from "../types";
import { Icon } from "../components/Icon";
import { MovementReelCard } from "../components/MovementReelCard";

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
};

export function Feed({
  movements,
  scopeFilter,
  search,
  groupFilterId,
  loading,
  onScopeChange,
  onSearchChange,
  onClearGroupFilter,
  onOpenMovement,
  onToggleSupport,
  onShare,
  onReport,
}: FeedProps) {
  const groupName = groupFilterId ? movements.find((movement) => movement.groupId === groupFilterId)?.groupName : "";

  return (
    <div className="feed-screen">
      <header className="reel-feed-header">
        <div>
          <span className="eyebrow">Bewegungen</span>
          <h1>Mein Feed</h1>
        </div>
        <select
          className="feed-filter-select"
          value={scopeFilter}
          onChange={(event) => onScopeChange(event.target.value as Scope | "all")}
          aria-label="Feed filtern"
        >
          <option value="all">Alle</option>
          <option value="internal">Intern</option>
          <option value="external">Öffentlich</option>
        </select>
      </header>

      <div className="reel-search-row">
        <label className="reel-search">
          <Icon name="search" size={18} />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Suchen"
          />
        </label>
        {groupFilterId ? (
          <button className="filter-chip compact" type="button" onClick={onClearGroupFilter}>
            {groupName || "Gruppe"} <Icon name="x" size={14} />
          </button>
        ) : null}
      </div>

      <div className="reel-feed">
        {loading ? (
          <div className="reel-card skeleton-card">
            <span />
            <strong />
            <p />
          </div>
        ) : movements.length ? (
          movements.map((movement) => (
            <MovementReelCard
              key={movement.id}
              movement={movement}
              onOpen={onOpenMovement}
              onToggleSupport={onToggleSupport}
              onShare={onShare}
              onReport={onReport}
            />
          ))
        ) : (
          <div className="reel-card empty-reel">
            <strong>Nichts gefunden.</strong>
            <span>Ändere Suche oder Filter, um weitere Bewegungen zu sehen.</span>
          </div>
        )}
      </div>
    </div>
  );
}
