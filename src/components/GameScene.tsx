import { useStore, gameRacers } from '../store';
import { useFrame } from '@react-three/fiber';
import { Track } from './Track';
import { Player } from './Player';
import { AI } from './AI';
import { GameEnvironment } from './Environment';
import { EffectComposer, Bloom, Vignette, ToneMapping, ChromaticAberration } from '@react-three/postprocessing';
import { useRef } from 'react';
import * as THREE from 'three';

function ProjectilesRenderer() {
    const projectiles = useStore(state => state.projectiles);

    return (
        <group>
           {projectiles.map(p => (
              <mesh key={p.id} position={[p.x, 1, p.z]}>
                  <sphereGeometry args={[0.4, 8, 8]} />
                  <meshStandardMaterial color="#00FFFF" emissive="#00FFFF" emissiveIntensity={2} />
                  <pointLight distance={10} intensity={2} color="#00FFFF" />
              </mesh>
           ))}
        </group>
    );
}

function GameLogic() {
  const gameState = useStore(state => state.gameState);

  useFrame((_, delta) => {
    if (useStore.getState().gameState === 'PLAYING') {
      useStore.setState((state) => {
        let playerProgress = 0;
        let pPos = 1;
        // get player progress
        if (gameRacers['player']) {
            playerProgress = gameRacers['player'].progress;
        }
        
        // Count how many AIs are ahead of player
        for (const key in gameRacers) {
           if (key !== 'player' && gameRacers[key].progress > playerProgress) {
               pPos++;
           }
        }
        
        // Cleanup out of bounds projectiles (just random large bounds for now)
        const updatedProjectiles = state.projectiles.filter(p => Math.abs(p.x) < 2000 && Math.abs(p.z) < 2000);
        
        // Move projectiles
        const speed = 100 * delta;
        const movedProjectiles = updatedProjectiles.map(p => ({
          ...p,
          x: p.x + p.dirX * speed,
          z: p.z + p.dirZ * speed,
        }));
        
        return {
           time: state.time + delta,
           position: pPos,
           projectiles: movedProjectiles
        };
      });
    }
  });

  return null;
}

// Use constant values to avoid expensive re-renders that break EffectComposer
const CHROMATIC_OFFSET = new THREE.Vector2(0.001, 0.001);
const DOF_TARGET = new THREE.Vector3(0, 0, 10);

const c_nightBgColor = new THREE.Color('#000000');
const c_dayBgNeon = new THREE.Color('#050510');
const c_dayBgDesert = new THREE.Color('#FF9933');
const c_dayBgJungle = new THREE.Color('#A5D6A7');
const c_dayBgIcy = new THREE.Color('#E1F5FE');
const c_dayBgSpace = new THREE.Color('#000000');
const c_targetColor = new THREE.Color();

function DynamicEnvironmentEffects() {
  const trackType = useStore(state => state.trackType);
  
  useFrame((state) => {
    // 1 minute per cycle, matching GameEnvironment
    const timeSpeed = 0.05; 
    const timeOfDay = state.clock.elapsedTime * timeSpeed;
    const sunTheta = timeOfDay % (Math.PI * 2);
    
    const heightRatio = Math.max(0, Math.sin(sunTheta));
    const isNight = heightRatio === 0;

    let dayBgColor = c_dayBgSpace;
    if (trackType === 'neon_city') dayBgColor = c_dayBgNeon;
    else if (trackType === 'desert') dayBgColor = c_dayBgDesert;
    else if (trackType === 'jungle') dayBgColor = c_dayBgJungle;
    else if (trackType === 'icy_mountain') dayBgColor = c_dayBgIcy;
    
    if (isNight) {
        c_targetColor.copy(c_nightBgColor);
    } else {
        c_targetColor.copy(dayBgColor).lerp(c_nightBgColor, 1 - heightRatio);
    }

    state.scene.background = c_targetColor;
    if (state.scene.fog && state.scene.fog instanceof THREE.Fog) {
       state.scene.fog.color.copy(c_targetColor);
    }
  });
  
  return null;
}

export function GameScene() {
  const gameState = useStore(state => state.gameState);
  const trackType = useStore(state => state.trackType);

  const fogFar = trackType === 'space' ? 1000 : 300;

  return (
    <>
      <color attach="background" args={['#000000']} />
      <fog attach="fog" args={['#000000', 30, fogFar]} />
      <DynamicEnvironmentEffects />
      
      {/* Shadows handled by native Three.js */}

      <GameEnvironment />
      <GameLogic />
      <ProjectilesRenderer />
      
      {/* Sparkles removed for performance */}
      
      <Track />
      <Player />
      <AI index={0} offset={0.2} color="#FF3366" speedOffset={0.92} />
      <AI index={1} offset={0.8} color="#00FFFF" speedOffset={1.03} />
      <AI index={2} offset={0.5} color="#FFD700" speedOffset={1.0} />
      <AI index={3} offset={0.35} color="#9933FF" speedOffset={0.97} />
      <AI index={4} offset={0.05} color="#00FF66" speedOffset={0.99} />

      {/* Lightweight Post-Processing */}
      <EffectComposer>
        <Bloom luminanceThreshold={0.5} mipmapBlur intensity={1.0} />
        <ChromaticAberration offset={CHROMATIC_OFFSET} />
        <Vignette eskil={false} offset={0.1} darkness={1.1} />
        <ToneMapping />
      </EffectComposer>
    </>
  );
}
