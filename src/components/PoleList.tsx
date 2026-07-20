import type { PoleTimeline } from "../lib/types";

interface Props {
  timelines: PoleTimeline[];
  selectedPoleId: string | null;
  onSelect: (poleId: string) => void;
}

export function PoleList({ timelines, selectedPoleId, onSelect }: Props) {
  if (timelines.length <= 1) return null;

  return (
    <nav className="pole-list">
      {timelines.map((t) => (
        <button
          key={t.polesId}
          type="button"
          className={`pole-item ${t.polesId === selectedPoleId ? "active" : ""}`}
          onClick={() => onSelect(t.polesId)}
        >
          <span className="pole-id">{t.polesId}</span>
          {t.changeCount > 0 ? (
            <span className="badge badge-changed">異動 {t.changeCount} 次</span>
          ) : t.latestControllerId === null ? (
            <span className="badge badge-missing">查無資料</span>
          ) : (
            <span className="badge badge-stable">無異動</span>
          )}
        </button>
      ))}
    </nav>
  );
}
