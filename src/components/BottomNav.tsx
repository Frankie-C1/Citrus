import type { Tab } from "../types";
import { Icon } from "./Icon";

type BottomNavProps = {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onPlus: () => void;
};

const tabs: Array<{ id: Tab; label: string; icon: "home" | "activity" | "chart" | "profile" }> = [
  { id: "home", label: "Home", icon: "home" },
  { id: "feed", label: "Feed", icon: "activity" },
  { id: "insights", label: "Insights", icon: "chart" },
  { id: "profile", label: "Profil", icon: "profile" },
];

export function BottomNav({ activeTab, onTabChange, onPlus }: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label="Hauptnavigation">
      <button
        className={`nav-item ${activeTab === tabs[0].id ? "active" : ""}`}
        type="button"
        onClick={() => onTabChange("home")}
      >
        <Icon name="home" size={21} />
        <span>Home</span>
      </button>
      <button
        className={`nav-item ${activeTab === tabs[1].id ? "active" : ""}`}
        type="button"
        onClick={() => onTabChange("feed")}
      >
        <Icon name="activity" size={21} />
        <span>Feed</span>
      </button>
      <button className="nav-plus" type="button" onClick={onPlus} aria-label="Beitrag erstellen">
        <Icon name="plus" size={29} />
      </button>
      <button
        className={`nav-item ${activeTab === tabs[2].id ? "active" : ""}`}
        type="button"
        onClick={() => onTabChange("insights")}
      >
        <Icon name="chart" size={21} />
        <span>Insights</span>
      </button>
      <button
        className={`nav-item ${activeTab === tabs[3].id ? "active" : ""}`}
        type="button"
        onClick={() => onTabChange("profile")}
      >
        <Icon name="profile" size={21} />
        <span>Profil</span>
      </button>
    </nav>
  );
}
