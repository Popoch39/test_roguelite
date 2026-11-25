import type { CSSProperties } from "react";

const SCREEN_STYLE: CSSProperties = {
  position: "fixed",
  inset: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 16,
  font: "16px system-ui, sans-serif",
  color: "#f2f4f8",
};

const TITLE_STYLE: CSSProperties = { margin: 0, font: "700 48px system-ui, sans-serif" };

const GOLD_STYLE: CSSProperties = {
  margin: 0,
  font: "600 24px system-ui, sans-serif",
  color: "#e8a33d",
};

const TALENT_STYLE: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 8,
  padding: "16px 32px",
  border: "1px solid #5b6675",
};

const TALENT_NAME_STYLE: CSSProperties = { margin: 0, font: "600 18px system-ui, sans-serif" };

const BUY_STYLE: CSSProperties = {
  padding: "8px 20px",
  font: "600 14px system-ui, sans-serif",
  color: "#14181f",
  background: "#7bd66f",
  border: "none",
  cursor: "pointer",
};

const BUY_UNAVAILABLE_STYLE: CSSProperties = {
  ...BUY_STYLE,
  color: "#8b95a3",
  background: "#2a313c",
  cursor: "not-allowed",
};

const START_RUN_STYLE: CSSProperties = {
  padding: "12px 32px",
  font: "600 18px system-ui, sans-serif",
  color: "#14181f",
  background: "#e8a33d",
  border: "none",
  cursor: "pointer",
};

export interface BetweenRunsProps {
  gold: number;
  talentLevel: number;
  talentHighestLevel: number;
  /** Null when the Talent is at its highest level. */
  nextTalentLevelCost: number | null;
  canBuyTalentLevel: boolean;
  /** The maximum health the Hero of the next Run starts with. */
  heroMaxHealth: number;
  onBuyTalentLevel: () => void;
  onStartRun: () => void;
}

export function BetweenRuns({
  gold,
  talentLevel,
  talentHighestLevel,
  nextTalentLevelCost,
  canBuyTalentLevel,
  heroMaxHealth,
  onBuyTalentLevel,
  onStartRun,
}: BetweenRunsProps) {
  return (
    <div style={SCREEN_STYLE}>
      <h1 style={TITLE_STYLE}>Roguelite Prototype</h1>
      <p style={GOLD_STYLE}>Gold {gold}</p>
      <div style={TALENT_STYLE}>
        <h2 style={TALENT_NAME_STYLE}>
          Talent level {talentLevel} / {talentHighestLevel}
        </h2>
        <p style={{ margin: 0 }}>The Hero starts a Run with {heroMaxHealth} maximum health.</p>
        <p style={{ margin: 0 }}>
          {nextTalentLevelCost === null
            ? "Highest level reached"
            : `Next level: ${nextTalentLevelCost} Gold`}
        </p>
        <button
          type="button"
          style={canBuyTalentLevel ? BUY_STYLE : BUY_UNAVAILABLE_STYLE}
          disabled={!canBuyTalentLevel}
          onClick={onBuyTalentLevel}
        >
          Buy the next level
        </button>
      </div>
      <button type="button" style={START_RUN_STYLE} onClick={onStartRun}>
        Start a Run
      </button>
    </div>
  );
}
