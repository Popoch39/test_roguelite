import { useFrame } from "@react-three/fiber";
import { useState } from "react";
import type { FrameSource } from "./frame";

// Kept low: from the tilted camera, a wall or a pillar hides the floor just behind it.
const OBSTACLE_HEIGHT = 1;

export function RoomMesh({ source }: { source: FrameSource }) {
  const [room, setRoom] = useState(() => source.frame.current.room);

  // React only hears about it when the Hero enters another Room, never on an ordinary frame.
  useFrame(() => {
    if (source.frame.current.room !== room) setRoom(source.frame.current.room);
  });

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2}>
        <planeGeometry args={[room.width, room.height]} />
        <meshStandardMaterial color="#2c3440" />
      </mesh>
      {room.walls.map(({ center, halfExtents }) => (
        <mesh key={`${center.x}:${center.y}`} position={[center.x, OBSTACLE_HEIGHT / 2, center.y]}>
          <boxGeometry args={[halfExtents.x * 2, OBSTACLE_HEIGHT, halfExtents.y * 2]} />
          <meshStandardMaterial color="#5b6675" />
        </mesh>
      ))}
      {room.pillars.map(({ center, radius }) => (
        <mesh key={`${center.x}:${center.y}`} position={[center.x, OBSTACLE_HEIGHT / 2, center.y]}>
          <cylinderGeometry args={[radius, radius, OBSTACLE_HEIGHT, 24]} />
          <meshStandardMaterial color="#5b6675" />
        </mesh>
      ))}
    </group>
  );
}
