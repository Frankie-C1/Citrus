import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";
import type { CreateMovementInput, Group, GroupMembership, MovementType, Scope } from "../types";
import { GroupVisual } from "./GroupVisual";
import { Icon } from "./Icon";

type BottomSheetProps = {
  open: boolean;
  groups: Group[];
  memberships: GroupMembership[];
  isAuthenticated: boolean;
  onClose: () => void;
  onAuth: () => void;
  onJoinCode: (code: string) => Promise<void> | void;
  onCreate: (movement: CreateMovementInput) => Promise<void> | void;
};

const typeLabels: Array<{ id: MovementType; emoji: string; label: string; hint: string }> = [
  { id: "problem", emoji: "!", label: "Problem", hint: "Etwas funktioniert nicht oder stört." },
  { id: "idea", emoji: "💡", label: "Idee", hint: "Ein neuer Vorschlag, der etwas besser macht." },
  { id: "improvement", emoji: "↗", label: "Verbesserung", hint: "Etwas Bestehendes soll optimiert werden." },
  { id: "question", emoji: "?", label: "Frage", hint: "Du willst etwas klären oder sichtbar machen." },
];

const quickEmoji = ["💡", "🌱", "🚲", "🏀", "📚", "🚌", "🎧", "✨"];

export function BottomSheet({
  open,
  groups,
  memberships,
  isAuthenticated,
  onClose,
  onAuth,
  onJoinCode,
  onCreate,
}: BottomSheetProps) {
  const [step, setStep] = useState(1);
  const [selectedScope, setSelectedScope] = useState<Scope | "">("");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [publicSearch, setPublicSearch] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [type, setType] = useState<MovementType | "">("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [emoji, setEmoji] = useState("💡");
  const [imageFile, setImageFile] = useState<File | undefined>();
  const [previewUrl, setPreviewUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [joining, setJoining] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);

  const internalMemberships = memberships.filter((membership) => membership.group.scope === "internal");
  const publicGroups = groups.filter((group) => group.scope === "external");
  const selectedGroup =
    selectedScope === "internal"
      ? internalMemberships.find((membership) => membership.groupId === selectedGroupId)?.group
      : groups.find((group) => group.id === selectedGroupId);

  const publicResults = useMemo(() => {
    const query = publicSearch.trim().toLowerCase();
    if (!query) return publicGroups.slice(0, 8);
    return publicGroups
      .filter((group) => `${group.name} ${group.category}`.toLowerCase().includes(query))
      .slice(0, 10);
  }, [publicGroups, publicSearch]);

  const hasDraft = Boolean(selectedScope || selectedGroupId || type || title || description || imageFile);
  const totalSteps = 6;
  const canContinue =
    (step === 1 && Boolean(selectedScope)) ||
    (step === 2 && Boolean(selectedGroup)) ||
    (step === 3 && Boolean(type)) ||
    (step === 4 && Boolean(title.trim()) && Boolean(description.trim())) ||
    step === 5;

  useEffect(() => {
    if (!open) {
      setDragY(0);
      setIsDragging(false);
    }
  }, [open]);

  useEffect(() => {
    if (!imageFile) {
      setPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  function resetDraft() {
    setStep(1);
    setSelectedScope("");
    setSelectedGroupId("");
    setPublicSearch("");
    setInviteCode("");
    setType("");
    setTitle("");
    setDescription("");
    setCategory("");
    setEmoji("💡");
    setImageFile(undefined);
    setSubmitting(false);
  }

  function requestClose() {
    if (hasDraft && !window.confirm("Entwurf verwerfen?")) return;
    resetDraft();
    onClose();
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
    if (dragY > 96) {
      setDragY(0);
      requestClose();
      return;
    }
    setDragY(0);
  }

  function goNext() {
    if (!canContinue) return;
    setStep((current) => Math.min(totalSteps, current + 1));
  }

  function autoNext(nextStep: number) {
    window.setTimeout(() => setStep(nextStep), 120);
  }

  async function joinCode() {
    if (inviteCode.length !== 5) return;
    setJoining(true);
    try {
      await onJoinCode(inviteCode);
      setInviteCode("");
    } finally {
      setJoining(false);
    }
  }

  async function submitMovement() {
    if (!selectedGroup || !type || !title.trim() || !description.trim()) return;
    setSubmitting(true);
    try {
      await onCreate({
        title: title.trim(),
        description: description.trim(),
        groupId: selectedGroup.id,
        groupName: selectedGroup.name,
        scope: selectedGroup.scope,
        type,
        category: category.trim() || selectedGroup.category,
        emoji,
        imageFile,
      });
      resetDraft();
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  const sheetStyle = {
    "--sheet-drag": `${dragY}px`,
  } as CSSProperties;

  return (
    <>
      <div className={`sheet-backdrop ${open ? "open" : ""}`} onClick={requestClose} />
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

        <div className="wizard-header">
          <button className="wizard-back" type="button" onClick={() => setStep((current) => Math.max(1, current - 1))} disabled={step === 1}>
            Zurück
          </button>
          <div>
            <strong>{step} von {totalSteps}</strong>
            <div className="wizard-dots">
              {Array.from({ length: totalSteps }).map((_, index) => (
                <span className={index + 1 <= step ? "active" : ""} key={index} />
              ))}
            </div>
          </div>
          <button className="icon-button" type="button" onClick={requestClose} aria-label="Schließen">
            <Icon name="x" size={20} />
          </button>
        </div>

        <div className="wizard-body">
          {step === 1 ? (
            <section className="wizard-step">
              <h2>Wo möchtest du etwas bewegen?</h2>
              <div className="context-tiles">
                <button
                  className={`context-tile ${selectedScope === "internal" ? "active" : ""}`}
                  type="button"
                  onClick={() => {
                    setSelectedScope("internal");
                    setSelectedGroupId("");
                    autoNext(2);
                  }}
                >
                  <span>🏛</span>
                  <strong>Intern</strong>
                  <small>Für Gruppen, denen du beigetreten bist.</small>
                </button>
                <button
                  className={`context-tile ${selectedScope === "external" ? "active" : ""}`}
                  type="button"
                  onClick={() => {
                    setSelectedScope("external");
                    setSelectedGroupId(publicGroups[0]?.id ?? "");
                    setCategory(publicGroups[0]?.category ?? "");
                    autoNext(2);
                  }}
                >
                  <span>✨</span>
                  <strong>Extern</strong>
                  <small>Für Apps, Marken, Städte und Produkte.</small>
                </button>
              </div>
            </section>
          ) : null}

          {step === 2 && selectedScope === "internal" ? (
            <section className="wizard-step">
              <h2>Interne Gruppe wählen</h2>
              {!isAuthenticated ? (
                <button className="public-create-row" type="button" onClick={onAuth}>
                  <span className="public-icon">C</span>
                  <span>
                    <strong>Anmelden</strong>
                    <small>Melde dich an, um interne Gruppen zu sehen.</small>
                  </span>
                  <Icon name="chevron" size={17} />
                </button>
              ) : internalMemberships.length ? (
                <div className="wizard-list">
                  {internalMemberships.map((membership) => (
                    <button
                      className={`public-result ${selectedGroupId === membership.groupId ? "active" : ""}`}
                      type="button"
                      key={membership.id}
                      onClick={() => {
                        setSelectedGroupId(membership.groupId);
                        setCategory(membership.group.category);
                        autoNext(3);
                      }}
                    >
                      <GroupVisual group={membership.group} className="public-avatar" />
                      <span>
                        <strong>{membership.group.name}</strong>
                        <small>{membership.group.category} · Intern</small>
                      </span>
                      <Icon name="chevron" size={16} />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="empty-state compact-empty">
                  <strong>Keine interne Gruppe.</strong>
                  <span>Gib einen 5-stelligen Einladungscode ein.</span>
                  <div className="invite-mini">
                    <input
                      value={inviteCode}
                      onChange={(event) => setInviteCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5))}
                      placeholder="5-stelliger Code"
                      maxLength={5}
                    />
                    <button type="button" onClick={joinCode} disabled={inviteCode.length !== 5 || joining}>
                      {joining ? "Beitreten..." : "Gruppe beitreten"}
                    </button>
                  </div>
                </div>
              )}
            </section>
          ) : null}

          {step === 2 && selectedScope === "external" ? (
            <section className="wizard-step">
              <h2>Externe Gruppe wählen</h2>
              <label className="public-search">
                <Icon name="search" size={18} />
                <input
                  value={publicSearch}
                  onChange={(event) => setPublicSearch(event.target.value)}
                  placeholder="Apps, Marken oder Städte suchen"
                />
              </label>
              <span className="wizard-subtitle">Häufig verwendet</span>
              <div className="wizard-list">
                {publicResults.map((group) => (
                  <button
                    className={`public-result ${selectedGroupId === group.id ? "active" : ""}`}
                    type="button"
                    key={group.id}
                    onClick={() => {
                      setSelectedGroupId(group.id);
                      setCategory(group.category);
                      setPublicSearch(group.name);
                      autoNext(3);
                    }}
                  >
                    <GroupVisual group={group} className="public-avatar" />
                    <span>
                      <strong>{group.name}</strong>
                      <small>{group.category}</small>
                    </span>
                    <Icon name="chevron" size={16} />
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {step === 3 ? (
            <section className="wizard-step">
              <h2>Was möchtest du teilen?</h2>
              <div className="type-list">
                {typeLabels.map((item) => (
                  <button
                    className={`type-option ${type === item.id ? "active" : ""}`}
                    type="button"
                    key={item.id}
                    onClick={() => {
                      setType(item.id);
                      autoNext(4);
                    }}
                  >
                    <span>{item.emoji}</span>
                    <strong>{item.label}</strong>
                    <small>{item.hint}</small>
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {step === 4 ? (
            <section className="wizard-step">
              <h2>Beschreibe deine Bewegung</h2>
              <label>
                Titel
                <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={90} placeholder="Was soll sich bewegen?" />
                <small>{title.length}/90</small>
              </label>
              <label>
                Beschreibung
                <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={800} rows={6} placeholder="Beschreibe konkret, was sich ändern soll." />
                <small>{description.length}/800</small>
              </label>
              <label>
                Kategorie
                <input value={category} onChange={(event) => setCategory(event.target.value)} maxLength={40} placeholder={selectedGroup?.category || "Optional"} />
              </label>
              <div className="conduct-inline">
                Bitte bleib sachlich. Keine Beleidigungen, keine Hetze, keine verfassungsfeindlichen Inhalte und keine persönlichen Angriffe.
              </div>
            </section>
          ) : null}

          {step === 5 ? (
            <section className="wizard-step">
              <h2>Wie soll dein Thema erscheinen?</h2>
              <div className="emoji-row">
                <label>
                  Emoji wählen
                  <input value={emoji} onChange={(event) => setEmoji(event.target.value.slice(0, 4))} maxLength={4} />
                </label>
                <div>
                  {quickEmoji.map((item) => (
                    <button type="button" key={item} onClick={() => setEmoji(item)}>{item}</button>
                  ))}
                </div>
              </div>
              {previewUrl ? (
                <div className="image-preview">
                  <img src={previewUrl} alt="" />
                  <button type="button" onClick={() => setImageFile(undefined)}>Bild entfernen</button>
                </div>
              ) : null}
              <label className="file-picker">
                <span>Foto wählen</span>
                <small>{imageFile ? imageFile.name : "Wird vor Upload auf AVIF oder WebP komprimiert."}</small>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/avif"
                  onChange={(event) => setImageFile(event.target.files?.[0])}
                />
              </label>
            </section>
          ) : null}

          {step === 6 ? (
            <section className="wizard-step">
              <h2>Vorschau</h2>
              <article className="movement-card preview-card">
                {previewUrl ? <img className="reel-image" src={previewUrl} alt="" /> : <span className="movement-emoji">{emoji}</span>}
                <h3>{title || "Dein Titel"}</h3>
                <p>{selectedGroup?.name} · {typeLabels.find((item) => item.id === type)?.label || "Typ"} · Eingereicht</p>
                <div className="movement-meta">
                  <strong>0 Unterstützer</strong>
                  <span>{description.slice(0, 110)}</span>
                </div>
              </article>
            </section>
          ) : null}
        </div>

        <div className="wizard-footer">
          {step < totalSteps ? (
            <button className="primary-button" type="button" onClick={goNext} disabled={!canContinue}>
              Weiter
            </button>
          ) : (
            <button className="primary-button" type="button" onClick={submitMovement} disabled={submitting || !selectedGroup || !type || !title.trim() || !description.trim()}>
              {submitting ? "Wird gespeichert..." : "Bewegung starten"}
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
