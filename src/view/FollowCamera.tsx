import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { MathUtils, Vector3 } from "three";
import { heroGroundPosition, type FrameSource } from "./frame";

export const CAMERA_FOV = 30;

const TILT = MathUtils.degToRad(55);
const DISTANCE = 30;
const OFFSET = new Vector3(0, Math.sin(TILT) * DISTANCE, Math.cos(TILT) * DISTANCE);
/** Higher is stiffer; at 8 the camera closes most of a gap in about a quarter of a second. */
const SMOOTHING = 8;

export function FollowCamera({ heroId, source }: { heroId: number; source: FrameSource }) {
  const focus = useRef<Vector3>(null);
  const target = useRef(new Vector3());

  useFrame(({ camera }, delta) => {
    heroGroundPosition(source.frame, heroId, target.current);
    if (focus.current) {
      focus.current.x = MathUtils.damp(focus.current.x, target.current.x, SMOOTHING, delta);
      focus.current.z = MathUtils.damp(focus.current.z, target.current.z, SMOOTHING, delta);
    } else {
      focus.current = target.current.clone();
    }
    camera.position.copy(focus.current).add(OFFSET);
    camera.lookAt(focus.current);
  });

  return null;
}
