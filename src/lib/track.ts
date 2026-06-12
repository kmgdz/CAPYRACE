import * as THREE from 'three';
import { TrackType } from '../store';

const JUNGLE_POINTS = [
  new THREE.Vector3(0, 0, 100),
  new THREE.Vector3(150, 0, 200),
  new THREE.Vector3(300, 0, 50),
  new THREE.Vector3(150, 0, -100),
  new THREE.Vector3(250, 0, -250),
  new THREE.Vector3(0, 0, -350),
  new THREE.Vector3(-250, 0, -150),
  new THREE.Vector3(-150, 0, 50),
  new THREE.Vector3(-250, 0, 150),
];

const ICE_POINTS = [
  new THREE.Vector3(0, 0, 100),
  new THREE.Vector3(100, 0, 250),
  new THREE.Vector3(400, 0, 150),
  new THREE.Vector3(300, 0, -50),
  new THREE.Vector3(400, 0, -200),
  new THREE.Vector3(150, 0, -300),
  new THREE.Vector3(-200, 0, -200),
  new THREE.Vector3(-300, 0, 0),
  new THREE.Vector3(-100, 0, 200),
];

const DEFAULT_POINTS = [
  new THREE.Vector3(0, 0, 100),
  new THREE.Vector3(200, 0, 100),
  new THREE.Vector3(300, 0, 50),
  new THREE.Vector3(300, 0, -100),
  new THREE.Vector3(150, 0, -250),
  new THREE.Vector3(-100, 0, -250),
  new THREE.Vector3(-250, 0, -100),
  new THREE.Vector3(-250, 0, 50),
  new THREE.Vector3(-150, 0, 100),
];

function createTrackData(points: THREE.Vector3[], config: { numBoosts: number, numGroups: number, numCrates: number, numPits: number, numHazards: number, numNitros: number, seed: number }) {
    const trackCurve = new THREE.CatmullRomCurve3(points, true);
    const pathPoints = trackCurve.getSpacedPoints(600);
    
    const s = Math.sin;
    const seed = config.seed;
    
    // Boost Pads
    const boostPadsData = [];
    for (let i = 1; i <= config.numBoosts; i++) {
        const t = (i / config.numBoosts) - 0.05; 
        const p = trackCurve.getPointAt(t);
        const tangent = trackCurve.getTangentAt(t).normalize();
        const right = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();
        const lateralOffset = (((s(i * 12.9898 + seed) * 43758.5453) % 1) - 0.5) * 16;
        boostPadsData.push({ position: p.clone().addScaledVector(right, lateralOffset).setY(0.1), radiusSq: 36 });
    }

    // Item Boxes
    const itemBoxesData = [];
    for (let i = 1; i <= config.numGroups; i++) {
        const t = (i / config.numGroups) - 0.15;
        const p = trackCurve.getPointAt(t);
        const tangent = trackCurve.getTangentAt(t).normalize();
        const right = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();
        for (let j = -1; j <= 1; j++) {
            itemBoxesData.push({ id: `box-${i}-${j}`, position: p.clone().addScaledVector(right, j * 8).setY(1), radiusSq: 4 });
        }
    }

    // Crates
    const cratesData = [];
    for (let i = 1; i <= config.numCrates; i++) {
        const t = Math.min(Math.max((i / config.numCrates) + (s(i * 123 + seed) * 0.1), 0.1), 0.9);
        const p = trackCurve.getPointAt(t);
        const tangent = trackCurve.getTangentAt(t).normalize();
        const right = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();
        const lateralOffset = (((s(i * 77.123 + seed) * 43758.5453) % 1) - 0.5) * 20;
        cratesData.push({ id: `crate-${i}`, position: p.clone().addScaledVector(right, lateralOffset).setY(1.5), radiusSq: 4 });
    }

    // Mud Pits
    const mudPitsData = [];
    for (let i = 1; i <= config.numPits; i++) {
        const t = Math.min(Math.max((i / config.numPits) + (s(i * 45 + seed) * 0.1), 0.1), 0.9);
        const p = trackCurve.getPointAt(t);
        const tangent = trackCurve.getTangentAt(t).normalize();
        const right = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();
        const lateralOffset = (((s(i * 33.123 + seed) * 43758.5453) % 1) - 0.5) * 16;
        mudPitsData.push({ position: p.clone().addScaledVector(right, lateralOffset).setY(0.1), radius: 6, radiusSq: 36 });
    }

    // Hazards
    const movingHazardsData = [];
    for (let i = 1; i <= config.numHazards; i++) {
        const t = Math.min(Math.max((i / config.numHazards) + (s(i * 99 + seed) * 0.1), 0.1), 0.9);
        const p = trackCurve.getPointAt(t);
        const tangent = trackCurve.getTangentAt(t).normalize();
        const right = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();
        movingHazardsData.push({ id: `rock-${i}`, trackT: t, basePos: p, right: right, radius: 2.5, radiusSq: 6.25, speed: 10 + (s(i * 11 + seed) * 5), offsetRange: 16 });
    }

    // Nitros
    const nitroPickupsData = [];
    for (let i = 1; i <= config.numNitros; i++) {
        const t = Math.min(Math.max((i / config.numNitros) + (s(i * 153 + seed) * 0.1), 0.05), 0.95);
        const p = trackCurve.getPointAt(t);
        const tangent = trackCurve.getTangentAt(t).normalize();
        const right = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();
        const lateralOffset = (((s(i * 27.123 + seed) * 43758.5453) % 1) - 0.5) * 24;
        nitroPickupsData.push({ id: `nitro-${i}`, position: p.clone().addScaledVector(right, lateralOffset).setY(1), radiusSq: 9 });
    }

    return { trackCurve, pathPoints, boostPadsData, itemBoxesData, cratesData, mudPitsData, movingHazardsData, nitroPickupsData };
}

export const TRACKS: Record<TrackType, ReturnType<typeof createTrackData>> = {
  neon_city: createTrackData(DEFAULT_POINTS, { numBoosts: 6, numGroups: 4, numCrates: 12, numPits: 5, numHazards: 6, numNitros: 10, seed: 10 }),
  desert: createTrackData(DEFAULT_POINTS, { numBoosts: 8, numGroups: 5, numCrates: 15, numPits: 8, numHazards: 8, numNitros: 12, seed: 20 }),
  space: createTrackData(DEFAULT_POINTS, { numBoosts: 4, numGroups: 3, numCrates: 20, numPits: 0, numHazards: 12, numNitros: 8, seed: 30 }),
  jungle: createTrackData(JUNGLE_POINTS, { numBoosts: 5, numGroups: 5, numCrates: 8, numPits: 12, numHazards: 4, numNitros: 15, seed: 40 }),
  icy_mountain: createTrackData(ICE_POINTS, { numBoosts: 10, numGroups: 4, numCrates: 5, numPits: 2, numHazards: 10, numNitros: 10, seed: 50 }),
};

export function getClosestPointOnPath(pathPoints: THREE.Vector3[], position: THREE.Vector3, hintIndex: number = -1, searchWindow: number = 40) {
  let closestDist = Infinity;
  let closestIndex = 0;
  
  const pos2x = position.x;
  const pos2z = position.z;

  if (hintIndex !== -1) {
    for (let i = -searchWindow; i <= searchWindow; i++) {
      let idx = (hintIndex + i) % pathPoints.length;
      if (idx < 0) idx += pathPoints.length;
      const pt = pathPoints[idx];
      const dx = pos2x - pt.x;
      const dz = pos2z - pt.z;
      const d2 = dx*dx + dz*dz;
      if (d2 < closestDist) {
        closestDist = d2;
        closestIndex = idx;
      }
    }
  } else {
    for (let i = 0; i < pathPoints.length; i++) {
        const pt = pathPoints[i];
        const dx = pos2x - pt.x;
        const dz = pos2z - pt.z;
        const d2 = dx*dx + dz*dz;
      if (d2 < closestDist) {
        closestDist = d2;
        closestIndex = i;
      }
    }
  }

  return { point: pathPoints[closestIndex], index: closestIndex, distance: Math.sqrt(closestDist) };
}

export function getTrackProgress(pathPoints: THREE.Vector3[], position: THREE.Vector3, currentProgressIndex: number) {
  const SEARCH_RAD = 30;
  let nextIndex = currentProgressIndex;
  let minDistSq = Infinity;

  const pos2x = position.x;
  const pos2z = position.z;

  for (let i = -SEARCH_RAD; i <= SEARCH_RAD; i++) {
    let checkIndex = (currentProgressIndex + i) % pathPoints.length;
    if (checkIndex < 0) checkIndex += pathPoints.length;

    const pt = pathPoints[checkIndex];
    const dx = pos2x - pt.x;
    const dz = pos2z - pt.z;
    const distSq = dx*dx + dz*dz;

    if (distSq < minDistSq) {
      minDistSq = distSq;
      nextIndex = checkIndex;
    }
  }
  return nextIndex;
}
