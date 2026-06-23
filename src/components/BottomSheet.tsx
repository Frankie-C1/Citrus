import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type PointerEvent,
} from "react";
import type { CreateMovementInput, Group, MovementType } from "../types";
import { Icon } from "./Icon";

type BottomSheetProps = {
  open: boolean;
  groups: Group[];
  onClose: () => void;
  onCreate: (movement: CreateMovementInput) => void;
};

const typeLabels: Array<{ id: MovementType; label: string }> = [
  { id: "problem", label: "Problem" },
  { id: "idea", label: "Idee" },
  { id: "improvement", label: "Verbesserung" },
  { id: "question", label: "Frage" },
];

const typeDescriptions: Record<MovementType, string> = {
  problem: "Etwas blockiert Wirkung.",
  idea: "Ein neuer Impuls.",
  improvement: "Etwas kann besser werden.",
  question: "Ein Thema braucht Klarheit.",
};

export function BottomSheet({ open, groups, onClose, onCreate }: BottomSheetProps) {
  const [selectedGroupId, setSelectedGroupId] = useState(groups[0]?.id ?? "");
  const [publicSearch, setPublicSearch] = useState("");
  const [type, setType] = useState<MovementType>("idea");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);

  const selectedGroup = groups.find((group) => group.id === selectedGroupId) ?? groups[0];
  const internalGroups = groups.filter((group) => group.scope === "internal");
  const publicGroups = groups.filter((group) => group.scope === "external");
  const publicResults = useMemo(() => {
    const query = publicSearch.trim().toLowerCase();
    const pool = publicGroups.length ? publicGroups : groups;
    if (!query) return pool.slice(0, 5);
    return pool
      .filter((group) => `${group.name} ${group.category}`.toLowerCase().includes(query))
      .slice(0, 6);
  }, [groups, publicGroups, publicSearch]);

  useEffect(() => {
    if (!open) {
      setDragY(0);
      setIsDragging(false);
    }
  }, [open]);

  useEffect(() => {
    if (!selectedGroupId && groups[0]) setSelectedGroupId(groups[0].id);
  }, [groups, selectedGroupId]);

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
    if (dragY > 96) {
      onClose();
      setDragY(0);
      return;
    }
    setDragY(0);
  }

  function submitMovement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedGroup || !title.trim()) return;

    onCreate({
      title: title.trim(),
      description: description.trim() || "Ein neuer Impuls aus der Citrus-Community.",
      groupId: selectedGroup.id,
      groupName: selectedGroup.name,
      scope: selectedGroup.scope,
      type,
      category: selectedGroup.category,
    });

    setTitle("");
    setDescription("");
    setType("idea");
    setPublicSearch("");
    onClose();
  }

  const sheetStyle = {
    "--sheet-drag": `${dragY}px`,
  } as CSSProperties;

  return (
    <>
      <div className={`sheet-backdrop ${open ? "open" : ""}`} onClick={onClose} />
      <aside
        className={`bottom-sheet ${open ? "open" : ""} ${isDragging ? "dragging" : ""}`}
        aria-hidden={!open}
        style={sheetStyle}
      >
        <button
          className="sheet-handle"
          type="button"
          aria-label="Bottom Sheet herunterziehen"
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        />
        <div className="sheet-header">
          <div>
            <span className="eyebrow">Citrus</span>
            <h2>Wo möchtest du beitragen?</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Schließen">
            <Icon name="x" size={20} />
          </button>
        </div>

        <div className="sheet-section">
          <h3>Intern</h3>
          <div className="internal-grid">
            {internalGroups.map((group) => (
              <button
                className={`internal-card ${selectedGroupId === group.id ? "active" : ""}`}
                type="button"
                key={group.id}
                onClick={() => setSelectedGroupId(group.id)}
              >
                <span>{group.icon || group.name.slice(0, 1)}</span>
                <strong>{group.name}</strong>
                <small>{group.category}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="sheet-section public-section">
          <h3>Öffentlich</h3>
          <button
            className="public-create-row"
            type="button"
            onClick={() => {
              const firstPublicGroup = publicGroups[0];
              if (firstPublicGroup) setSelectedGroupId(firstPublicGroup.id);
            }}
          >
            <span className="public-icon">+</span>
            <span>
              <strong>Öffentlichen Beitrag erstellen</strong>
              <small>Für Apps, Marken, Städte oder Produkte</small>
            </span>
            <Icon name="chevron" size={17} />
          </button>
          <label className="public-search">
            <Icon name="search" size={18} />
            <input
              value={publicSearch}
              onChange={(event) => setPublicSearch(event.target.value)}
              placeholder="Öffentliche Gruppen, Apps oder Marken suchen"
            />
          </label>
          <div className="public-results">
            {publicResults.map((group) => (
              <button
                className={`public-result ${selectedGroupId === group.id ? "active" : ""}`}
                type="button"
                key={group.id}
                onClick={() => {
                  setSelectedGroupId(group.id);
                  setPublicSearch(group.name);
                }}
              >
                <span className="public-avatar">{group.icon || group.name.slice(0, 1)}</span>
                <span>
                  <strong>{group.name}</strong>
                  <small>{group.category} · Öffentlich</small>
                </span>
                <Icon name="chevron" size={16} />
              </button>
            ))}
          </div>
          {selectedGroup ? <div className="selected-context">Ausgewählt: {selectedGroup.name}</div> : null}
        </div>

        <form className="create-form" onSubmit={submitMovement}>
          <h3>Was möchtest du teilen?</h3>
          <div className="type-list">
            {typeLabels.map((item) => (
              <button
                className={`type-option ${type === item.id ? "active" : ""}`}
                type="button"
                key={item.id}
                onClick={() => setType(item.id)}
              >
                <span />
                <strong>{item.label}</strong>
                <small>{typeDescriptions[item.id]}</small>
              </button>
            ))}
          </div>
          <label>
            Titel
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Was soll sich bewegen?"
              maxLength={80}
            />
          </label>
          <label>
            Kurze Beschreibung
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Kurz, konkret und lösungsorientiert."
              rows={3}
              maxLength={220}
            />
          </label>
          <label>
            Gruppe/Kontext
            <select value={selectedGroupId} onChange={(event) => setSelectedGroupId(event.target.value)}>
              {groups.map((group) => (
                <option value={group.id} key={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </label>
          <button className="primary-button" type="submit" disabled={!title.trim() || !selectedGroup}>
            Bewegung starten
          </button>
        </form>
      </aside>
    </>
  );
}
