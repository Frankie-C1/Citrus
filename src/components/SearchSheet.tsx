import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import type { Movement } from "../types";
import { Icon } from "./Icon";

type SearchSheetProps = {
  open: boolean;
  movements: Movement[];
  onClose: () => void;
  onOpenMovement: (movement: Movement) => void;
};

function formatVotes(value: number) {
  if (value >= 1000) {
    return `${new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 }).format(value / 1000)}k`;
  }
  return value.toLocaleString("de-DE");
}

export function SearchSheet({ open, movements, onClose, onOpenMovement }: SearchSheetProps) {
  const [query, setQuery] = useState("");
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragStartY = useRef(0);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setDragY(0);
      setIsDragging(false);
      return;
    }
    window.setTimeout(() => inputRef.current?.focus(), 180);
  }, [open]);

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const source = normalized
      ? movements.filter((movement) =>
          [
            movement.title,
            movement.description,
            movement.groupName,
            movement.category,
            movement.authorUsername,
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalized),
        )
      : movements;

    return [...source]
      .sort((a, b) => (b.trendingScore ?? 0) + b.supporters - ((a.trendingScore ?? 0) + a.supporters))
      .slice(0, 12);
  }, [movements, query]);

  function openMovement(movement: Movement) {
    onClose();
    onOpenMovement(movement);
  }

  function startDrag(event: PointerEvent<HTMLButtonElement>) {
    if (!open) return;
    dragStartY.current = event.clientY;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: PointerEvent<HTMLButtonElement>) {
    if (!isDragging) return;
    setDragY(Math.max(0, event.clientY - dragStartY.current));
  }

  function endDrag(event: PointerEvent<HTMLButtonElement>) {
    if (!isDragging) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    setIsDragging(false);
    if (dragY > 44) {
      setDragY(0);
      onClose();
      return;
    }
    setDragY(0);
  }

  const sheetStyle = {
    "--search-sheet-drag": `${dragY}px`,
  } as CSSProperties;

  return (
    <>
      <div className={`search-sheet-backdrop ${open ? "open" : ""}`} onClick={onClose} />
      <aside
        className={`search-sheet ${open ? "open" : ""} ${isDragging ? "dragging" : ""}`}
        aria-hidden={!open}
        style={sheetStyle}
      >
        <button
          className="search-sheet-handle"
          type="button"
          aria-label="Suche herunterziehen"
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onLostPointerCapture={endDrag}
        />
        <div className="search-sheet-header">
          <div>
            <span>Suchen</span>
            <h2>Themen finden</h2>
          </div>
          <button className="home-round-button" type="button" onClick={onClose} aria-label="Suche schließen">
            <Icon name="x" size={20} />
          </button>
        </div>

        <label className="search-sheet-input">
          <Icon name="search" size={22} />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Themen, Ideen oder Gruppen"
          />
        </label>

        <div className="search-sheet-results">
          {results.length ? (
            results.map((movement) => (
              <button
                className="search-result-item"
                type="button"
                key={movement.id}
                onClick={() => openMovement(movement)}
              >
                <div className="search-result-thumb">
                  {movement.imageUrl ? <img src={movement.imageUrl} alt="" /> : <span>{movement.emoji}</span>}
                </div>
                <div>
                  <strong>{movement.title}</strong>
                  <span>
                    {movement.groupName} · {formatVotes(movement.supporters)} Stimmen
                  </span>
                </div>
                <Icon name="chevronRight" size={20} />
              </button>
            ))
          ) : (
            <div className="search-empty-state">
              <strong>Nichts gefunden.</strong>
              <span>Es werden nur echte gespeicherte Themen durchsucht.</span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
