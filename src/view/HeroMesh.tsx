import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Mesh } from "three";
import type { Hero } from "../sim";
import { heroGroundPosition, type FrameSource } from "./frame";

const BODY_LENGTH = 0.8;

export function HeroMesh({ hero, source }: { hero: Hero; source: FrameSource }) {
  const mesh = useRef<Mesh>(null);
  const standingHeight = hero.radius + BODY_LENGTH / 2;

  useFrame(() => {
    if (!mesh.current) return;
    heroGroundPosition(source.frame, hero.id, mesh.current.position);
    mesh.current.position.y = standingHeight;
  });

  return (
    <mesh ref={mesh}>
      <capsuleGeometry args={[hero.radius, BODY_LENGTH]} />
      <meshStandardMaterial color="#e8a33d" />
    </mesh>
  );
}
