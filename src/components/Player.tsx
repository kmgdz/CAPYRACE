import { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useStore, gameRacers } from '../store';
import { TRACKS, getTrackProgress, getClosestPointOnPath } from '../lib/track';
import { mapData } from '../lib/mapData';
import * as THREE from 'three';
import { useKeyboardControls, Trail, Sparkles } from '@react-three/drei';

import { KartVisuals } from './KartVisuals';
import { audioSystem } from '../audio';

const v_direction = new THREE.Vector3();
const v_curvePoint = new THREE.Vector3();
const v_scaleBoost = new THREE.Vector3(0.9, 0.9, 1.2);
const v_scaleNorm = new THREE.Vector3(1, 1, 1);
const v_camOffset = new THREE.Vector3();
const v_lookOffset = new THREE.Vector3();
const v_pushDir = new THREE.Vector3();
const v_newPos = new THREE.Vector3();
const v_cameraTarget = new THREE.Vector3();
const v_lookTarget = new THREE.Vector3();
const v_camTargetReplay = new THREE.Vector3();
const v_lookTargetReplay = new THREE.Vector3();
const v_reusableVec1 = new THREE.Vector3();
const v_reusableVec2 = new THREE.Vector3();
const v_tempEuler = new THREE.Euler();

export function Player() {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Group>(null);
  const capyRef = useRef<THREE.Group>(null);
  const trailRef = useRef<THREE.Group>(null);
  
  const setSpeed = useStore(state => state.setSpeed);
  const setLap = useStore(state => state.setLap);
  const lap = useStore(state => state.lap);
  const maxLaps = useStore(state => state.maxLaps);
  const setGameState = useStore(state => state.setGameState);
  const gameState = useStore(state => state.gameState);

  const kartType = useStore(state => state.kartType);
  const kartColor = useStore(state => state.kartColor);
  const weather = useStore(state => state.weather);

  const [, getKeys] = useKeyboardControls();
  
  const velocityRef = useRef(0);
  const boostRef = useRef(0);
  const driftRef = useRef(0); // tracks drift amount
  const hopVelocityRef = useRef(0);
  const hopHeightRef = useRef(0);
  const draftTimerRef = useRef(0);
  const lastCrashTimeRef = useRef(0);
  
  const progressIndexRef = useRef(0);
  const hasPassedHalfwayRef = useRef(false);
  const sparksRef = useRef(null as any);
  const hitWallTimerRef = useRef(0);
  const spinOutTimerRef = useRef(0);
  const wasShootPressedRef = useRef(false);
  
  const replayFramesRef = useRef<any[]>([]);
  const replayIndexRef = useRef(0);
  const replayCameraTimerRef = useRef(0);
  const replayCameraModeRef = useRef(0);

  const ACCELERATION = 140;
  const DECELERATION = 80;
  const TURN_SPEED = 2.8;
  const MAX_SPEED = 65;

  useEffect(() => {
    if (groupRef.current && (gameState === 'PLAYING' || gameState === 'COUNTDOWN' || gameState === 'MENU') && lap === 1) {
      const trackConfig = TRACKS[useStore.getState().trackType];
      const { trackCurve } = trackConfig;
      const tangent = trackCurve.getTangentAt(0).normalize();
      const right = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();
      
      // Player is pole position, right side
      const centerPos = trackCurve.getPointAt(0);
      const startPos = centerPos.clone().addScaledVector(right, -3);
      
      groupRef.current.position.set(startPos.x, 1.5, startPos.z);
      
      const angle = Math.atan2(tangent.x, tangent.z);
      groupRef.current.rotation.set(0, angle, 0);
      
      velocityRef.current = 0;
      boostRef.current = 0;
      driftRef.current = 0;
      progressIndexRef.current = 0;
      hasPassedHalfwayRef.current = false;
      useStore.getState().setNitro(0);
      replayFramesRef.current = [];
      replayIndexRef.current = 0;
    }
  }, [gameState, lap]);

  const prevGameState = useRef(gameState);

  useFrame((state, delta) => {
    if (!groupRef.current || !meshRef.current) return;
    
    if (gameState === 'PAUSED') {
       audioSystem.updateEngine('player', 0, groupRef.current.position);
       return;
    }
    
    if (gameState === 'REPLAY') {
       const replayData = useStore.getState().replayData;
       if (!replayData || replayData.length === 0) return;
       
       const trackConfig = TRACKS[useStore.getState().trackType];
       
       let idx = replayIndexRef.current;
       if (idx >= replayData.length) {
          idx = 0; // loop replay
          replayIndexRef.current = 0;
       }
       
       const frame = replayData[idx];
       groupRef.current.position.set(frame.p.x, frame.p.y, frame.p.z);
       groupRef.current.rotation.set(frame.r.x, frame.r.y, frame.r.z, frame.r.order);
       meshRef.current.rotation.set(frame.mr.x, frame.mr.y, frame.mr.z, frame.mr.order);
       meshRef.current.scale.set(frame.scale.x, frame.scale.y, frame.scale.z);
       if (capyRef.current) capyRef.current.position.y = frame.capyOffsetY;
       if (sparksRef.current) sparksRef.current.visible = frame.sparks;
       
       // Replay camera logic
       replayCameraTimerRef.current -= delta;
       if (replayCameraTimerRef.current <= 0) {
          replayCameraTimerRef.current = 3 + Math.random() * 4; // swap cameras
          replayCameraModeRef.current = Math.floor(Math.random() * 4);
       }
       
       v_camTargetReplay.set(frame.p.x, frame.p.y, frame.p.z);
       v_lookTargetReplay.set(frame.p.x, frame.p.y, frame.p.z);
       
       let camTarget = v_camTargetReplay;
       let lookTarget = v_lookTargetReplay;
       
       // Note: frame.r is not an Euler instance, so applyEuler(frame.r) would crash.
       // We'll reconstruct a temporary Euler to apply.
       v_tempEuler.set(frame.r.x, frame.r.y, frame.r.z, frame.r.order);

       switch(replayCameraModeRef.current) {
          case 0: // Cinematic follow close
             camTarget.add(v_reusableVec1.set(0, 3, -8).applyEuler(v_tempEuler));
             lookTarget.add(v_reusableVec2.set(0, 1, 10).applyEuler(v_tempEuler));
             break;
          case 1: // Cinematic follow far
             camTarget.add(v_reusableVec1.set(10, 8, -15).applyEuler(v_tempEuler));
             lookTarget.add(v_reusableVec2.set(0, 1, 0));
             break;
          case 2: // Low angle dramatic
             camTarget.add(v_reusableVec1.set(-4, 0.5, 6).applyEuler(v_tempEuler));
             lookTarget.add(v_reusableVec2.set(0, 1, 0));
             break;
          case 3: // Top down sweep
             camTarget.add(v_reusableVec1.set(0, 20, 0));
             break;
       }
       
       state.camera.position.lerp(camTarget, 0.1);
       state.camera.lookAt(lookTarget);
       audioSystem.updateListener(state.camera.position, v_reusableVec1.copy(lookTarget).sub(state.camera.position).normalize(), state.camera.up);
       
       audioSystem.updateEngine('player', frame.boost ? 1.0 : (frame.drift ? 0.6 : 0.4), groupRef.current.position);
       audioSystem.setDrifting(frame.drift);
       
       replayIndexRef.current += 1;
       return;
    }
    
    const keys = getKeys() as any; // Allow for dynamic keys typing
    const trackConfig = TRACKS[useStore.getState().trackType];
    const { boostPadsData, itemBoxesData, cratesData, mudPitsData, movingHazardsData, nitroPickupsData, pathPoints, trackCurve } = trackConfig;

    if (prevGameState.current === 'COUNTDOWN' && gameState === 'PLAYING') {
        if (keys.forward) {
            // Perfect start!
            boostRef.current = 2.0;
            velocityRef.current = MAX_SPEED * 0.8;
            audioSystem.updateEngine('player', 1.0, groupRef.current.position); // loudly rev
            audioSystem.playBoost();
        }
    }
    prevGameState.current = gameState;

    let currentVel = velocityRef.current;
    
    // Manage Nitro from Store
    let currentNitro = useStore.getState().nitro;

    // Apply Boost Decay
    if (boostRef.current > 0) {
        boostRef.current -= delta * 1.5;
        if (boostRef.current < 0) boostRef.current = 0;
    }

    // Apply Gas / Brake
    if (gameState === 'PLAYING') {
      if (spinOutTimerRef.current > 0) {
          spinOutTimerRef.current -= delta;
          currentVel *= 0.9;
          meshRef.current.rotation.y += Math.PI * 10 * delta; // spin visually!
      } else {
          // Normal mesh rotation when not spinning
          meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, 0, 0.1);
          
          // Apply weather effects
          const weatherAccelMult = weather === 'snow' ? 0.6 : weather === 'rain' ? 0.8 : 1.0;
          const weatherFriction = weather === 'snow' ? 0.995 : weather === 'rain' ? 0.99 : 0.98;

          if (keys.forward) {
            currentVel += ACCELERATION * weatherAccelMult * delta;
          } else if (keys.backward) {
            currentVel -= DECELERATION * weatherAccelMult * delta;
          } else {
            currentVel *= weatherFriction; // Friction
          }
          
          // Nitro Mechanics
          if (keys.useNitro && currentNitro > 0) {
              currentNitro -= 40 * delta; // Use 40% per second
              if (currentNitro < 0) currentNitro = 0;
              boostRef.current = 1.0; 
              currentVel += 50 * delta; // Force add speed
              if (Math.random() < 0.1) audioSystem.playBoost(); // occasional fire sound
          }
          
          // Drift mechanics
          if (keys.drift && currentVel > 20) {
            if (driftRef.current === 0) {
                // Initiate drift hop
                hopVelocityRef.current = 10;
            }
            driftRef.current += delta;
            currentVel *= 0.99; // drift friction
            
            // Build nitro!
            currentNitro += 15 * delta;
            if (currentNitro > 100) currentNitro = 100;
            
            // Continuous Drift sparks!
            hitWallTimerRef.current = 0.1; // reuse spark system for drift
          } else {
            if (driftRef.current > 0.5) {
                // Apply mini drift boost
                boostRef.current = Math.min(boostRef.current + 0.8, 2);
                currentVel += 20; // sudden jerk
                audioSystem.playBoost();
            }
            driftRef.current = 0;
          }

          // Drafting mechanics (Slipstream)
          let drafting = false;
          const p1x = groupRef.current.position.x;
          const p1z = groupRef.current.position.z;
          for (let i = 0; i < mapData.aiTargetsX.length; i++) {
              const ax = mapData.aiTargetsX[i];
              const az = mapData.aiTargetsZ[i];
              const dx = ax - p1x;
              const dz = az - p1z;
              const distSq = dx*dx + dz*dz;
              // If within drafting range 
              if (distSq < 150 && distSq > 10) {
                  v_direction.set(dx, 0, dz).normalize();
                  const forward = v_reusableVec1.set(0, 0, 1).applyEuler(groupRef.current.rotation).normalize();
                  if (forward.dot(v_direction) > 0.92) { 
                      drafting = true;
                      break;
                  }
              }
          }
          
          if (drafting && currentVel > 30) {
              draftTimerRef.current += delta;
              hitWallTimerRef.current = 0.1; // reuse spark visual for drafting
              if (draftTimerRef.current > 1.5) {
                  audioSystem.playBoost();
                  boostRef.current = Math.max(boostRef.current, 2.0);
                  currentVel += 30; // SLIPSTREAM BOOST
                  draftTimerRef.current = 0;
              }
          } else {
              draftTimerRef.current = 0;
          }
      }
      
      // Sync nitro back to store without causing re-render loops
      if (Math.abs(useStore.getState().nitro - currentNitro) > 1) {
          useStore.getState().setNitro(currentNitro);
      }
    } else {
      currentVel *= 0.95; // Auto-brake
    }

    const currentMaxSpeed = MAX_SPEED + (boostRef.current > 0 ? 35 : 0);
    currentVel = THREE.MathUtils.clamp(currentVel, -MAX_SPEED * 0.3, currentMaxSpeed);

    // Steering
    const speedFactor = Math.min(Math.abs(currentVel) / (MAX_SPEED * 0.4), 1);
    const weatherTurnMult = weather === 'snow' ? 0.7 : weather === 'rain' ? 0.85 : 1.0;
    const driftMultiplier = keys.drift ? 1.5 : 1.0; 
    
    let rotChange = 0;
    if (gameState === 'PLAYING') {
      if (keys.left) {
        rotChange = TURN_SPEED * driftMultiplier * speedFactor * weatherTurnMult * delta;
      } else if (keys.right) {
        rotChange = -TURN_SPEED * driftMultiplier * speedFactor * weatherTurnMult * delta;
      }
    }

    groupRef.current.rotation.y += rotChange;

    // Move forward
    // If drifting, slightly slide sideways instead of going directly forward.
    // For simplicity, we just use standard forward direction but with visual lean.
    v_direction.set(0, 0, 1).applyEuler(groupRef.current.rotation);
    const newPos = v_newPos.copy(groupRef.current.position).addScaledVector(v_direction, currentVel * delta);

    // Process shooting
    const currentPowerup = useStore.getState().activePowerup;
    if (keys.shoot && !wasShootPressedRef.current && currentPowerup === 'missile') {
        useStore.getState().setActivePowerup(null);
        // spawn projectile slightly ahead
        const projX = newPos.x + v_direction.x * 5;
        const projZ = newPos.z + v_direction.z * 5;
        useStore.getState().addProjectile(projX, projZ, v_direction.x, v_direction.z);
        audioSystem.playBoost(); // re-use sound for fire
    }
    wasShootPressedRef.current = !!keys.shoot;

    // Boost Pad Collision
    if (gameState === 'PLAYING') {
        const p2x = newPos.x;
        const p2z = newPos.z;
        for (let i = 0; i < boostPadsData.length; i++) {
            const pad = boostPadsData[i];
            const dx = pad.position.x - p2x;
            const dz = pad.position.z - p2z;
            if (dx*dx + dz*dz < pad.radiusSq) {
                if (boostRef.current < 0.2) {
                    boostRef.current = 1.5;
                    currentVel = currentMaxSpeed;
                    audioSystem.playBoost();
                }
            }
        }
    }

    // Item Box Collision
    if (gameState === 'PLAYING') {
      const p2x = newPos.x;
      const p2z = newPos.z;
      const storeState = useStore.getState();
      
      for (let i = 0; i < itemBoxesData.length; i++) {
          const box = itemBoxesData[i];
          if (storeState.activeBoxes[box.id] === false) continue; // Skip inactive
          const dx = box.position.x - p2x;
          const dz = box.position.z - p2z;
          if (dx*dx + dz*dz < box.radiusSq) {
              // Hit item box!
              storeState.setItemBoxActive(box.id, false);
              setTimeout(() => {
                 useStore.getState().setItemBoxActive(box.id, true);
              }, 5000); // Respawn after 5 seconds
              
              // Randomly assign powerup
              const rand = Math.random();
              if (rand < 0.33) {
                  storeState.setActivePowerup('hyper-speed');
                  boostRef.current = 4.0;
                  audioSystem.playBoost();
                  setTimeout(() => useStore.getState().setActivePowerup(null), 4000);
              } else if (rand < 0.66) {
                  storeState.setActivePowerup('shield');
                  storeState.setShielded(true);
                  setTimeout(() => {
                     useStore.getState().setActivePowerup(null);
                     useStore.getState().setShielded(false);
                  }, 6000);
              } else {
                  storeState.setActivePowerup('missile');
                  // We hold the missile until we press shoot!
              }
          }
      }
      
      // Nitro Pickups Collision
      for (let i = 0; i < nitroPickupsData.length; i++) {
          const nitroInfo = nitroPickupsData[i];
          if (storeState.activeNitros[nitroInfo.id] === false) continue;
          const dx = nitroInfo.position.x - p2x;
          const dz = nitroInfo.position.z - p2z;
          if (dx*dx + dz*dz < nitroInfo.radiusSq) {
              storeState.setNitroActive(nitroInfo.id, false);
              setTimeout(() => {
                 useStore.getState().setNitroActive(nitroInfo.id, true);
              }, 4000); // Respawn nitro after 4 seconds
              
              // Give 25 nitro gauge right away
              currentNitro = Math.min(100, currentNitro + 25);
              
              // Quick boost
              if (boostRef.current < 1.0) {
                  boostRef.current = 1.0;
                  currentVel += 25; // instant speed pop
                  audioSystem.playBoost();
              }
          }
      }
      
      // Obstacle / Crate Collision
      if (spinOutTimerRef.current <= 0 && !useStore.getState().isShielded) {
          for (let i = 0; i < cratesData.length; i++) {
              const crate = cratesData[i];
              const dx = crate.position.x - p2x;
              const dz = crate.position.z - p2z;
              if (dx*dx + dz*dz < crate.radiusSq + 4) { // slightly larger hit area
                  // CRASH!
                  spinOutTimerRef.current = 1.0; // 1 second spin
                  currentVel = 0; // come to a dead stop
                  boostRef.current = 0;
                  audioSystem.playCrash(groupRef.current.position);
                  lastCrashTimeRef.current = state.clock.elapsedTime;
              }
          }
          
          // Moving Hazards Collision (Rolling Rocks)
          const elapsed = state.clock.elapsedTime;
          for (let i = 0; i < movingHazardsData.length; i++) {
              const hazard = movingHazardsData[i];
              // Recalculate deterministic position
              const offset = Math.sin(elapsed * hazard.speed * 0.1) * hazard.offsetRange;
              const posX = hazard.basePos.x + hazard.right.x * offset;
              const posZ = hazard.basePos.z + hazard.right.z * offset;
              const dx = posX - p2x;
              const dz = posZ - p2z;
              
              if (dx*dx + dz*dz < hazard.radiusSq + 4) { 
                  // CRASH!
                  spinOutTimerRef.current = 1.0; 
                  currentVel = 0; 
                  boostRef.current = 0;
                  audioSystem.playCrash(groupRef.current.position);
                  lastCrashTimeRef.current = state.clock.elapsedTime;
              }
          }
      }

      // Mud Pits (Continuous slow down)
      for (let i = 0; i < mudPitsData.length; i++) {
          const pit = mudPitsData[i];
          const dx = pit.position.x - p2x;
          const dz = pit.position.z - p2z;
          if (dx*dx + dz*dz < pit.radiusSq) {
              if (boostRef.current <= 0.1) {
                  currentVel *= 0.85; // heavy slow down
              }
          }
      }
    }

    // Clamp to track bounds using local search
    const closest = getClosestPointOnPath(pathPoints, newPos, progressIndexRef.current, 30);
    
    // Find absolute 2D distance to center of track
    const trackWidth = 14.5; // Visual wall is at 16
    let hitWall = false;
    if (closest.distance > trackWidth) {
        hitWall = true;
        hitWallTimerRef.current = 0.5; // 0.5 second of sparks
        // Wall collision! Clamp position securely inside.
        // Get direction from track curve to our unconstrained position
        v_curvePoint.set(closest.point.x, newPos.y, closest.point.z);
        v_pushDir.copy(newPos).sub(v_curvePoint).normalize();
        
        // Snap explicitly to the absolute mathematical bound
        newPos.copy(v_curvePoint).add(v_pushDir.multiplyScalar(trackWidth));
        
        // Harsh friction
        currentVel *= 0.6;
        boostRef.current = 0; // kill boost on wall hit
        
        // Play Crash Sound if it's a new hit and moving reasonably fast
        if (state.clock.elapsedTime - lastCrashTimeRef.current > 0.5 && Math.abs(currentVel) > 20) {
            audioSystem.playCrash(groupRef.current.position);
            lastCrashTimeRef.current = state.clock.elapsedTime;
        }

        // Deflect rotation along the track
        const trackT = closest.index / (pathPoints.length - 1);
        const tangent = trackCurve.getTangentAt(trackT);
        const targetAngle = Math.atan2(tangent.x, tangent.z);
        
        let angleDiff = targetAngle - groupRef.current.rotation.y;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        
        if (Math.abs(angleDiff) < Math.PI / 2) {
            groupRef.current.rotation.y += angleDiff * 0.15;
        } else {
            let backDiff = (targetAngle + Math.PI) - groupRef.current.rotation.y;
            while (backDiff > Math.PI) backDiff -= Math.PI * 2;
            while (backDiff < -Math.PI) backDiff += Math.PI * 2;
            groupRef.current.rotation.y += backDiff * 0.15;
        }
    }

    // Sparks effect
    if (hitWallTimerRef.current > 0) {
        hitWallTimerRef.current -= delta;
        if (sparksRef.current) {
            sparksRef.current.position.copy(groupRef.current.position);
            sparksRef.current.visible = true;
        }
    } else {
        if (sparksRef.current) sparksRef.current.visible = false;
    }

    newPos.y = 1.5; // Stay slightly above ground
    groupRef.current.position.copy(newPos);
    velocityRef.current = currentVel;
    
    // Send position to store for minimap and standings
    gameRacers['player'] = {
        progress: lap + progressIndexRef.current / pathPoints.length,
        isPlayer: true
    };

    mapData.playerTargetX = newPos.x;
    mapData.playerTargetZ = newPos.z;

    // Speed UI
    setSpeed(Math.abs(Math.round(currentVel * 2.5)));

    // Track Progress & Anti-Cheat Lap Timer
    if (gameState === 'PLAYING') {
      const curPos = newPos;
      const newIdx = getTrackProgress(pathPoints, curPos, progressIndexRef.current);
      
      const halfTrack = pathPoints.length / 2;
      if (Math.abs(newIdx - halfTrack) < 20) {
        hasPassedHalfwayRef.current = true;
      }

      // Must pass halfway to count lap (prevents reversing through start)
      if (progressIndexRef.current > pathPoints.length * 0.9 && newIdx < pathPoints.length * 0.1 && currentVel > 0 && hasPassedHalfwayRef.current) {
        if (lap + 1 > maxLaps) {
          useStore.getState().setReplayData([...replayFramesRef.current]);
          setGameState('FINISHED');
        } else {
          setLap(lap + 1);
          hasPassedHalfwayRef.current = false;
        }
      }
      progressIndexRef.current = newIdx;
    }

    // Visual Lean
    let leanTarget = 0;
    if (gameState === 'PLAYING') {
        if (keys.left) leanTarget = Math.PI / 12;
        if (keys.right) leanTarget = -Math.PI / 12;
        if (keys.drift) leanTarget *= 1.5; 
    }
    
    meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, leanTarget, 0.1);

    // Hop physics
    if (hopVelocityRef.current !== 0 || hopHeightRef.current > 0) {
        hopVelocityRef.current -= 35 * delta; // gravity
        hopHeightRef.current += hopVelocityRef.current * delta;
        if (hopHeightRef.current <= 0) {
             hopHeightRef.current = 0;
             hopVelocityRef.current = 0;
        }
    }
    meshRef.current.position.y = hopHeightRef.current;

    // Boost scale effect
    if (boostRef.current > 0 || useStore.getState().nitro > 95) {
        meshRef.current.scale.lerp(v_scaleBoost, 0.2);
    } else {
        meshRef.current.scale.lerp(v_scaleNorm, 0.1);
    }

    if (capyRef.current) {
        capyRef.current.position.y = Math.abs(Math.sin(Date.now() * 0.02)) * Math.min((Math.abs(currentVel) / MAX_SPEED), 1) * 0.3;
    }

    if (gameState === 'PLAYING') {
       replayFramesRef.current.push({
          p: { x: newPos.x, y: newPos.y, z: newPos.z },
          r: { x: groupRef.current.rotation.x, y: groupRef.current.rotation.y, z: groupRef.current.rotation.z, order: groupRef.current.rotation.order },
          mr: { x: meshRef.current.rotation.x, y: meshRef.current.rotation.y, z: meshRef.current.rotation.z, order: meshRef.current.rotation.order },
          capyOffsetY: capyRef.current ? capyRef.current.position.y : 0,
          scale: { x: meshRef.current.scale.x, y: meshRef.current.scale.y, z: meshRef.current.scale.z },
          sparks: sparksRef.current ? sparksRef.current.visible : false,
          drift: keys.drift,
          boost: boostRef.current > 0
       });
    }

    // Camera Follow
    const cameraSpeedFactor = Math.min(Math.abs(currentVel) / currentMaxSpeed, 1);
    
    // Dynamic FOV based on speed, boosting, and drifting for cinematic feel
    let targetFov = 65 + cameraSpeedFactor * 5; 
    if (boostRef.current > 0) targetFov += 5;
    if (keys.drift) targetFov += 2;

    if ((state.camera as THREE.PerspectiveCamera).fov) {
        (state.camera as THREE.PerspectiveCamera).fov = THREE.MathUtils.lerp((state.camera as THREE.PerspectiveCamera).fov, targetFov, 0.1);
        (state.camera as THREE.PerspectiveCamera).updateProjectionMatrix();
    }

    // Camera lag effect for speed
    const viewMode = useStore.getState().cameraView;
    
    // Rigid and close third-person view
    let offsetZ = -9.0;
    let offsetY = 3.5;

    if (viewMode === 'first-person') {
        offsetZ = 0.5; // sit right behind/inside the windshield
        offsetY = 1.0; 
    }

    let cameraShakeX = 0;
    let cameraShakeY = 0;
    
    // Extreme shake during boost
    if (boostRef.current > 0) {
      cameraShakeX = (Math.random() - 0.5) * 0.15;
      cameraShakeY = (Math.random() - 0.5) * 0.15;
    } 
    // Mild shake at high speeds
    else if (cameraSpeedFactor > 0.8) {
      cameraShakeX = (Math.random() - 0.5) * 0.05;
      cameraShakeY = (Math.random() - 0.5) * 0.05;
    }
    
    v_camOffset.set(cameraShakeX, offsetY + cameraShakeY, offsetZ).applyEuler(groupRef.current.rotation);
    let cameraTarget = v_cameraTarget.copy(newPos).add(v_camOffset);
    v_lookOffset.set(0, offsetY - 1.5, 0).applyEuler(groupRef.current.rotation).add(v_direction.multiplyScalar(30));
    let lookTarget = v_lookTarget.copy(newPos).add(v_lookOffset);
    
    if (gameState === 'MENU') {
        const time = Date.now() * 0.0005;
        const radius = 15;
        cameraTarget.x = newPos.x + Math.sin(time) * radius;
        cameraTarget.z = newPos.z + Math.cos(time) * radius;
        cameraTarget.y = newPos.y + 5;
        v_lookOffset.set(0, 2, 0);
        lookTarget = v_lookTarget.copy(newPos).add(v_lookOffset);
    } else {
        // Clamp camera to track bounds so it doesn't clip through walls
        const camClosest = getClosestPointOnPath(pathPoints, cameraTarget, progressIndexRef.current, 40);
        
        const CAM_TRACK_WIDTH = 15; 
        if (camClosest.distance > CAM_TRACK_WIDTH && viewMode === 'third-person') {
            v_curvePoint.set(camClosest.point.x, cameraTarget.y, camClosest.point.z);
            v_pushDir.copy(cameraTarget).sub(v_curvePoint);
            v_pushDir.y = 0;
            v_pushDir.normalize();
            cameraTarget.x = v_curvePoint.x + v_pushDir.x * CAM_TRACK_WIDTH;
            cameraTarget.z = v_curvePoint.z + v_pushDir.z * CAM_TRACK_WIDTH;
        }
    }
    
    // Hard-lock standard racing camera setup to prevent rubber-banding and the car shooting forward.
    // Menu remains slow cinematic lerp.
    if (gameState === 'MENU') {
        state.camera.position.lerp(cameraTarget, 0.05);
    } else {
        state.camera.position.lerp(cameraTarget, viewMode === 'first-person' ? 1.0 : 0.95);
    }
    state.camera.lookAt(lookTarget);
    audioSystem.updateListener(state.camera.position, v_reusableVec1.copy(lookTarget).sub(state.camera.position).normalize(), state.camera.up);
    
    // Update engine audio based on speed
    if (gameState === 'PLAYING') {
       audioSystem.updateEngine('player', cameraSpeedFactor, groupRef.current.position);
       audioSystem.setDrifting(driftRef.current > 0);
    } else if (gameState === 'COUNTDOWN') {
       audioSystem.updateEngine('player', keys.forward ? 0.4 + Math.random() * 0.1 : 0.0, groupRef.current.position);
       audioSystem.setDrifting(false);
    }
  });

  const trackType = useStore(state => state.trackType);
  
  let trailColor = kartColor;
  let trailWidth = 2.0;
  let trailLength = 20;

  if (trackType === 'desert') {
      trailColor = '#e3c16f'; // Dust color
      trailWidth = 4.0;
      trailLength = 15;
  } else if (kartType === 'cyber') {
      trailColor = '#FFFFFF';
      trailLength = 40;
  } else if (kartType === 'f1') {
      trailWidth = 3.0;
      trailLength = 15;
  }

  const isShielded = useStore(state => state.isShielded);
  
  const resolvedTrailColor = useMemo(() => new THREE.Color(trailColor), [trailColor]);

  return (
    <>
      <group ref={groupRef}>
        <Trail width={trailWidth} length={trailLength} color={resolvedTrailColor} attenuation={(t) => t * t}>
          <group ref={meshRef} scale={1.5}>
             <KartVisuals capyRef={capyRef} color={kartColor} type={kartType} isBoosting={boostRef.current > 0} />
             {isShielded && (
                <mesh scale={[2.5, 2.5, 2.5]}>
                   <sphereGeometry args={[1, 16, 16]} />
                   <meshStandardMaterial color="#00FFFF" transparent opacity={0.3} wireframe />
                </mesh>
             )}
          </group>
        </Trail>
      </group>
      
      <group ref={sparksRef} visible={false}>
          <Sparkles count={50} scale={5} size={6} speed={0.4} color="#FFaa00" />
      </group>
    </>
  );
}
