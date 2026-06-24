import type { ReactNode } from "react";

type IconProps = {
  name:
    | "home"
    | "activity"
    | "plus"
    | "plusSquare"
    | "chart"
    | "grid"
    | "profile"
    | "search"
    | "chevron"
    | "chevronRight"
    | "arrowUpRight"
    | "checkCircle"
    | "list"
    | "reels"
    | "x"
    | "share"
    | "star"
    | "message"
    | "more"
    | "camera"
    | "flag"
    | "spark"
    | "groups"
    | "bell"
    | "settings"
    | "rules"
    | "reset"
    | "qr"
    | "code";
  size?: number;
};

export function Icon({ name, size = 22 }: IconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  const paths: Record<IconProps["name"], ReactNode> = {
    home: (
      <>
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V21h14V9.5" />
        <path d="M9 21v-6h6v6" />
      </>
    ),
    activity: (
      <>
        <path d="M4 12h4l2-7 4 14 2-7h4" />
        <path d="M4 5h4" />
        <path d="M16 19h4" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </>
    ),
    plusSquare: (
      <>
        <rect x="5" y="5" width="14" height="14" rx="3.2" />
        <path d="M12 8.5v7" />
        <path d="M8.5 12h7" />
      </>
    ),
    chart: (
      <>
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="M8 15v-4" />
        <path d="M12 15V8" />
        <path d="M16 15v-8" />
      </>
    ),
    grid: (
      <>
        <rect x="4" y="4" width="6" height="6" rx="1.4" />
        <rect x="14" y="4" width="6" height="6" rx="1.4" />
        <rect x="4" y="14" width="6" height="6" rx="1.4" />
        <rect x="14" y="14" width="6" height="6" rx="1.4" />
      </>
    ),
    profile: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </>
    ),
    chevron: <path d="m6 9 6 6 6-6" />,
    chevronRight: <path d="m9 18 6-6-6-6" />,
    arrowUpRight: (
      <>
        <path d="M7 17 17 7" />
        <path d="M9 7h8v8" />
      </>
    ),
    checkCircle: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8.5 12.5 2.2 2.2 4.8-5.2" />
      </>
    ),
    list: (
      <>
        <path d="M8 6h12" />
        <path d="M8 12h12" />
        <path d="M8 18h12" />
        <path d="M4 6h.01" />
        <path d="M4 12h.01" />
        <path d="M4 18h.01" />
      </>
    ),
    reels: (
      <>
        <rect x="5" y="5" width="14" height="14" rx="3.2" />
        <path d="M8 5 10.4 9" />
        <path d="M13 5 15.4 9" />
        <path d="M5 9h14" />
        <path d="m11 12 3.8 2.4L11 16.8Z" />
      </>
    ),
    x: (
      <>
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </>
    ),
    share: (
      <>
        <path d="M12 16V4" />
        <path d="m7 9 5-5 5 5" />
        <path d="M5 14v5h14v-5" />
      </>
    ),
    star: (
      <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z" />
    ),
    message: (
      <>
        <path d="M21 12a8.5 8.5 0 0 1-8.5 8.5 9.4 9.4 0 0 1-3.8-.8L3 21l1.3-5.1a8.4 8.4 0 0 1-.8-3.9 8.5 8.5 0 0 1 17 0Z" />
        <path d="M8 11.5h8" />
        <path d="M8 15h5" />
      </>
    ),
    more: (
      <>
        <circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" />
        <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
        <circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" />
      </>
    ),
    camera: (
      <>
        <path d="M4 8h3l1.5-2h7L17 8h3v11H4z" />
        <circle cx="12" cy="13.5" r="3.5" />
      </>
    ),
    flag: (
      <>
        <path d="M5 21V4" />
        <path d="M5 4h11l-1 4 1 4H5" />
      </>
    ),
    spark: (
      <>
        <path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
        <path d="m18 16 .8 2.2L21 19l-2.2.8L18 22l-.8-2.2L15 19l2.2-.8L18 16Z" />
      </>
    ),
    groups: (
      <>
        <circle cx="9" cy="8" r="3" />
        <circle cx="17" cy="9" r="2.5" />
        <path d="M3 20a6 6 0 0 1 12 0" />
        <path d="M14 18a4.5 4.5 0 0 1 7 2" />
      </>
    ),
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </>
    ),
    settings: (
      <>
        <path d="M10.2 2.8h3.6l.5 2.3c.5.2 1 .4 1.5.7l2-1.2 2.5 2.5-1.2 2c.3.5.5 1 .7 1.5l2.3.5v3.6l-2.3.5c-.2.5-.4 1-.7 1.5l1.2 2-2.5 2.5-2-1.2c-.5.3-1 .5-1.5.7l-.5 2.3h-3.6l-.5-2.3c-.5-.2-1-.4-1.5-.7l-2 1.2-2.5-2.5 1.2-2c-.3-.5-.5-1-.7-1.5l-2.3-.5v-3.6l2.3-.5c.2-.5.4-1 .7-1.5l-1.2-2 2.5-2.5 2 1.2c.5-.3 1-.5 1.5-.7l.5-2.3Z" />
        <circle cx="12" cy="12" r="3.2" />
      </>
    ),
    rules: (
      <>
        <path d="M6 3h9l3 3v15H6z" />
        <path d="M14 3v4h4" />
        <path d="M9 12h6" />
        <path d="M9 16h6" />
      </>
    ),
    reset: (
      <>
        <path d="M4 7v6h6" />
        <path d="M20 17a8 8 0 0 1-14.7-4" />
        <path d="M4 13a8 8 0 0 1 14.7-4" />
      </>
    ),
    qr: (
      <>
        <path d="M4 4h6v6H4z" />
        <path d="M14 4h6v6h-6z" />
        <path d="M4 14h6v6H4z" />
        <path d="M14 14h2" />
        <path d="M20 14v2" />
        <path d="M16 18h4" />
        <path d="M14 20h2" />
      </>
    ),
    code: (
      <>
        <path d="m9 18-6-6 6-6" />
        <path d="m15 6 6 6-6 6" />
      </>
    ),
  };

  return <svg {...common}>{paths[name]}</svg>;
}
