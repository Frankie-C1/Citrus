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
  const resultsRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ x: number; y: number; scrollTop: number } | null>(null);

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

  function isInteractiveTarget(target: EventTarget | null) {
    const element = target instanceof HTMLElement ? target : null;
    return Boolean(element?.closest("input, textarea, select, button, a"));
  }

  function startDrag(event: PointerEvent<HTMLElement>) {
    if (!open) return;
    const element = event.target instanceof HTMLElement ? event.target : null;
    const fromHandle = Boolean(element?.closest(".search-sheet-handle"));
    const fromResults = Boolean(element?.closest(".search-sheet-results"));
    if (!fromHandle && !fromResults) return;
    if (!fromHandle && !fromResults && isInteractiveTarget(event.target)) return;
    dragStart.current = { x: event.clientX, y: event.clientY, scrollTop: resultsRef.current?.scrollTop ?? 0 };
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: PointerEvent<HTMLElement>) {
    const start = dragStart.current;
    if (!isDragging || !start) return;
    const deltaY = event.clientY - start.y;
    const deltaX = Math.abs(event.clientX - start.x);
    const currentScrollTop = resultsRef.current?.scrollTop ?? start.scrollTop;
    if (deltaY <= 0 || deltaX > deltaY * 1.25 || currentScrollTop > 0) return;
    event.preventDefault();
    setDragY(Math.max(0, deltaY));
  }

  function endDrag(event: PointerEvent<HTMLElement>) {
    if (!isDragging) return;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Mobile browsers may release pointer capture automatically.
    }
    setIsDragging(false);
    const shouldClose = dragY > 76;
    setDragY(0);
    dragStart.current = null;
    if (shouldClose) onClose();
  }

  const sheetStyle = {
    "--search-sheet-drag": `${dragY}px`,
  } as CSSProperties;

  return (
    <>
      <div
        className={`search-sheet-backdrop ${open ? "open" : ""}`}
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      />
      <aside
        className={`search-sheet ${open ? "open" : ""} ${isDragging ? "dragging" : ""}`}
        aria-hidden={!open}
        style={sheetStyle}
        onClick={(event) => event.stopPropagation()}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <button className="search-sheet-handle" type="button" aria-label="Suche herunterziehen" />
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

        <div className="search-sheet-results" ref={resultsRef}>
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
