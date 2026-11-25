import { addAfterEffect, useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { BufferAttribute, type LineSegments } from "three";
import type { FrameSource } from "./frame";

// The physical key left of the digit row on every layout: no browser shortcut and no game control uses it.
const TOGGLE_KEY = "Backquote";

const TICK_COUNTER_STYLE: CSSProperties = {
  position: "fixed",
  top: 8,
  left: 8,
  padding: "2px 6px",
  font: "12px monospace",
  color: "#3dff8a",
  background: "rgba(0, 0, 0, 0.6)",
  pointerEvents: "none",
};

/** Whether the debug overlay is shown: off at first, flipped by each press of the toggle key. */
export function useDebugOverlay(): boolean {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === TOGGLE_KEY && !event.repeat) setShown((current) => !current);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return shown;
}

/**
 * Drawn at the current tick, not interpolated: this is where the physics really is, so a moving mesh
 * trails its outline by up to one tick.
 */
export function ColliderOutlines({ source }: { source: FrameSource }) {
  const lines = useRef<LineSegments>(null);

  useFrame(() => {
    const geometry = lines.current?.geometry;
    if (!geometry) return;

    const outlines = source.colliderOutlines();
    const vertexCount = outlines.length * 2;
    // A vertex buffer cannot grow once it is on the GPU, so a larger one replaces it.
    if (
      !geometry.hasAttribute("position") ||
      geometry.getAttribute("position").count < vertexCount
    ) {
      geometry.setAttribute("position", new BufferAttribute(new Float32Array(vertexCount * 3), 3));
    }

    const positions = geometry.getAttribute("position");
    outlines.forEach(({ start, end }, index) => {
      positions.setXYZ(index * 2, start.x, 0, start.y);
      positions.setXYZ(index * 2 + 1, end.x, 0, end.y);
    });
    positions.needsUpdate = true;
    geometry.setDrawRange(0, vertexCount);
  });

  return (
    // The positions change every frame without the bounding volume being recomputed, so culling would be wrong.
    <lineSegments ref={lines} frustumCulled={false} renderOrder={1}>
      <bufferGeometry />
      {/* Colliders lie on the ground, under the meshes: skipping the depth test and drawing in the last pass keeps them visible. */}
      <lineBasicMaterial color="#3dff8a" depthTest={false} transparent />
    </lineSegments>
  );
}

export function TickCounter({ source }: { source: FrameSource }) {
  const label = useRef<HTMLDivElement>(null);

  // The tick changes every frame: it is written straight to the DOM, never through React state.
  useEffect(
    () =>
      addAfterEffect(() => {
        if (label.current) label.current.textContent = `Tick ${source.frame.current.tick}`;
      }),
    [source],
  );

  return <div ref={label} style={TICK_COUNTER_STYLE} />;
}
