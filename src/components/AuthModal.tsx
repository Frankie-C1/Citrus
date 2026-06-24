import { useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthProvider";
import cityLoginImage from "../assets/onboarding/city-login.png";
import { Icon } from "./Icon";
import { StarburstLogo } from "./StarburstLogo";

type AuthModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function AuthModal({ open, onClose, onSuccess }: AuthModalProps) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

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
      onSuccess();
      onClose();
    } catch (authError) {
      console.error("Authentication failed:", authError);
      setError(authError instanceof Error ? authError.message : "Auth-Vorgang fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-backdrop auth-cinematic-backdrop" role="presentation">
      <img className="auth-cinematic-image" src={cityLoginImage} alt="" />
      <div className="auth-cinematic-overlay" />
      <section className="auth-modal auth-cinematic-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button className="icon-button auth-close" type="button" onClick={onClose} aria-label="Schließen">
          <Icon name="x" size={19} />
        </button>
        <div className="auth-copy">
          <div className="auth-cinematic-brand">
            <StarburstLogo size={34} />
            <span>Citrus</span>
          </div>
          <h2 id="auth-title">E Pluribus Unum.</h2>
          <p>Aus vielen Stimmen wird eine Richtung.</p>
        </div>

        <form className="auth-form" onSubmit={submit}>
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
          {info ? <div className="auth-info">{info}</div> : null}
          {error ? <div className="auth-error">{error}</div> : null}
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? "Einen Moment..." : mode === "signup" ? "Konto erstellen" : "Einloggen"}
          </button>
        </form>

        <button
          className="auth-switch"
          type="button"
          onClick={() => {
            setError("");
            setInfo("");
            setMode((current) => (current === "signup" ? "login" : "signup"));
          }}
        >
          {mode === "signup" ? "Schon ein Konto? Einloggen" : "Noch kein Konto? Konto erstellen"}
        </button>
      </section>
    </div>
  );
}
