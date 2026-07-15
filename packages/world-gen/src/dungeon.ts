import { type DecisionVector } from '../../core-math/src/decisionVector.js';
import { mulberry32, seededChoice, seededRange } from '../../core-math/src/prng.js';
import { sigmoid } from '../../core-math/src/mappingFunctions.js';

export interface DungeonGraph {
  rooms: Array<{ id: string; x: number; y: number; w: number; h: number }>;
  edges: Array<{ from: string; to: string }>;
}

export function generateDungeonLayout(seed: number, vector: DecisionVector): DungeonGraph {
  const rng = mulberry32(seed);
  const baseRoomCount = 6 + Math.round(sigmoid(vector.riskTolerance + vector.aggression) * 4);
  const roomCount = Math.max(3, Math.min(10, baseRoomCount));
  const rooms = Array.from({ length: roomCount }, (_, index) => {
    const x = Math.round(seededRange(rng, 0, 10));
    const y = Math.round(seededRange(rng, 0, 10));
    const w = 1 + Math.round(seededRange(rng, 1, 3));
    const h = 1 + Math.round(seededRange(rng, 1, 3));
    return { id: `room-${index}`, x, y, w, h };
  });

  const nonOverlapping = [] as typeof rooms;
  for (const room of rooms) {
    if (nonOverlapping.every((candidate) => !roomsOverlap(candidate, room))) {
      nonOverlapping.push(room);
    }
  }

  const finalRooms = nonOverlapping.length > 0 ? nonOverlapping : rooms;
  const roomCenters = finalRooms.map((room) => ({ id: room.id, x: room.x + room.w / 2, y: room.y + room.h / 2 }));
  const edges: Array<{ from: string; to: string }> = [];
  for (let index = 1; index < roomCenters.length; index += 1) {
    const prev = roomCenters[index - 1];
    const curr = roomCenters[index];
    edges.push({ from: prev.id, to: curr.id });
  }

  const extraEdgeCount = Math.max(0, Math.round(sigmoid(vector.socialAffinity + vector.curiosity) * (roomCenters.length - 1)));
  for (let index = 0; index < extraEdgeCount; index += 1) {
    const from = seededChoice(rng, roomCenters).id;
    const to = seededChoice(rng, roomCenters).id;
    if (from !== to && !edges.some((edge) => (edge.from === from && edge.to === to) || (edge.from === to && edge.to === from))) {
      edges.push({ from, to });
    }
  }

  return { rooms: finalRooms, edges };
}

function roomsOverlap(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
