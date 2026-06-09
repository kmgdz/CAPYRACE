import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { TRACKS } from '../lib/track';
import { mapData } from '../lib/mapData';
import * as THREE from 'three';
import { audioSystem } from '../audio';
import { Trail } from '@react-three/drei';
import { useStore, gameRacers } from '../store';

import { KartType } from '../store';
import { KartVisuals } from './KartVisuals';

const v_up = new THREE.Vector3(0, 1, 0);
const v_right = new THREE.Vector3();
const v_finalPos = new THREE.Vector3();

export function AI({ index = 0, offset = 0, color = "#ffcc00", speedOffset = 1 }) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Group>(null);
  const capyRef = useRef<THREE.Group>(null);
  const progressRef = useRef(0); // start at exactly the start line
  const spinOutTimerRef = useRef(0);
  const lapRef = useRef(1);
  const { gameState } = useStore();
  
  const baseSpeed = 0.04; // Percentage of track per second

  // Position initialized slightly back from start line so they look like a grid
  const initialOffsetDist = -0.005 - (index * 0.008); 
  
  useFrame((state, delta) => {
    if (!groupRef.current || !meshRef.current) return;
    
    const trackConfig = TRACKS[useStore.getState().trackType];
    const { trackCurve, mudPitsData, movingHazardsData } = trackConfig;
    
    if (gameState === 'MENU' || gameState === 'COUNTDOWN') {
      lapRef.current = 1;
      // Just set them on their initial positions
      const startT = (1 + initialOffsetDist) % 1;
      const point = trackCurve.getPointAt(startT);
      audioSystem.updateEngine(`ai_${index}`, 0, point);
      const tangent = trackCurve.getTangentAt(startT).normalize();
      v_right.crossVectors(tangent, v_up).normalize();
      
      // Index 0: Left, Index 1: Right, Index 2: Left, etc.
      const lateralOffset = (index % 2 === 0 ? 1 : -1) * 3; 
      const finalPos = point.clone().addScaledVector(v_right, lateralOffset);
      const angle = Math.atan2(tangent.x, tangent.z);
      
      groupRef.current.position.set(finalPos.x, 1.5, finalPos.z);
      groupRef.current.rotation.set(0, angle, 0);
      progressRef.current = startT;
      return;
    }

    if (gameState !== 'PLAYING' && gameState !== 'FINISHED') return;
    
    // Stop if AI finished all laps
    if (lapRef.current > useStore.getState().maxLaps) {
       audioSystem.updateEngine(`ai_${index}`, 0, groupRef.current.position);
       return; 
    }
    
    let currentSpeed = baseSpeed * speedOffset * (1 + Math.sin(Date.now() * 0.001 + offset * 10) * 0.15);
    
    // Check Hazards and Mud Pits
    let isSpinning = false;
    if (spinOutTimerRef.current > 0) {
        spinOutTimerRef.current -= delta;
        currentSpeed = 0; // stop moving
        isSpinning = true;
        meshRef.current.rotation.y += 15 * delta; // spin around
    } else {
        meshRef.current.rotation.y = 0; // reset local rotation
        
        const p2x = groupRef.current.position.x;
        const p2z = groupRef.current.position.z;
        
        // Mud pits slow down
        for (let i = 0; i < mudPitsData.length; i++) {
            const pit = mudPitsData[i];
            const dx = pit.position.x - p2x;
            const dz = pit.position.z - p2z;
            if (dx*dx + dz*dz < pit.radiusSq) {
                currentSpeed *= 0.5; // slow down AI heavily
            }
        }
        
        // Moving hazards
        const elapsed = state.clock.elapsedTime;
        for (let i = 0; i < movingHazardsData.length; i++) {
            const hazard = movingHazardsData[i];
            const hazardOffset = Math.sin(elapsed * hazard.speed * 0.1) * hazard.offsetRange;
            const posX = hazard.basePos.x + hazard.right.x * hazardOffset;
            const posZ = hazard.basePos.z + hazard.right.z * hazardOffset;
            const dx = posX - p2x;
            const dz = posZ - p2z;
            if (dx*dx + dz*dz < hazard.radiusSq + 4) {
                spinOutTimerRef.current = 1.0;
                currentSpeed = 0;
                isSpinning = true;
                if (spinOutTimerRef.current === 1.0) audioSystem.playCrash(groupRef.current.position);
            }
        }
    }
    
    progressRef.current += currentSpeed * delta;
    while (progressRef.current > 1) {
      progressRef.current -= 1;
      lapRef.current += 1;
    }
    
    const point = trackCurve.getPointAt(progressRef.current);
    const tangent = trackCurve.getTangentAt(progressRef.current).normalize();
    
    v_right.crossVectors(tangent, v_up).normalize();
    const lateralOffset = (index % 2 === 0 ? 1 : -1) * 4 + Math.sin(Date.now() * 0.002 + offset * 5) * 2;
    
    const finalPos = point.clone().addScaledVector(v_right, lateralOffset);
    
    // Set position and rotation
    const angle = Math.atan2(tangent.x, tangent.z);
    
    v_finalPos.set(finalPos.x, 1.5, finalPos.z);
    groupRef.current.position.lerp(v_finalPos, 0.5);
    
    // basic slerp for rotation or direct set
    groupRef.current.rotation.set(0, angle, 0);
    
    audioSystem.updateEngine(`ai_${index}`, speedOffset, groupRef.current.position);

    gameRacers[`ai-${index}`] = {
        progress: lapRef.current + progressRef.current,
        isPlayer: false
    };

    // Update map data safely
    if (mapData.aiTargetsX.length <= index) {
      mapData.aiTargetsX.push(finalPos.x);
      mapData.aiTargetsZ.push(finalPos.z);
    } else {
      mapData.aiTargetsX[index] = finalPos.x;
      mapData.aiTargetsZ[index] = finalPos.z;
    }

    // AI Lean
    if (!isSpinning) {
       const turnAmount = tangent.x * 0.15; // roughly simulate lean based on heading
       meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, turnAmount, 0.1);
    } else {
       meshRef.current.rotation.z = 0;
    }

    if (capyRef.current && !isSpinning) {
        capyRef.current.position.y = Math.abs(Math.sin(Date.now() * 0.02 + offset * 20)) * 0.3;
    }
  });

  // Assign kart types
  const types: KartType[] = ['classic', 'f1', 'cyber'];
  const kartType = types[index % types.length];
  const trackType = useStore(state => state.trackType);

  let trailColor = color;
  let trailWidth = 1.5;
  let trailLength = 8;
  if (trackType === 'desert') {
      trailColor = '#e3c16f';
      trailWidth = 3.0;
  } else if (kartType === 'cyber') {
      trailColor = '#FFFFFF';
  }

  const resolvedTrailColor = useMemo(() => new THREE.Color(trailColor), [trailColor]);

  return (
    <group ref={groupRef}>
      <Trail width={trailWidth} length={trailLength} color={resolvedTrailColor} attenuation={(t) => t * t}>
        <group ref={meshRef} scale={1.5}>
           <KartVisuals capyRef={capyRef} color={color} type={kartType} isBoosting={gameState === 'PLAYING' && Math.random() > 0.8} />
        </group>
      </Trail>
    </group>
  );
}
