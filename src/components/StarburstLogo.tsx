type StarburstLogoProps = {
  className?: string;
  size?: number;
};

export function StarburstLogo({ className = "", size = 42 }: StarburstLogoProps) {
  return (
    <img
      className={className}
      width={size}
      height={size}
      src="/app-icon-512.png"
      alt="Citrus"
      aria-label="Citrus"
      decoding="async"
    />
  );
}
