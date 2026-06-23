import { useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthProvider";
import { Icon } from "./Icon";

type AuthModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function AuthModal({ open, onClose, onSuccess }: AuthModalProps) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "signup") {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
      setEmail("");
      setPassword("");
      onSuccess();
      onClose();
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Anmeldung fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-backdrop" role="presentation">
      <section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button className="icon-button auth-close" type="button" onClick={onClose} aria-label="Schließen">
          <Icon name="x" size={19} />
        </button>
        <div className="auth-copy">
          <span className="eyebrow">Citrus</span>
          <h2 id="auth-title">Speichere deinen Beitrag</h2>
          <p>Erstelle kurz ein Konto, damit dein Einfluss und deine Themen dauerhaft mit dir verbunden bleiben.</p>
          <strong>Revolution entsteht genau hier</strong>
          <i aria-hidden="true" />
        </div>

        <form className="auth-form" onSubmit={submit}>
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
            setMode((current) => (current === "signup" ? "login" : "signup"));
          }}
        >
          {mode === "signup" ? "Ich habe schon ein Konto" : "Neues Konto erstellen"}
        </button>
      </section>
    </div>
  );
}
