import type { Group } from "../types";
import { GroupVisual } from "../components/GroupVisual";

type GroupsProps = {
  groups: Group[];
  onBack: () => void;
  onOpenGroup: (groupId: string) => void;
};

export function Groups({ groups, onBack, onOpenGroup }: GroupsProps) {
  return (
    <div className="screen stack">
      <button className="back-button" type="button" onClick={onBack}>
        Zurück
      </button>
      <header>
        <span className="eyebrow">Interne Räume und Einladungscodes</span>
        <h1>Gruppen</h1>
      </header>

      <div className="group-list">
        {groups.map((group) => (
          <button className="group-card" type="button" key={group.id} onClick={() => onOpenGroup(group.id)}>
            <GroupVisual group={group} className="group-avatar" />
            <span>
              <strong>{group.name}</strong>
              <small>
                {group.category} · Intern
              </small>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
