import { useState, type FormEvent } from "react";
import { StarburstLogo } from "../components/StarburstLogo";

type OnboardingProps = {
  onComplete: () => void;
  onJoinCode: (code: string) => void;
};

const slides = [
  {
    title: "Was zaehlt, wird sichtbar.",
    text: "Citrus bringt Ideen, Probleme und Verbesserungen dorthin, wo sie Wirkung entfalten.",
    visual: "horizon",
  },
  {
    title: "Aus Stimmen wird Richtung.",
    text: "Unterstütze Themen, die dir wichtig sind, und sieh, wie daraus Bewegung entsteht.",
    visual: "community",
  },
  {
    title: "Gemeinsam Druck aufbauen.",
    text: "Für Teams, Städte, Marken, Schulen und alles, was besser werden kann.",
    visual: "city",
  },
];

export function Onboarding({ onComplete, onJoinCode }: OnboardingProps) {
  const [code, setCode] = useState("");
  const [slide, setSlide] = useState(0);

  function submitCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (code.trim().length !== 5) return;
    onJoinCode(code);
  }

  return (
    <div className="app-viewport">
      <main className="phone-shell onboarding-shell">
        {slide < slides.length ? (
          <section className="onboarding-screen onboarding-cinematic">
            <div className={`onboarding-visual ${slides[slide].visual}`}>
              <StarburstLogo className="onboarding-star" size={58} />
            </div>
            <div className="onboarding-copy">
              <span className="eyebrow">Citrus</span>
              <h1>{slides[slide].title}</h1>
              <p className="lead">{slides[slide].text}</p>
            </div>
            <div className="onboarding-progress" aria-label={`${slide + 1} von ${slides.length}`}>
              {slides.map((item, index) => (
                <span className={index === slide ? "active" : ""} key={item.title} />
              ))}
            </div>
            <button className="primary-button" type="button" onClick={() => setSlide((current) => current + 1)}>
              {slide === slides.length - 1 ? "Starten" : "Weiter"}
            </button>
          </section>
        ) : (
          <section className="onboarding-screen minimal onboarding-choice">
            <div className="brand-mark star-brand">
              <StarburstLogo size={42} />
            </div>
            <div>
              <span className="eyebrow">Citrus</span>
              <h1>Wo möchtest du etwas bewegen?</h1>
            </div>
            <p className="lead">Starte öffentlich oder tritt einem internen Raum mit Einladungscode bei.</p>

            <article className="onboarding-card quiet onboarding-option internal-visual">
              <div className="card-heading">
                <span>Mit Einladungscode beitreten</span>
                <small>Intern</small>
              </div>
              <p>Für Firmen, Schulen, Vereine, Universitäten und Teams.</p>
              <form className="invite-code-form" onSubmit={submitCode}>
                <input
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5))
                  }
                  placeholder="5-stelligen Code eingeben"
                  maxLength={5}
                />
                <button className="primary-button dark-action" type="submit" disabled={code.length !== 5}>
                  Gruppe beitreten
                </button>
              </form>
            </article>

            <article className="onboarding-card quiet featured onboarding-option external-visual">
              <div className="card-heading">
                <span>Öffentlich entdecken</span>
                <small>Extern</small>
              </div>
              <p>Für Städte, Apps, Marken, Produkte und Orte.</p>
              <button className="primary-button" type="button" onClick={onComplete}>
                Öffentliche Bewegungen ansehen
              </button>
            </article>
          </section>
        )}
      </main>
    </div>
  );
}
