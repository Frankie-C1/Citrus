type ConductNoticeProps = {
  open: boolean;
  onAccept: () => void;
};

export function ConductNotice({ open, onAccept }: ConductNoticeProps) {
  if (!open) return null;

  return (
    <div className="auth-backdrop" role="presentation">
      <section className="notice-modal" role="dialog" aria-modal="true" aria-labelledby="conduct-title">
        <span className="eyebrow">Kurz bevor du loslegst</span>
        <h2 id="conduct-title">Citrus lebt von klaren Beiträgen.</h2>
        <p>
          Bitte poste keine Beleidigungen, keine Hetze, keine verfassungsfeindlichen Inhalte und keine persönlichen
          Angriffe. Beschreibe Probleme konkret und lösungsorientiert.
        </p>
        <button className="primary-button" type="button" onClick={onAccept}>
          Verstanden
        </button>
      </section>
    </div>
  );
}
