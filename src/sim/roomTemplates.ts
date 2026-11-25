import type { RoomTemplate } from "./types";

export const DEFAULT_ROOM_TEMPLATE: RoomTemplate = {
  width: 24,
  height: 16,
  entryPoint: { x: -8, y: 0 },
  spawnPoints: [
    { x: 4, y: -4 },
    { x: 7, y: 1 },
    { x: 3, y: 5 },
  ],
};
