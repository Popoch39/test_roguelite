import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import type { Group, MeshStandardMaterial, Sprite } from "three";
import type { Enemy } from "../sim";
import { enemyGroundPosition, type FrameSource } from "./frame";

const BODY_LENGTH = 0.6;
const FLASH_TICKS = 6;
const BAR_WIDTH = 1.2;
const BAR_HEIGHT = 0.14;
const BAR_GAP = 0.45;

export function EnemyMeshes({ source }: { source: FrameSource }) {
  const [enemies, setEnemies] = useState(() => [...source.frame.current.enemies]);

  // React only hears about it when an Enemy appears or disappears, never on an ordinary frame.
  useFrame(() => {
    const current = source.frame.current.enemies;
    const unchanged =
      current.length === enemies.length &&
      current.every((enemy, index) => enemy.id === enemies[index]?.id);
    if (!unchanged) setEnemies([...current]);
  });

  return enemies.map((enemy) => <EnemyMesh key={enemy.id} enemy={enemy} source={source} />);
}

function EnemyMesh({ enemy, source }: { enemy: Enemy; source: FrameSource }) {
  const group = useRef<Group>(null);
  const body = useRef<MeshStandardMaterial>(null);
  const healthFill = useRef<Sprite>(null);
  const standingHeight = enemy.radius + BODY_LENGTH / 2;
  const barHeight = enemy.radius * 2 + BODY_LENGTH + BAR_GAP;

  useFrame(() => {
    const { current } = source.frame;
    const live = current.enemies.find(({ id }) => id === enemy.id);
    if (!group.current || !body.current || !healthFill.current || !live) return;
    enemyGroundPosition(source.frame, enemy.id, group.current.position);

    const flashing =
      live.lastDamagedTick !== null && current.tick - live.lastDamagedTick <= FLASH_TICKS;
    body.current.emissive.set(flashing ? "#ffffff" : "#000000");
    healthFill.current.scale.x = (BAR_WIDTH * Math.max(live.health, 0)) / live.maxHealth;
  });

  return (
    <group ref={group}>
      <mesh position-y={standingHeight}>
        <capsuleGeometry args={[enemy.radius, BODY_LENGTH]} />
        <meshStandardMaterial ref={body} color="#c94f4f" />
      </mesh>
      <sprite position-y={barHeight} scale={[BAR_WIDTH, BAR_HEIGHT, 1]} renderOrder={1}>
        <spriteMaterial color="#10131a" depthTest={false} />
      </sprite>
      {/* Anchored by its left end so that it empties toward the left; the camera never turns, so the view's -x is the screen's left. */}
      <sprite
        ref={healthFill}
        center={[0, 0.5]}
        position={[-BAR_WIDTH / 2, barHeight, 0]}
        scale={[BAR_WIDTH, BAR_HEIGHT, 1]}
        renderOrder={2}
      >
        <spriteMaterial color="#7bd66f" depthTest={false} />
      </sprite>
    </group>
  );
}
