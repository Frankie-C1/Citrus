type StarburstLogoProps = {
  className?: string;
  size?: number;
};

export function StarburstLogo({ className = "", size = 42 }: StarburstLogoProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Citrus"
    >
      <defs>
        <radialGradient id="citrus-star-glow" cx="50%" cy="50%" r="58%">
          <stop offset="0%" stopColor="#fff7b8" />
          <stop offset="34%" stopColor="#ff7a1a" />
          <stop offset="68%" stopColor="#fb7185" />
          <stop offset="100%" stopColor="#7c3aed" />
        </radialGradient>
      </defs>
      <path
        d="M32 3 37.4 23.4 57 12 45.6 31.7 61 32 45.6 32.3 57 52 37.4 40.6 32 61 26.6 40.6 7 52 18.4 32.3 3 32 18.4 31.7 7 12 26.6 23.4 32 3Z"
        fill="url(#citrus-star-glow)"
      />
      <path
        d="M32 17 35.1 28.9 47 32 35.1 35.1 32 47 28.9 35.1 17 32 28.9 28.9 32 17Z"
        fill="#ffffff"
        opacity="0.92"
      />
    </svg>
  );
}
