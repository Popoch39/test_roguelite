import type { RoomTemplate } from "./types";

// Each has more spawn points than the fullest Room has Enemies, all far enough from the entry point
// that the Hero can size up the fight before the first Enemy reaches it.
export const DEFAULT_ROOM_TEMPLATES: RoomTemplate[] = [
  // Four pillars around the centre; the Hero enters on the left.
  {
    width: 24,
    height: 16,
    entryPoint: { x: -10, y: 0 },
    pillars: [
      { center: { x: -4, y: -4 }, radius: 1 },
      { center: { x: -4, y: 4 }, radius: 1 },
      { center: { x: 4, y: -4 }, radius: 1 },
      { center: { x: 4, y: 4 }, radius: 1 },
    ],
    spawnPoints: [
      { x: 0, y: -6 },
      { x: 0, y: 0 },
      { x: 0, y: 6 },
      { x: 4, y: 0 },
      { x: 8, y: -6 },
      { x: 8, y: 0 },
      { x: 8, y: 6 },
      { x: 10, y: -3 },
      { x: 10, y: 3 },
    ],
  },
  // A wide hall cut by a row of three pillars; the Hero enters at the bottom.
  {
    width: 28,
    height: 14,
    entryPoint: { x: 0, y: 5.5 },
    pillars: [
      { center: { x: -6, y: 0 }, radius: 0.8 },
      { center: { x: 0, y: 0 }, radius: 0.8 },
      { center: { x: 6, y: 0 }, radius: 0.8 },
    ],
    spawnPoints: [
      { x: -12, y: -5 },
      { x: -8, y: -4 },
      { x: -4, y: -5 },
      { x: 0, y: -4 },
      { x: 4, y: -5 },
      { x: 8, y: -4 },
      { x: 12, y: -5 },
      { x: -12, y: 1 },
      { x: 12, y: 1 },
    ],
  },
  // A square around one large pillar; the Hero enters in a corner.
  {
    width: 20,
    height: 20,
    entryPoint: { x: -8, y: 8 },
    pillars: [
      { center: { x: 0, y: 0 }, radius: 2 },
      { center: { x: -5, y: 5 }, radius: 0.8 },
      { center: { x: 5, y: -5 }, radius: 0.8 },
    ],
    spawnPoints: [
      { x: 8, y: -8 },
      { x: 8, y: 0 },
      { x: 8, y: 8 },
      { x: 0, y: -8 },
      { x: -8, y: -8 },
      { x: -4, y: -5 },
      { x: 3, y: 6 },
      { x: -8, y: -1 },
    ],
  },
  // A long gallery with pillars staggered along it; the Hero enters at the left end.
  {
    width: 26,
    height: 12,
    entryPoint: { x: -11, y: 0 },
    pillars: [
      { center: { x: -5, y: -2.5 }, radius: 1 },
      { center: { x: 0, y: 2.5 }, radius: 1 },
      { center: { x: 5, y: -2.5 }, radius: 1 },
      { center: { x: 9, y: 2.5 }, radius: 1 },
    ],
    spawnPoints: [
      { x: -3, y: 3 },
      { x: -1, y: -4 },
      { x: 2, y: -1 },
      { x: 4, y: 4 },
      { x: 7, y: 0 },
      { x: 8, y: -4 },
      { x: 11, y: -3 },
      { x: 11, y: 4 },
    ],
  },
];
