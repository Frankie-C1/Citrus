type StatCardProps = {
  label: string;
  value: string;
  detail?: string;
  tone?: "green" | "dark" | "soft";
};

export function StatCard({ label, value, detail, tone = "soft" }: StatCardProps) {
  return (
    <article className={`stat-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </article>
  );
}
