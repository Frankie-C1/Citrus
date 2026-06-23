import { Icon } from "../components/Icon";

type OnboardingProps = {
  onComplete: () => void;
  onInviteCode: () => void;
  onQrCode: () => void;
};

export function Onboarding({ onComplete, onInviteCode, onQrCode }: OnboardingProps) {
  return (
    <div className="app-viewport">
      <main className="phone-shell onboarding-shell">
        <section className="onboarding-screen minimal">
          <div className="brand-mark">C</div>
          <div>
            <span className="eyebrow">Citrus</span>
            <h1>Wo möchtest du etwas bewegen?</h1>
          </div>
          <p className="lead">
            Wähle deinen Kontext. Du kannst später jederzeit weitere Gruppen, Apps oder Orte hinzufügen.
          </p>

          <article className="onboarding-card quiet">
            <div className="card-heading">
              <span>Intern</span>
              <small>Geschlossene Räume</small>
            </div>
            <p>Für Firmen, Schulen, Vereine, Universitäten und Teams.</p>
            <button className="primary-button dark-action" type="button" onClick={onInviteCode}>
              Einladungscode eingeben
            </button>
            <button className="secondary-button full" type="button" onClick={onQrCode}>
              <Icon name="qr" size={18} />
              QR-Code scannen
            </button>
          </article>

          <article className="onboarding-card quiet featured">
            <div className="card-heading">
              <span>Öffentlich</span>
              <small>Offene Bewegungen</small>
            </div>
            <p>Für Städte, Apps, Marken, Produkte und Orte.</p>
            <button className="primary-button" type="button" onClick={onComplete}>
              Entdecken
            </button>
          </article>
        </section>
      </main>
    </div>
  );
}
