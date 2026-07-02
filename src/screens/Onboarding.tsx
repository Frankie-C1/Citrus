import { useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthProvider";
import cityLoginImage from "../assets/onboarding/city-login.png";
import hummingbirdImage from "../assets/onboarding/hummingbird-onboarding.png";
import saxophoneImage from "../assets/onboarding/saxophone-onboarding.png";
import starsImage from "../assets/onboarding/stars-onboarding.png";
import { StarburstLogo } from "../components/StarburstLogo";

type OnboardingProps = {
  onAuthenticated: () => void;
};

const onboardingSlides = [
  {
    id: "voice-weight",
    image: saxophoneImage,
    title: "Gib deiner Stimme Gewicht.",
    text: "Hattest du schonmal eine gute Idee und wusstest nicht wohin damit? Citrus ist genau der Ort für Denker wie dich.",
  },
  {
    id: "daily-vote",
    image: hummingbirdImage,
    title: "Stimme täglich für Themen.",
    text: "Unterstütze Anliegen, die dir wichtig sind, und sieh, welche Themen in deinen persönlichen Gruppen wachsen.",
  },
  {
    id: "real-ideas",
    image: starsImage,
    title: "Entdecke echte Ideen.",
    text: "Und teile Anliegen, die gesehen werden sollten. Citrus macht sichtbar, was Menschen wirklich bewegt.",
  },
];

export function Onboarding({ onAuthenticated }: OnboardingProps) {
  const { signIn, signUp } = useAuth();
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const isAuthStep = step >= onboardingSlides.length;
  const currentSlide = onboardingSlides[Math.min(step, onboardingSlides.length - 1)];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      if (mode === "signup") {
        const result = await signUp(username, email, password);
        if (result.needsConfirmation) {
          setInfo("Konto erstellt. Bitte bestätige deine E-Mail oder deaktiviere für MVP-Tests die E-Mail-Bestätigung in Supabase.");
          setPassword("");
          return;
        }
      } else {
        await signIn(email, password);
      }
      setUsername("");
      setEmail("");
      setPassword("");
      onAuthenticated();
    } catch (authError) {
      console.error("Authentication failed:", authError);
      setError(authError instanceof Error ? authError.message : "Anmeldung fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="onboarding-auth-shell">
      <section className={`onboarding-auth-stage ${isAuthStep ? "auth" : "intro"}`}>
        <img
          className="onboarding-auth-image"
          src={isAuthStep ? cityLoginImage : currentSlide.image}
          alt=""
          key={isAuthStep ? "auth-image" : `image-${currentSlide.id}`}
        />
        <div className="onboarding-auth-overlay" />
        <div className="onboarding-auth-brand">
          <StarburstLogo size={34} />
          <span>Citrus</span>
        </div>

        {isAuthStep ? (
          <div className="onboarding-auth-login">
            <div className="onboarding-auth-copy">
              <h1>Willkommen bei Citrus.</h1>
              <p>Aus vielen Stimmen wird sichtbar, was zählt.</p>
            </div>

            <form className="onboarding-auth-card" onSubmit={submit}>
              <div className="onboarding-auth-card-head">
                <span>{mode === "signup" ? "Registrieren" : "Einloggen"}</span>
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setInfo("");
                    setMode((current) => (current === "signup" ? "login" : "signup"));
                  }}
                >
                  {mode === "signup" ? "Login" : "Neu"}
                </button>
              </div>

              {mode === "signup" ? (
                <label>
                  Benutzername
                  <input
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    autoComplete="username"
                    minLength={3}
                    maxLength={24}
                    pattern="[A-Za-z0-9_]+"
                    title="Nur Buchstaben, Zahlen und Unterstrich"
                    required
                  />
                </label>
              ) : null}
              <label>
                E-Mail
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                />
              </label>
              <label>
                Passwort
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  minLength={6}
                  required
                />
              </label>
              {info ? <div className="onboarding-auth-info">{info}</div> : null}
              {error ? <div className="onboarding-auth-error">{error}</div> : null}
              <button className="onboarding-auth-primary" type="submit" disabled={loading}>
                {loading ? "Einen Moment..." : mode === "signup" ? "Konto erstellen" : "Einloggen"}
              </button>
              <button
                className="onboarding-auth-switch"
                type="button"
                onClick={() => {
                  setError("");
                  setInfo("");
                  setMode((current) => (current === "signup" ? "login" : "signup"));
                }}
              >
                {mode === "signup" ? "Schon ein Konto? Einloggen" : "Noch kein Konto? Konto erstellen"}
              </button>
            </form>
          </div>
        ) : (
          <div className="onboarding-auth-content" key={`content-${currentSlide.id}`}>
            <h1>{currentSlide.title}</h1>
            <p>{currentSlide.text}</p>
          </div>
        )}

        {!isAuthStep ? (
          <footer className="onboarding-auth-nav">
            <div className="onboarding-auth-dots" aria-label={`${step + 1} von ${onboardingSlides.length}`}>
              {onboardingSlides.map((slide, index) => (
                <span className={index === step ? "active" : ""} key={slide.id} />
              ))}
            </div>
            <button type="button" onClick={() => setStep((current) => current + 1)}>
              Weiter <span>→</span>
            </button>
          </footer>
        ) : null}
      </section>
    </main>
  );
}
