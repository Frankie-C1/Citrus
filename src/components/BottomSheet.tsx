import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { BackgroundType, CreateMovementInput, Group, GroupMembership, MovementType } from "../types";
import { GroupVisual } from "./GroupVisual";
import { Icon } from "./Icon";

const DRAFT_KEY = "citrus_post_draft_session";

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
  { id: "idea", emoji: "*", label: "Idee", hint: "Ein neuer Vorschlag, der etwas besser macht." },
  { id: "improvement", emoji: "+", label: "Verbesserung", hint: "Etwas Bestehendes soll optimiert werden." },
  { id: "question", emoji: "?", label: "Frage", hint: "Du willst etwas klären oder sichtbar machen." },
];

const quickEmoji = ["*", "+", "!", "?", "C", "#", "<>", "~"];

const colorOptions = [
  { label: "Citrus Grün", value: "#7AC943" },
  { label: "Warm Orange", value: "#FF7A1A" },
  { label: "Tiefes Blau", value: "#123C69" },
  { label: "Violett", value: "#7C3AED" },
  { label: "Creme Gold", value: "#F7D774" },
  { label: "Schwarz Gold", value: "#111111" },
];

const gradientOptions = [
  { label: "Sunrise", value: "linear-gradient(135deg, #FF7A1A, #FFD400)" },
  { label: "Ocean", value: "linear-gradient(135deg, #0EA5E9, #123C69)" },
  { label: "Ember", value: "linear-gradient(135deg, #111111, #FF7A1A)" },
  { label: "Forest", value: "linear-gradient(135deg, #064E3B, #7AC943)" },
];

type Draft = {
  step: number;
  selectedGroupId: string;
  inviteCode: string;
  type: MovementType | "";
  title: string;
  description: string;
  category: string;
  emoji: string;
  backgroundType: BackgroundType;
  backgroundValue: string;
  isAnonymous: boolean;
};

function isInteractiveTarget(target: EventTarget | null) {
  const element = target instanceof HTMLElement ? target : null;
  if (element?.closest(".sheet-handle")) return false;
  return Boolean(element?.closest("input, textarea, select, button:not(.sheet-handle), a"));
}

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
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [type, setType] = useState<MovementType | "">("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [emoji, setEmoji] = useState("*");
  const [imageFile, setImageFile] = useState<File | undefined>();
  const [imageError, setImageError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [backgroundType, setBackgroundType] = useState<BackgroundType>("emoji");
  const [backgroundValue, setBackgroundValue] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [joining, setJoining] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number; scrollTop: number } | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const internalMemberships = memberships.filter((membership) => membership.group.scope === "internal");
  const internalGroups = groups.filter((group) => group.scope === "internal");
  const selectedGroup =
    internalMemberships.find((membership) => membership.groupId === selectedGroupId)?.group ??
    internalGroups.find((group) => group.id === selectedGroupId);

  const hasDraft = Boolean(
    selectedGroupId || type || title.trim() || description.trim() || category.trim() || imageFile || backgroundValue || isAnonymous,
  );
  const totalSteps = 5;
  const canContinue =
    (step === 1 && Boolean(selectedGroup)) ||
    (step === 2 && Boolean(type)) ||
    (step === 3 && Boolean(title.trim())) ||
    step === 4;

  useEffect(() => {
    if (!open) {
      setDragY(0);
      setIsDragging(false);
      dragStart.current = null;
      return;
    }

    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw || hasDraft) return;
    try {
      const draft = JSON.parse(raw) as Partial<Draft>;
      setStep(Math.min(totalSteps, Math.max(1, Number(draft.step) || 1)));
      setSelectedGroupId(draft.selectedGroupId || "");
      setInviteCode(draft.inviteCode || "");
      setType((draft.type as MovementType | "") || "");
      setTitle(draft.title || "");
      setDescription(draft.description || "");
      setCategory(draft.category || "");
      setEmoji(draft.emoji || "*");
      setBackgroundType(draft.backgroundType || "emoji");
      setBackgroundValue(draft.backgroundValue || "");
      setIsAnonymous(Boolean(draft.isAnonymous));
    } catch {
      sessionStorage.removeItem(DRAFT_KEY);
    }
  }, [hasDraft, open]);

  useEffect(() => {
    if (!open || !hasDraft) return;
    const draft: Draft = {
      step,
      selectedGroupId,
      inviteCode,
      type,
      title,
      description,
      category,
      emoji,
      backgroundType,
      backgroundValue,
      isAnonymous,
    };
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [backgroundType, backgroundValue, category, description, emoji, hasDraft, inviteCode, isAnonymous, open, selectedGroupId, step, title, type]);

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
    sessionStorage.removeItem(DRAFT_KEY);
    setStep(1);
    setSelectedGroupId("");
    setInviteCode("");
    setType("");
    setTitle("");
    setDescription("");
    setCategory("");
    setEmoji("*");
    setImageFile(undefined);
    setImageError("");
    setBackgroundType("emoji");
    setBackgroundValue("");
    setIsAnonymous(false);
    setSubmitting(false);
  }

  function requestClose() {
    if (hasDraft) {
      const keepDraft = window.confirm("Entwurf behalten? OK behält ihn, Abbrechen verwirft ihn.");
      if (!keepDraft) resetDraft();
      onClose();
      return;
    }
    resetDraft();
    onClose();
  }

  function startDrag(event: ReactPointerEvent<HTMLElement>) {
    if (!open || isInteractiveTarget(event.target)) return;
    const scrollTop = bodyRef.current?.scrollTop ?? 0;
    dragStart.current = { x: event.clientX, y: event.clientY, scrollTop };
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: ReactPointerEvent<HTMLElement>) {
    const start = dragStart.current;
    if (!isDragging || !start) return;
    const deltaY = event.clientY - start.y;
    const deltaX = Math.abs(event.clientX - start.x);
    if (deltaY <= 0 || deltaX > deltaY * 1.25 || start.scrollTop > 0) return;
    setDragY(Math.max(0, deltaY));
  }

  function endDrag(event: ReactPointerEvent<HTMLElement>) {
    if (!isDragging) return;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture can be released automatically by mobile browsers.
    }
    setIsDragging(false);
    const shouldClose = dragY > 96;
    setDragY(0);
    dragStart.current = null;
    if (shouldClose) onClose();
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

  function chooseImage(file?: File) {
    setImageFile(file);
    setImageError("");
    if (file) {
      setBackgroundType("image");
      setBackgroundValue("");
    }
  }

  async function submitMovement() {
    if (!selectedGroup || !type || !title.trim()) return;
    setSubmitting(true);
    try {
      await onCreate({
        title: title.trim(),
        description: description.trim() || "Noch keine Details.",
        groupId: selectedGroup.id,
        groupName: selectedGroup.name,
        scope: "internal",
        type,
        category: category.trim() || selectedGroup.category,
        emoji,
        imageFile,
        backgroundType: imageFile ? "image" : backgroundType,
        backgroundValue: imageFile ? "" : backgroundValue,
        isAnonymous,
      });
      resetDraft();
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  const sheetStyle = { "--sheet-drag": `${dragY}px` } as CSSProperties;
  const visualPreviewStyle = imageFile
    ? undefined
    : ({ background: backgroundType === "color" || backgroundType === "gradient" ? backgroundValue : undefined } as CSSProperties);

  return (
    <>
      <div
        className={`sheet-backdrop ${open ? "open" : ""}`}
        onClick={(event) => {
          if (event.target === event.currentTarget) requestClose();
        }}
      />
      <aside
        className={`bottom-sheet ${open ? "open" : ""} ${isDragging ? "dragging" : ""}`}
        aria-hidden={!open}
        style={sheetStyle}
        onClick={(event) => event.stopPropagation()}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <button className="sheet-handle" type="button" aria-label="Bottom Sheet herunterziehen" />

        <div className="wizard-header">
          <button className="wizard-back" type="button" onClick={() => setStep((current) => Math.max(1, current - 1))} disabled={step === 1}>
            Zurück
          </button>
          <div>
            <strong>{step} von {totalSteps}</strong>
            <div className="wizard-dots">
              {Array.from({ length: totalSteps }).map((_, index) => <span className={index + 1 <= step ? "active" : ""} key={index} />)}
            </div>
          </div>
          <button className="icon-button" type="button" onClick={requestClose} aria-label="Schließen">
            <Icon name="x" size={20} />
          </button>
        </div>

        <div className="wizard-body" ref={bodyRef}>
          {step === 1 ? (
            <section className="wizard-step">
              <h2>Interne Gruppe wählen</h2>
              {!isAuthenticated ? (
                <button className="public-create-row" type="button" onClick={onAuth}><span className="public-icon">C</span><span><strong>Anmelden</strong><small>Melde dich an, um interne Gruppen zu sehen.</small></span><Icon name="chevron" size={17} /></button>
              ) : internalMemberships.length ? (
                <div className="wizard-list">
                  {internalMemberships.map((membership) => (
                    <button className={`public-result ${selectedGroupId === membership.groupId ? "active" : ""}`} type="button" key={membership.id} onClick={() => { setSelectedGroupId(membership.groupId); setCategory(membership.group.category); autoNext(2); }}>
                      <GroupVisual group={membership.group} className="public-avatar" />
                      <span><strong>{membership.group.name}</strong><small>{membership.group.category} - Intern</small></span>
                      <Icon name="chevron" size={16} />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="empty-state compact-empty">
                  <strong>Keine interne Gruppe.</strong><span>Gib einen 5-stelligen Einladungscode ein.</span>
                  <div className="invite-mini"><input value={inviteCode} onChange={(event) => setInviteCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5))} placeholder="5-stelliger Code" maxLength={5} /><button type="button" onClick={joinCode} disabled={inviteCode.length !== 5 || joining}>{joining ? "Beitreten..." : "Gruppe beitreten"}</button></div>
                </div>
              )}
            </section>
          ) : null}

          {step === 2 ? (
            <section className="wizard-step">
              <h2>Was möchtest du teilen?</h2>
              <div className="type-list">
                {typeLabels.map((item) => (
                  <button className={`type-option ${type === item.id ? "active" : ""}`} type="button" key={item.id} onClick={() => { setType(item.id); autoNext(3); }}>
                    <span>{item.emoji}</span><strong>{item.label}</strong><small>{item.hint}</small>
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {step === 3 ? (
            <section className="wizard-step">
              <h2>Beschreibe dein Anliegen</h2>
              <label>Was soll sich ändern?<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={90} placeholder="Was soll sich bewegen?" /><small>{title.length}/90</small></label>
              <label>Details<textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={800} rows={6} placeholder="Optional: Was ist wichtig, damit andere dein Anliegen verstehen?" /><small>{description.length}/800</small></label>
              <label>Kategorie<input value={category} onChange={(event) => setCategory(event.target.value)} maxLength={40} placeholder={selectedGroup?.category || "Optional"} /></label>
              <div className="conduct-inline">Bitte bleib sachlich. Keine Beleidigungen, keine Hetze und keine persönlichen Angriffe.</div>
            </section>
          ) : null}

          {step === 4 ? (
            <section className="wizard-step">
              <h2>Darstellung wählen</h2>
              <div className="visual-mode-grid" data-no-sheet-drag>
                {(["image", "color", "gradient", "emoji"] as BackgroundType[]).map((mode) => (
                  <button className={backgroundType === mode ? "active" : ""} type="button" key={mode} onClick={() => { setBackgroundType(mode); if (mode !== "image") setImageFile(undefined); }}>
                    {mode === "image" ? "Foto" : mode === "color" ? "Farbe" : mode === "gradient" ? "Verlauf" : "Emoji"}
                  </button>
                ))}
              </div>

              {backgroundType === "image" ? (
                <>
                  {previewUrl ? <div className="image-preview"><img src={previewUrl} alt="" /><button type="button" onClick={() => chooseImage(undefined)}>Bild entfernen</button></div> : null}
                  <label className="file-picker"><span>Foto wählen</span><small>{imageFile ? imageFile.name : "Standard-Dateiauswahl, kein erzwungener Kamera-Modus."}</small><input type="file" accept="image/*" onChange={(event) => chooseImage(event.target.files?.[0])} /></label>
                  {imageError ? <p className="field-error">{imageError}</p> : null}
                </>
              ) : null}

              {backgroundType === "color" ? <div className="swatch-grid" data-no-sheet-drag>{colorOptions.map((option) => <button className={backgroundValue === option.value ? "active" : ""} type="button" key={option.value} onClick={() => setBackgroundValue(option.value)}><span style={{ background: option.value }} />{option.label}</button>)}</div> : null}
              {backgroundType === "gradient" ? <div className="swatch-grid" data-no-sheet-drag>{gradientOptions.map((option) => <button className={backgroundValue === option.value ? "active" : ""} type="button" key={option.value} onClick={() => setBackgroundValue(option.value)}><span style={{ background: option.value }} />{option.label}</button>)}</div> : null}
              {backgroundType === "emoji" ? <div className="emoji-grid" data-no-sheet-drag>{quickEmoji.map((item) => <button className={emoji === item ? "active" : ""} type="button" key={item} onClick={() => { setEmoji(item); setBackgroundValue(""); }}>{item}</button>)}</div> : null}
            </section>
          ) : null}

          {step === 5 ? (
            <section className="wizard-step">
              <h2>Vorschau</h2>
              <div className="visibility-toggle" data-no-sheet-drag>
                <span>Sichtbarkeit</span>
                <button className={!isAnonymous ? "active" : ""} type="button" onClick={() => setIsAnonymous(false)}>Mit Namen</button>
                <button className={isAnonymous ? "active" : ""} type="button" onClick={() => setIsAnonymous(true)}>Anonym</button>
              </div>
              <article className={`movement-card preview-card visual-preview ${previewUrl ? "has-image" : ""}`} style={visualPreviewStyle}>
                {previewUrl ? <img className="reel-image" src={previewUrl} alt="" /> : null}
                {!previewUrl && backgroundType === "emoji" ? <div className="preview-emoji">{emoji}</div> : null}
                <h3>{title || "Dein Anliegen"}</h3>
                <p>{selectedGroup?.name} - {typeLabels.find((item) => item.id === type)?.label || "Typ"} - {isAnonymous ? "Anonym" : "Mit Namen"}</p>
                <div className="movement-meta"><strong>0 Stimmen</strong><span>{description.slice(0, 110)}</span></div>
              </article>
            </section>
          ) : null}
        </div>

        <div className="wizard-footer" data-no-sheet-drag>
          {step < totalSteps ? (
            <button className="primary-button" type="button" onClick={goNext} disabled={!canContinue}>Weiter</button>
          ) : (
            <button className="primary-button" type="button" onClick={submitMovement} disabled={submitting || !selectedGroup || !type || !title.trim()}>
              {submitting ? "Wird gespeichert..." : "Bewegung starten"}
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
