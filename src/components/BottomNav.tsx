import type { Tab } from "../types";
import { Icon } from "./Icon";

type BottomNavProps = {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onPlus: () => void;
  feedVariant?: boolean;
};

const tabs: Array<{ id: Tab; label: string; icon: "home" | "camera" | "grid" | "profile" }> = [
  { id: "home", label: "Home", icon: "home" },
  { id: "feed", label: "Feed", icon: "camera" },
  { id: "insights", label: "Posts", icon: "grid" },
  { id: "profile", label: "Profil", icon: "profile" },
];

export function BottomNav({ activeTab, onTabChange, onPlus, feedVariant = false }: BottomNavProps) {
  return (
    <nav className={`bottom-nav ${feedVariant ? "feed-bottom-nav" : ""}`} aria-label="Hauptnavigation">
      <button
        className={`nav-item ${activeTab === tabs[0].id ? "active" : ""}`}
        type="button"
        onClick={() => onTabChange("home")}
      >
        <Icon name="home" size={23} />
        <span>Home</span>
      </button>
      <button
        className={`nav-item ${activeTab === tabs[1].id ? "active" : ""}`}
        type="button"
        onClick={() => onTabChange("feed")}
      >
        <Icon name="camera" size={24} />
        <span>Feed</span>
      </button>
      <button className="nav-plus" type="button" onClick={onPlus} aria-label="Beitrag erstellen">
        <Icon name="plusSquare" size={24} />
      </button>
      <button
        className={`nav-item ${activeTab === tabs[2].id ? "active" : ""}`}
        type="button"
        onClick={() => onTabChange("insights")}
      >
        <Icon name="grid" size={24} />
        <span>Posts</span>
      </button>
      <button
        className={`nav-item ${activeTab === tabs[3].id ? "active" : ""}`}
        type="button"
        onClick={() => onTabChange("profile")}
      >
        <Icon name="profile" size={24} />
        <span>Profil</span>
      </button>
    </nav>
  );
}
