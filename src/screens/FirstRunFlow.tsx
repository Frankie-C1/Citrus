import { useState, type FormEvent } from "react";
import cityLoginImage from "../assets/onboarding/city-login.png";
import { StarburstLogo } from "../components/StarburstLogo";

type FirstRunFlowProps = {
  onJoinCitrus: (code: string) => Promise<void>;
};

const firstRunSlides = [
  {
    title: "Willkommen bei Citrus.",
    text: "Hier werden Anliegen, Ideen und Wünsche sichtbar. Du siehst, was Menschen in deiner Umgebung bewegt – und kannst Themen unterstützen, bevor sie untergehen.",
  },
  {
    title: "Intern, Extern, Öffentlich.",
    text: "Intern ist dein direkter Kreis. Extern zeigt dir andere Gruppen. Öffentlich zeigt dir das große Ganze.",
  },
  {
    title: "Unterstütze, was zählt.",
    text: "Mit deiner Stimme machst du sichtbar, welche Themen wichtiger werden. Je mehr Menschen ein Anliegen unterstützen, desto stärker wird es.",
  },
  {
    title: "Gestalte Citrus mit.",
    text: "Zum Start kommst du in unsere interne Citrus-Gruppe. Dort kannst du Feedback geben, Fehler melden und mitentscheiden, wie die App besser wird.",
  },
];

export function FirstRunFlow({ onJoinCitrus }: FirstRunFlowProps) {
  const [step, setStep] = useState(0);
  const [code, setCode] = useState("CITRUS");
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
            <span className="first-run-kicker">Citrus Feedback</span>
            <h1>Deine erste Gruppe wartet.</h1>
            <p>Wir fügen dich zur internen Citrus-Gruppe hinzu, damit du Feedback geben und die App mitverbessern kannst.</p>
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
