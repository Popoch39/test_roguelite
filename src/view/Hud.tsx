import type { CSSProperties } from "react";
import type { RunOutcome } from "../sim";
import { useHudStore } from "./hudStore";

const HEALTH_BAR_WIDTH = 220;

const HEALTH_STYLE: CSSProperties = {
  position: "fixed",
  left: 16,
  bottom: 16,
  width: HEALTH_BAR_WIDTH,
  font: "600 14px system-ui, sans-serif",
  color: "#f2f4f8",
  // The canvas below must keep receiving the cursor and the Attack button.
  pointerEvents: "none",
};

const HEALTH_TRACK_STYLE: CSSProperties = {
  height: 12,
  marginTop: 4,
  background: "rgba(16, 19, 26, 0.8)",
  border: "1px solid #5b6675",
};

const DASH_STYLE: CSSProperties = {
  position: "fixed",
  left: 16 + HEALTH_BAR_WIDTH + 16,
  bottom: 16,
  padding: "3px 10px",
  font: "600 14px system-ui, sans-serif",
  border: "1px solid #5b6675",
  pointerEvents: "none",
};

const DASH_READY_STYLE: CSSProperties = { ...DASH_STYLE, color: "#14181f", background: "#7bd66f" };

const DASH_RECHARGING_STYLE: CSSProperties = {
  ...DASH_STYLE,
  color: "#8b95a3",
  background: "rgba(16, 19, 26, 0.8)",
};

const RUN_PROGRESS_STYLE: CSSProperties = {
  position: "fixed",
  top: 16,
  left: 0,
  right: 0,
  textAlign: "center",
  font: "600 18px system-ui, sans-serif",
  color: "#f2f4f8",
  pointerEvents: "none",
};

const RUN_SEED_STYLE: CSSProperties = {
  marginTop: 4,
  font: "12px monospace",
  color: "#9aa5b4",
};

const RUN_END_STYLE: CSSProperties = {
  position: "fixed",
  inset: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 16,
  font: "16px system-ui, sans-serif",
  color: "#f2f4f8",
  background: "rgba(10, 12, 16, 0.72)",
};

const OUTCOME_STYLE: CSSProperties = { margin: 0, font: "700 48px system-ui, sans-serif" };

const NEW_RUN_STYLE: CSSProperties = {
  padding: "10px 24px",
  font: "600 16px system-ui, sans-serif",
  color: "#14181f",
  background: "#e8a33d",
  border: "none",
  cursor: "pointer",
};

const OUTCOME_TEXT: Record<RunOutcome, { title: string; detail: string }> = {
  victory: { title: "Victory", detail: "Every Room is cleared." },
  defeat: { title: "Defeat", detail: "The Hero has fallen." },
};

export function Hud({ onNewRun }: { onNewRun: () => void }) {
  const outcome = useHudStore((hud) => hud.outcome);

  return (
    <>
      <HeroHealth />
      <DashReadiness />
      <RunProgress />
      {outcome && <RunEnd outcome={outcome} onNewRun={onNewRun} />}
    </>
  );
}

function HeroHealth() {
  const health = useHudStore((hud) => hud.heroHealth);
  const maxHealth = useHudStore((hud) => hud.heroMaxHealth);
  const share = maxHealth > 0 ? health / maxHealth : 0;

  return (
    <div style={HEALTH_STYLE}>
      Health {health} / {maxHealth}
      <div style={HEALTH_TRACK_STYLE}>
        <div style={{ width: `${share * 100}%`, height: "100%", background: "#7bd66f" }} />
      </div>
    </div>
  );
}

function DashReadiness() {
  const ready = useHudStore((hud) => hud.dashReady);

  return (
    <div style={ready ? DASH_READY_STYLE : DASH_RECHARGING_STYLE}>
      {ready ? "Dash ready" : "Dash recharging"}
    </div>
  );
}

function RunProgress() {
  const roomNumber = useHudStore((hud) => hud.roomNumber);
  const roomCount = useHudStore((hud) => hud.roomCount);
  const runSeed = useHudStore((hud) => hud.runSeed);

  return (
    <div style={RUN_PROGRESS_STYLE}>
      Room {roomNumber} / {roomCount}
      <div style={RUN_SEED_STYLE}>Run Seed {runSeed}</div>
    </div>
  );
}

function RunEnd({ outcome, onNewRun }: { outcome: RunOutcome; onNewRun: () => void }) {
  const { title, detail } = OUTCOME_TEXT[outcome];

  return (
    <div style={RUN_END_STYLE}>
      <h1 style={OUTCOME_STYLE}>{title}</h1>
      <p style={{ margin: 0 }}>{detail}</p>
      <button type="button" style={NEW_RUN_STYLE} onClick={onNewRun}>
        Start a new Run
      </button>
    </div>
  );
}
