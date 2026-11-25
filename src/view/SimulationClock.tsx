import { useFrame } from "@react-three/fiber";
import type { FrameSource } from "./frame";

export function SimulationClock({ source }: { source: FrameSource }) {
  // A negative priority runs before every drawing callback, so they all read the same frame.
  useFrame((_, delta) => source.advance(delta), -1);
  return null;
}
