import { Canvas } from "@react-three/fiber";
import { FollowCamera, CAMERA_FOV } from "./FollowCamera";
import type { FrameSource } from "./frame";
import { HeroMesh } from "./HeroMesh";
import { RoomMesh } from "./RoomMesh";
import { SimulationClock } from "./SimulationClock";

export function GameView({ source }: { source: FrameSource }) {
  const { room, heroes } = source.frame.current;
  const followed = heroes[0];

  return (
    <Canvas camera={{ fov: CAMERA_FOV, near: 1, far: 200 }}>
      <SimulationClock source={source} />
      <color attach="background" args={["#14181f"]} />
      <ambientLight intensity={1.2} />
      <directionalLight position={[6, 12, 4]} intensity={2} />
      <RoomMesh room={room} />
      {heroes.map((hero) => (
        <HeroMesh key={hero.id} hero={hero} source={source} />
      ))}
      {followed && <FollowCamera heroId={followed.id} source={source} />}
    </Canvas>
  );
}
