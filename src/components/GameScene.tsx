import { useStore } from '../store';
import { useFrame } from '@react-three/fiber';
import { Track } from './Track';
import { Player } from './Player';
import { AI } from './AI';
import { GameEnvironment } from './Environment';
import { Sparkles } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, ToneMapping, ChromaticAberration, N8AO, Noise, DepthOfField } from '@react-three/postprocessing';
import { useRef } from 'react';
import * as THREE from 'three';

function GameLogic() {
  const gameState = useStore(state => state.gameState);

  useFrame((_, delta) => {
    if (gameState === 'PLAYING') {
      useStore.setState((state) => {
        const sortedRacers = Object.values(state.racers).sort((a, b) => b.progress - a.progress);
        const playerPos = sortedRacers.findIndex(r => r.isPlayer) + 1;
        return { 
           time: state.time + delta,
           position: playerPos > 0 ? playerPos : state.position 
        };
      });
    }
  });

  return null;
}

// Use constant values to avoid expensive re-renders that break EffectComposer
const CHROMATIC_OFFSET = new THREE.Vector2(0.001, 0.001);
const DOF_TARGET = new THREE.Vector3(0, 0, 10);

function DynamicEnvironmentEffects() {
  const trackType = useStore(state => state.trackType);
  
  useFrame((state) => {
    // 1 minute per cycle, matching GameEnvironment
    const timeSpeed = 0.05; 
    const timeOfDay = state.clock.elapsedTime * timeSpeed;
    const sunTheta = timeOfDay % (Math.PI * 2);
    
    const heightRatio = Math.max(0, Math.sin(sunTheta));
    const isNight = heightRatio === 0;

    let dayBgColor = new THREE.Color(
      trackType === 'neon_city' ? '#050510' : 
      trackType === 'desert' ? '#FF9933' : 
      trackType === 'jungle' ? '#A5D6A7' : 
      trackType === 'icy_mountain' ? '#E1F5FE' : 
      '#000000'
    );
    const nightBgColor = new THREE.Color('#000000');
    
    const targetColor = isNight ? nightBgColor : dayBgColor.clone().lerp(nightBgColor, 1 - heightRatio);

    state.scene.background = targetColor;
    if (state.scene.fog && state.scene.fog instanceof THREE.Fog) {
       state.scene.fog.color.copy(targetColor);
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
      
      {/* High-speed sparkle wind effect */}
      <Sparkles count={800} scale={300} size={15} speed={1.5} opacity={0.3} color="#ffffff" />
      
      <Track />
      <Player />
      <AI index={0} offset={0.2} color="#FF3366" speedOffset={0.92} />
      <AI index={1} offset={0.8} color="#00FFFF" speedOffset={1.03} />
      <AI index={2} offset={0.5} color="#FFD700" speedOffset={1.0} />
      <AI index={3} offset={0.35} color="#9933FF" speedOffset={0.97} />
      <AI index={4} offset={0.05} color="#00FF66" speedOffset={0.99} />

      {/* High Quality Post-Processing */}
      <EffectComposer>
        <N8AO aoRadius={2} intensity={2} halfRes={true} color="black" />
        <Bloom luminanceThreshold={0.5} mipmapBlur intensity={1.5} />
        <ChromaticAberration offset={CHROMATIC_OFFSET} />
        <DepthOfField target={DOF_TARGET} focalLength={0.02} bokehScale={2} height={480} />
        <Noise opacity={0.025} />
        <Vignette eskil={false} offset={0.1} darkness={1.1} />
        <ToneMapping />
      </EffectComposer>
    </>
  );
}
