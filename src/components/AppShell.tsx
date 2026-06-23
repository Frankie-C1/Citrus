import type { ReactNode } from "react";
import type { Tab } from "../types";
import { BottomNav } from "./BottomNav";

type AppShellProps = {
  children: ReactNode;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onPlus: () => void;
};

export function AppShell({ children, activeTab, onTabChange, onPlus }: AppShellProps) {
  return (
    <div className="app-viewport">
      <main className="phone-shell">
        <div className="screen-content">{children}</div>
        <BottomNav activeTab={activeTab} onTabChange={onTabChange} onPlus={onPlus} />
      </main>
    </div>
  );
}
