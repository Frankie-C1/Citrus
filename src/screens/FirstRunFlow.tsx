import { useState, type FormEvent } from "react";
import cityLoginImage from "../assets/onboarding/city-login.png";
import { StarburstLogo } from "../components/StarburstLogo";

type FirstRunFlowProps = {
  onJoinCitrus: (code: string) => Promise<void>;
};

const firstRunSlides = [
  {
    title: "Posten",
    text: "Teile deine Ideen und Vorschläge mit deiner Gruppe. Mit der Plustaste geht das ziemlich schnell.",
  },
  {
    title: "Abstimmen",
    text: "Unterstütze mit deinem Daumen hoch täglich die Beiträge aus deiner Gruppe.",
  },
  {
    title: "Beschweren",
    text: "Bringe deine Anliegen durch einen Beitrag dazu gehört zu werden.",
  },
  {
    title: "Gestalte Citrus mit.",
    text: "Zum Start laden wir dich in die Citrus-Gruppe ein. Dort kannst du gerne jederzeit alle Ideen rund um die App posten.",
  },
];

export function FirstRunFlow({ onJoinCitrus }: FirstRunFlowProps) {
  const [step, setStep] = useState(0);
  const [code, setCode] = useState("CITRS");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isJoinStep = step >= firstRunSlides.length;
  const currentSlide = firstRunSlides[Math.min(step, firstRunSlides.length - 1)];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!code.trim()) return;
    setError("");
    setLoading(true);
    try {
      await onJoinCitrus(code);
    } catch (joinError) {
      setError(joinError instanceof Error ? joinError.message : "Gruppe konnte nicht hinzugefügt werden.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="onboarding-auth-shell">
      <section className="onboarding-auth-stage first-run">
        <img className="onboarding-auth-image" src={cityLoginImage} alt="" />
        <div className="onboarding-auth-overlay" />
        <div className="onboarding-auth-brand">
          <StarburstLogo size={34} />
          <span>Citrus</span>
        </div>

        {isJoinStep ? (
          <form className="first-run-card final" onSubmit={submit}>
            <span className="first-run-kicker">Citrus-Testgruppe</span>
            <h1>Starte im Citrus-Raum.</h1>
            <p>Der Code ist bereits vorausgefüllt. Du kannst beitreten, um uns Feedback zu geben und helfen Citrus mitzuverbessern.</p>
            <label>
              Gruppencode
              <input
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12))}
                autoComplete="off"
              />
            </label>
            {error ? <div className="onboarding-auth-error">{error}</div> : null}
            <button className="onboarding-auth-primary" type="submit" disabled={loading || !code.trim()}>
              {loading ? "Wird hinzugefügt..." : "Zur Citrus-Gruppe hinzufügen"}
            </button>
          </form>
        ) : (
          <>
            <article className="first-run-card" key={currentSlide.title}>
              <span className="first-run-kicker">{step + 1} von {firstRunSlides.length}</span>
              <h1>{currentSlide.title}</h1>
              <p>{currentSlide.text}</p>
            </article>
            <footer className="onboarding-auth-nav">
              <div className="onboarding-auth-dots" aria-label={`${step + 1} von ${firstRunSlides.length}`}>
                {firstRunSlides.map((slide, index) => (
                  <span className={index === step ? "active" : ""} key={slide.title} />
                ))}
              </div>
              <button type="button" onClick={() => setStep((current) => current + 1)}>
                Weiter <span>→</span>
              </button>
            </footer>
          </>
        )}
      </section>
    </main>
  );
}
