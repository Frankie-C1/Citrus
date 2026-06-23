import type { MovementStatus } from "../types";

type TimelineProps = {
  status: MovementStatus;
};

const steps: Array<{ id: MovementStatus; label: string }> = [
  { id: "submitted", label: "Eingereicht" },
  { id: "trending", label: "Trendet" },
  { id: "review", label: "In Prüfung" },
  { id: "implementation", label: "In Umsetzung" },
  { id: "done", label: "Fertig" },
];

export function Timeline({ status }: TimelineProps) {
  const activeIndex = steps.findIndex((step) => step.id === status);

  return (
    <div className="timeline" aria-label="Statusverlauf">
      {steps.map((step, index) => (
        <div
          className={`timeline-step ${index <= activeIndex ? "complete" : ""} ${
            index === activeIndex ? "current" : ""
          }`}
          key={step.id}
        >
          <span className="timeline-dot" />
          <small>{step.label}</small>
        </div>
      ))}
    </div>
  );
}
