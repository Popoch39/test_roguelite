import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { Plane, Raycaster, Vector2, Vector3 } from "three";
import type { Mouse } from "./mouse";

const GROUND = new Plane(new Vector3(0, 1, 0), 0);

export function CursorOnGround({ mouse }: { mouse: Mouse }) {
  const raycaster = useRef(new Raycaster());
  const pointer = useRef(new Vector2());
  const hit = useRef(new Vector3());

  // Runs before the simulation clock, so this frame's commands aim at where the cursor is now.
  useFrame(({ camera, size }) => {
    const cursor = mouse.cursor();
    if (!cursor) return;
    pointer.current.set(
      ((cursor.x - size.left) / size.width) * 2 - 1,
      1 - ((cursor.y - size.top) / size.height) * 2,
    );
    raycaster.current.setFromCamera(pointer.current, camera);
    if (raycaster.current.ray.intersectPlane(GROUND, hit.current)) {
      mouse.placeOnGround({ x: hit.current.x, y: hit.current.z });
    }
  }, -2);

  return null;
}
