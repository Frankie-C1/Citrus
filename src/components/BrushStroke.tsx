export function BrushStroke({ className = "" }: { className?: string }) {
  return (
    <svg className={`brush-stroke ${className}`} viewBox="0 0 220 28" aria-hidden="true" focusable="false">
      <path
        d="M7 17.4c23.8-6.9 52.2-9.1 78.8-8.4 18.9.5 31.2 4.5 49.9 4 25.1-.7 45.2-6.8 76.9-2.7"
        fill="none"
        stroke="currentColor"
        strokeWidth="8.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 19.6c33.8-2.4 58.7-1 91.8.5 29.6 1.4 61.6-7.1 104.7-2.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="4.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.58"
      />
      <path
        d="M23 13.6c15.2-4.1 32.5-4.8 48.9-4.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity="0.45"
      />
    </svg>
  );
}
