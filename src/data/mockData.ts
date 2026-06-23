import type { Group, Movement, User, UserStats } from "../types";

export const mockUser: User = {
  id: "user-anton",
  name: "Anton",
  avatarInitials: "AN",
  influence: 12847,
  groupIds: ["karlsruhe", "muster-gmbh", "dhbw", "fc-musterstadt", "spotify"],
};

export const mockGroups: Group[] = [
  {
    id: "karlsruhe",
    name: "Stadt Karlsruhe",
    scope: "external",
    category: "Gemeinde",
    members: 28412,
    accent: "#22C55E",
  },
  {
    id: "muster-gmbh",
    name: "Firma Muster GmbH",
    scope: "internal",
    category: "Firma",
    members: 842,
    accent: "#111111",
  },
  {
    id: "dhbw",
    name: "DHBW Mosbach",
    scope: "internal",
    category: "Universitat",
    members: 5200,
    accent: "#4B5563",
  },
  {
    id: "spotify",
    name: "Spotify",
    scope: "external",
    category: "App",
    members: 134901,
    accent: "#22C55E",
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    scope: "external",
    category: "Produkt",
    members: 218421,
    accent: "#22C55E",
  },
  {
    id: "fc-musterstadt",
    name: "FC Musterstadt",
    scope: "internal",
    category: "Verein",
    members: 1204,
    accent: "#111111",
  },
];

export const mockMovements: Movement[] = [
  {
    id: "bike-lanes",
    title: "Mehr Fahrradwege in der Innenstadt",
    description:
      "Sichere, durchgehende Radachsen zwischen Marktplatz, Bahnhof und Uni.",
    emoji: "🔥",
    groupId: "karlsruhe",
    groupName: "Stadt Karlsruhe",
    scope: "external",
    type: "improvement",
    supporters: 1248,
    weeklyGrowth: 248,
    status: "review",
    category: "Mobilitat",
    supportedByUser: true,
    updates: [
      {
        id: "u1",
        text: "Das Thema trendet diese Woche stark in Karlsruhe.",
        createdAt: "Heute",
      },
      {
        id: "u2",
        text: "Die Gruppe Mobilitat hat das Thema zur Prufung markiert.",
        createdAt: "Gestern",
      },
      {
        id: "u3",
        text: "Neue Unterstutzer aus 3 Stadtteilen sind dazugekommen.",
        createdAt: "Mo",
      },
    ],
  },
  {
    id: "green-areas",
    title: "Mehr Grunflachen",
    description:
      "Kleine Pocket-Parks und schattige Aufenthaltsorte in dicht bebauten Vierteln.",
    emoji: "🌱",
    groupId: "karlsruhe",
    groupName: "Stadt Karlsruhe",
    scope: "external",
    type: "idea",
    supporters: 982,
    weeklyGrowth: 182,
    status: "trending",
    category: "Stadtleben",
    supportedByUser: false,
    updates: [
      {
        id: "u4",
        text: "Mehrere Nachbarschaften bundeln ahnliche Vorschlage.",
        createdAt: "Heute",
      },
      {
        id: "u5",
        text: "Das Wachstum liegt 31 Prozent uber dem Wochenschnitt.",
        createdAt: "Gestern",
      },
    ],
  },
  {
    id: "youth-center",
    title: "Jugendzentrum nach der Schule",
    description:
      "Ein offener Ort fur Sport, Musik und Lernen am Nachmittag.",
    emoji: "✨",
    groupId: "karlsruhe",
    groupName: "Stadt Karlsruhe",
    scope: "external",
    type: "idea",
    supporters: 744,
    weeklyGrowth: 126,
    status: "implementation",
    category: "Jugend",
    supportedByUser: true,
    updates: [
      {
        id: "u6",
        text: "Ein Pilotstandort wurde fur die Umsetzung vorgeschlagen.",
        createdAt: "Heute",
      },
      {
        id: "u7",
        text: "Schulen und Vereine haben Unterstutzung signalisiert.",
        createdAt: "Fr",
      },
    ],
  },
  {
    id: "basketball",
    title: "Neuer Basketballplatz",
    description:
      "Ein frei zuganglicher Court mit Beleuchtung und Sitzmoglichkeiten.",
    emoji: "🏀",
    groupId: "fc-musterstadt",
    groupName: "FC Musterstadt",
    scope: "internal",
    type: "improvement",
    supporters: 391,
    weeklyGrowth: 91,
    status: "trending",
    category: "Sport",
    supportedByUser: false,
    updates: [
      {
        id: "u8",
        text: "Der Vorschlag steigt im Vereinsranking auf Platz 2.",
        createdAt: "Heute",
      },
    ],
  },
  {
    id: "focus-friday",
    title: "Meetingfreier Freitagvormittag",
    description:
      "Ein gemeinsamer Fokusblock fur Deep Work ohne Regeltermin-Konflikte.",
    emoji: "⚡",
    groupId: "muster-gmbh",
    groupName: "Firma Muster GmbH",
    scope: "internal",
    type: "improvement",
    supporters: 214,
    weeklyGrowth: 48,
    status: "review",
    category: "Arbeit",
    supportedByUser: true,
    updates: [
      {
        id: "u9",
        text: "People & Culture testet den Vorschlag in zwei Teams.",
        createdAt: "Gestern",
      },
    ],
  },
  {
    id: "campus-food",
    title: "Bessere Mensa-Auswahl am Campus",
    description:
      "Mehr frische vegetarische Optionen und transparente Tagesbewertungen.",
    emoji: "🍋",
    groupId: "dhbw",
    groupName: "DHBW Mosbach",
    scope: "internal",
    type: "problem",
    supporters: 603,
    weeklyGrowth: 77,
    status: "submitted",
    category: "Campus",
    supportedByUser: false,
    updates: [
      {
        id: "u10",
        text: "Studierende aus drei Kursen haben das Thema gebundelt.",
        createdAt: "Mo",
      },
    ],
  },
  {
    id: "spotify-queue",
    title: "Gemeinsame Queue fur Gruppen",
    description:
      "Eine geteilte Playlist-Warteschlange, in der alle fair Songs vorschlagen.",
    emoji: "🎧",
    groupId: "spotify",
    groupName: "Spotify",
    scope: "external",
    type: "idea",
    supporters: 3128,
    weeklyGrowth: 412,
    status: "trending",
    category: "Produkt",
    supportedByUser: false,
    updates: [
      {
        id: "u11",
        text: "Das Thema wachst besonders stark bei Familien- und WG-Gruppen.",
        createdAt: "Heute",
      },
    ],
  },
  {
    id: "whatsapp-polls",
    title: "Ruhigere Gruppenabstimmungen",
    description:
      "Abstimmungen, die nicht den Chat fluten und trotzdem alle erreichen.",
    emoji: "💬",
    groupId: "whatsapp",
    groupName: "WhatsApp",
    scope: "external",
    type: "question",
    supporters: 1980,
    weeklyGrowth: 206,
    status: "review",
    category: "Kommunikation",
    supportedByUser: false,
    updates: [
      {
        id: "u12",
        text: "Viele Unterstutzer nennen weniger Benachrichtigungen als Ziel.",
        createdAt: "Gestern",
      },
    ],
  },
];

export const mockStats: UserStats = {
  reached: 12847,
  supportedTopics: 34,
  ownMovements: 0,
  implementedIdeas: 7,
  topCategory: "Mobilitat",
  activeGroups: 5,
  comments: 2,
  risingTopics: 1,
  weeklyReach: [18, 28, 45, 38, 68, 82, 94],
};
