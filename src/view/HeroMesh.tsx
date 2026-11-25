import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { CircleGeometry, type Group, type Mesh } from "three";
import type { Hero } from "../sim";
import { heroGroundPosition, type FrameSource } from "./frame";

const BODY_LENGTH = 0.8;
// At head height: any lower and the body hides it from the tilted camera when the Hero faces away.
const MARKER_LIFT = 0.15;
const SECTOR_SEGMENTS = 24;
// Lifted off the floor, which it would otherwise flicker against.
const SECTOR_HEIGHT = 0.03;

export function HeroMesh({ hero, source }: { hero: Hero; source: FrameSource }) {
  const group = useRef<Group>(null);
  const sector = useRef<Mesh>(null);
  const sectorAngle = useRef(0);
  const standingHeight = hero.radius + BODY_LENGTH / 2;
  const markerHeight = hero.radius + BODY_LENGTH + MARKER_LIFT;

  useFrame(() => {
    const current = source.frame.current.heroes.find(({ id }) => id === hero.id);
    if (!group.current || !sector.current || !current) return;
    heroGroundPosition(source.frame, hero.id, group.current.position);
    // Simulation y runs along the view's z, so turning toward +y is a negative turn around the vertical axis.
    group.current.rotation.y = Math.atan2(-current.facing.y, current.facing.x);

    const attack = current.attack?.phase === "active" ? current.attack : null;
    sector.current.visible = attack !== null;
    if (!attack) return;
    if (attack.angle !== sectorAngle.current) {
      sector.current.geometry.dispose();
      sector.current.geometry = new CircleGeometry(
        1,
        SECTOR_SEGMENTS,
        -attack.angle / 2,
        attack.angle,
      );
      sectorAngle.current = attack.angle;
    }
    sector.current.scale.setScalar(attack.reach);
  });

  // The group's local +x is the Hero's facing.
  return (
    <group ref={group}>
      <mesh position-y={standingHeight}>
        <capsuleGeometry args={[hero.radius, BODY_LENGTH]} />
        <meshStandardMaterial color="#e8a33d" />
      </mesh>
      <mesh position={[hero.radius + 0.2, markerHeight, 0]} rotation-z={-Math.PI / 2}>
        <coneGeometry args={[0.2, 0.45, 12]} />
        <meshStandardMaterial color="#fff1cf" />
      </mesh>
      <mesh ref={sector} visible={false} position-y={SECTOR_HEIGHT} rotation-x={-Math.PI / 2}>
        <meshBasicMaterial color="#ffd27a" transparent opacity={0.55} />
      </mesh>
    </group>
  );
}
