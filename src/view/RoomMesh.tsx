import type { Room } from "../sim";

// Kept low: from the tilted camera, the near wall hides the floor just behind it.
const WALL_HEIGHT = 1;

export function RoomMesh({ room }: { room: Room }) {
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2}>
        <planeGeometry args={[room.width, room.height]} />
        <meshStandardMaterial color="#2c3440" />
      </mesh>
      {room.walls.map(({ center, halfExtents }) => (
        <mesh key={`${center.x}:${center.y}`} position={[center.x, WALL_HEIGHT / 2, center.y]}>
          <boxGeometry args={[halfExtents.x * 2, WALL_HEIGHT, halfExtents.y * 2]} />
          <meshStandardMaterial color="#5b6675" />
        </mesh>
      ))}
    </group>
  );
}
