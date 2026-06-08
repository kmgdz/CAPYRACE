import * as THREE from 'three';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

import { KartType } from '../store';

interface KartVisualsProps {
  color?: string;
  capyRef: React.RefObject<THREE.Group>;
  type?: KartType;
  isBoosting?: boolean;
}

export function KartVisuals({ color = "#FF3300", capyRef, type = 'classic', isBoosting = false }: KartVisualsProps) {
  // Common wheel material
  const tireMaterial = <meshStandardMaterial color="#111" roughness={0.9} />;
  const rimMaterial = <meshStandardMaterial color="#EEE" roughness={0.4} />;
  const neonMaterial = <meshPhysicalMaterial color={color} emissive={color} emissiveIntensity={2.0} roughness={0.2} metalness={0.8} />;
  const carPaint = <meshPhysicalMaterial color={color} roughness={0.2} metalness={0.3} clearcoat={1.0} />;

  const exhaustRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
      if (exhaustRef.current) {
          const t = state.clock.elapsedTime;
          // Flickering flames
          exhaustRef.current.scale.set(
              1 + Math.sin(t * 50) * 0.2,
              1 + Math.cos(t * 60) * 0.2,
              isBoosting ? 2.0 + Math.sin(t * 80) * 0.5 : 1.0 + Math.sin(t * 40) * 0.2
          );
          exhaustRef.current.visible = isBoosting || Math.random() > 0.5;
      }
  });

  return (
    <group>
      {type === 'classic' && (
      <group>
        {/* Chassis base */}
        <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.2, 0.15, 3.8]} />
          <meshStandardMaterial color="#333" roughness={0.8} />
        </mesh>

        {/* Front Nose */}
        <mesh position={[0, 0.55, 1.5]} castShadow>
          <boxGeometry args={[0.8, 0.3, 1.2]} />
          {carPaint}
        </mesh>

        {/* Front Bumper */}
        <mesh position={[0, 0.45, 2.2]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.15, 0.15, 1.8, 16]} />
          {tireMaterial}
        </mesh>
        
        <mesh position={[0.5, 0.45, 2.0]} castShadow>
          <boxGeometry args={[0.1, 0.1, 0.4]} />
          {tireMaterial}
        </mesh>
        <mesh position={[-0.5, 0.45, 2.0]} castShadow>
          <boxGeometry args={[0.1, 0.1, 0.4]} />
          {tireMaterial}
        </mesh>

        {/* Side Pods */}
        <mesh position={[0.8, 0.55, 0]} castShadow>
          <boxGeometry args={[0.5, 0.4, 2.2]} />
          {carPaint}
        </mesh>
        <mesh position={[-0.8, 0.55, 0]} castShadow>
          <boxGeometry args={[0.5, 0.4, 2.2]} />
          {carPaint}
        </mesh>

        {/* Back Engine / Bumper */}
        <mesh position={[0, 0.6, -1.6]} castShadow>
          <boxGeometry args={[1.4, 0.6, 0.8]} />
          <meshStandardMaterial color="#222" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.7, -2.1]} castShadow>
          <boxGeometry args={[1.6, 0.2, 0.4]} />
          {carPaint}
        </mesh>
      </group>
      )}

      {type === 'f1' && (
      <group>
        {/* F1 Chassis base (long, narrow) */}
        <mesh position={[0, 0.35, 0.2]} castShadow receiveShadow>
          <boxGeometry args={[0.7, 0.2, 4.2]} />
          {carPaint}
        </mesh>

        {/* F1 Nose (sloping down) */}
        <mesh position={[0, 0.3, 1.8]} rotation={[0.1, 0, 0]} castShadow>
          <boxGeometry args={[0.4, 0.15, 1.2]} />
          {carPaint}
        </mesh>

        {/* F1 Front Wing */}
        <mesh position={[0, 0.2, 2.4]} castShadow>
          <boxGeometry args={[2.0, 0.05, 0.4]} />
          <meshStandardMaterial color="#222" roughness={0.8} />
        </mesh>

        {/* F1 Side Pods */}
        <mesh position={[0.6, 0.4, 0]} castShadow>
          <boxGeometry args={[0.5, 0.4, 1.8]} />
          {carPaint}
        </mesh>
        <mesh position={[-0.6, 0.4, 0]} castShadow>
          <boxGeometry args={[0.5, 0.4, 1.8]} />
          {carPaint}
        </mesh>
        
        {/* Air intake above driver */}
        <mesh position={[0, 0.8, -0.6]} rotation={[-0.2, 0, 0]} castShadow>
          <boxGeometry args={[0.3, 0.4, 0.8]} />
          {carPaint}
        </mesh>

        {/* F1 Rear Wing */}
        <mesh position={[0, 0.8, -1.8]} castShadow>
          <boxGeometry args={[1.8, 0.05, 0.5]} />
          {carPaint}
        </mesh>
        {/* Rear Wing struts */}
        <mesh position={[0.4, 0.5, -1.8]} castShadow>
          <boxGeometry args={[0.05, 0.6, 0.3]} />
          <meshStandardMaterial color="#222" roughness={0.8} />
        </mesh>
        <mesh position={[-0.4, 0.5, -1.8]} castShadow>
          <boxGeometry args={[0.05, 0.6, 0.3]} />
          <meshStandardMaterial color="#222" roughness={0.8} />
        </mesh>
      </group>
      )}

      {type === 'cyber' && (
      <group>
        {/* Cyber Wedge Body */}
        <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.4, 0.3, 4.0]} />
          <meshStandardMaterial color="#111" roughness={0.4} metalness={0.9} />
        </mesh>

        {/* Cyber Cockpit canopy */}
        <mesh position={[0, 0.75, -0.2]} rotation={[0.1, 0, 0]} castShadow>
          <boxGeometry args={[0.9, 0.4, 1.8]} />
          <meshPhysicalMaterial color="#000" roughness={0.1} metalness={0.9} clearcoat={1.0} opacity={0.8} transparent />
        </mesh>

        {/* Neon Accents Sides */}
        <mesh position={[0.72, 0.45, 0]}>
          <boxGeometry args={[0.05, 0.05, 3.8]} />
          {neonMaterial}
        </mesh>
        <mesh position={[-0.72, 0.45, 0]}>
          <boxGeometry args={[0.05, 0.05, 3.8]} />
          {neonMaterial}
        </mesh>

        {/* Front Grill (Glowing) */}
        <mesh position={[0, 0.4, 2.01]}>
          <boxGeometry args={[1.0, 0.1, 0.05]} />
          {neonMaterial}
        </mesh>
        
        {/* Hover thrusters instead of rear bumper */}
        <mesh position={[0.5, 0.4, -2.0]} rotation={[Math.PI/2, 0, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 0.2]} />
          {neonMaterial}
        </mesh>
        <mesh position={[-0.5, 0.4, -2.0]} rotation={[Math.PI/2, 0, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 0.2]} />
          {neonMaterial}
        </mesh>
      </group>
      )}

      {/* Steering Wheel */}
      <group position={[0, 0.9, 0.7]} rotation={[-Math.PI / 4, 0, 0]}>
        <mesh castShadow>
          <torusGeometry args={[0.25, 0.05, 8, 24]} />
          <meshStandardMaterial color="#111" roughness={0.9} />
        </mesh>
        <mesh position={[0, -0.4, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.8]} />
          <meshStandardMaterial color="#111" />
        </mesh>
      </group>

      {type !== 'cyber' && (
      <group>
        {/* Wheels */}
        {/* Front Left */}
        <group position={[-1.0, 0.4, 1.6]} rotation={[0, 0, Math.PI / 2]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.4, 0.4, 0.35, 24]} />
            <meshStandardMaterial color="#111" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.18, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 0.05, 16]} />
            <meshStandardMaterial color="#EEE" roughness={0.4} />
          </mesh>
        </group>
        {/* Front Right */}
        <group position={[1.0, 0.4, 1.6]} rotation={[0, 0, -Math.PI / 2]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.4, 0.4, 0.35, 24]} />
            <meshStandardMaterial color="#111" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.18, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 0.05, 16]} />
            <meshStandardMaterial color="#EEE" roughness={0.4} />
          </mesh>
        </group>
        {/* Back Left */}
        <group position={[-1.0, 0.4, -1.4]} rotation={[0, 0, Math.PI / 2]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.45, 0.45, 0.4, 24]} />
            <meshStandardMaterial color="#111" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.21, 0]}>
            <cylinderGeometry args={[0.25, 0.25, 0.05, 16]} />
            <meshStandardMaterial color="#EEE" roughness={0.4} />
          </mesh>
        </group>
        {/* Back Right */}
        <group position={[1.0, 0.4, -1.4]} rotation={[0, 0, -Math.PI / 2]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.45, 0.45, 0.4, 24]} />
            <meshStandardMaterial color="#111" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.21, 0]}>
            <cylinderGeometry args={[0.25, 0.25, 0.05, 16]} />
            <meshStandardMaterial color="#EEE" roughness={0.4} />
          </mesh>
        </group>
      </group>
      )}

      {type === 'cyber' && (
      <group>
         {/* Hover Discs */}
        <mesh position={[-1.0, 0.1, 1.6]} rotation={[0, 0, 0]}>
          <cylinderGeometry args={[0.4, 0.4, 0.1, 24]} />
          {neonMaterial}
        </mesh>
        <mesh position={[1.0, 0.1, 1.6]} rotation={[0, 0, 0]}>
          <cylinderGeometry args={[0.4, 0.4, 0.1, 24]} />
          {neonMaterial}
        </mesh>
        <mesh position={[-1.0, 0.1, -1.4]} rotation={[0, 0, 0]}>
          <cylinderGeometry args={[0.4, 0.4, 0.1, 24]} />
          {neonMaterial}
        </mesh>
        <mesh position={[1.0, 0.1, -1.4]} rotation={[0, 0, 0]}>
          <cylinderGeometry args={[0.4, 0.4, 0.1, 24]} />
          {neonMaterial}
        </mesh>
      </group>
      )}

      {/* Capybara */}
      {type !== 'cyber' && (
      <group ref={capyRef} position={type === 'f1' ? [0, 0.3, 0] : [0, 0.7, -0.2]}>
        {/* Body */}
        <mesh position={[0, 0.5, -0.2]} rotation={[-0.2, 0, 0]} castShadow>
          <capsuleGeometry args={[0.5, 0.7, 16, 16]} />
          <meshStandardMaterial color="#C18A5D" roughness={0.8} />
        </mesh>

        {/* Belly (lighter) */}
        <mesh position={[0, 0.45, 0.1]} rotation={[-0.2, 0, 0]} castShadow>
          <capsuleGeometry args={[0.45, 0.6, 16, 16]} />
          <meshStandardMaterial color="#D19A6D" roughness={0.9} />
        </mesh>

        {/* Head */}
        <group position={[0, 1.3, 0.3]}>
          <mesh castShadow>
            <sphereGeometry args={[0.4, 16, 16]} />
            <meshStandardMaterial color="#A67B5B" roughness={0.8} />
          </mesh>
          {/* Snout */}
          <mesh position={[0, -0.05, 0.3]} castShadow>
            <boxGeometry args={[0.4, 0.3, 0.4]} />
            <meshStandardMaterial color="#8B5A2B" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.1, 0.48]} castShadow>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshStandardMaterial color="#222" roughness={0.6} />
          </mesh>
          {/* Eyes */}
          <mesh position={[0.2, 0.1, 0.3]} castShadow>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshStandardMaterial color="#000" />
          </mesh>
          <mesh position={[-0.2, 0.1, 0.3]} castShadow>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshStandardMaterial color="#000" />
          </mesh>
          {/* Ears */}
          <mesh position={[0.3, 0.25, -0.1]} rotation={[0, 0, -0.2]} castShadow>
            <capsuleGeometry args={[0.08, 0.15, 8, 8]} />
            <meshStandardMaterial color="#5C3A21" />
          </mesh>
          <mesh position={[-0.3, 0.25, -0.1]} rotation={[0, 0, 0.2]} castShadow>
            <capsuleGeometry args={[0.08, 0.15, 8, 8]} />
            <meshStandardMaterial color="#5C3A21" />
          </mesh>
        </group>

        {/* Arms holding steering wheel */}
        <mesh position={[0.35, 0.7, 0.4]} rotation={[-Math.PI / 4, -0.2, 0]} castShadow>
          <capsuleGeometry args={[0.12, 0.6, 8, 8]} />
          <meshStandardMaterial color="#A67B5B" />
        </mesh>
        <mesh position={[-0.35, 0.7, 0.4]} rotation={[-Math.PI / 4, 0.2, 0]} castShadow>
          <capsuleGeometry args={[0.12, 0.6, 8, 8]} />
          <meshStandardMaterial color="#A67B5B" />
        </mesh>
      </group>
      )}

      {/* Headlights (Always visible during race) */}
      <pointLight 
        position={[0.8, 0.6, 2.5]} 
        intensity={1.5} 
        distance={2} 
        color="#FFF"
      />
      <pointLight 
        position={[-0.8, 0.6, 2.5]} 
        intensity={1.5} 
        distance={2} 
        color="#FFF"
      />
      <pointLight 
        position={[0, 1.0, 3.5]} 
        intensity={3.0} 
        distance={25} 
        color="#FFF"
      />

      {/* Exhaust Flames */}
      <group ref={exhaustRef} position={[0, type === 'f1' ? 0.3 : 0.4, type === 'f1' ? -2.0 : -2.4]} rotation={[-Math.PI/2, 0, 0]}>
         <mesh position={[0.4, 0, 0]} scale={[1, 1, 1.5]}>
             <cylinderGeometry args={[0, 0.15, 0.6, 8]} />
             <meshBasicMaterial color="#00DDFF" transparent opacity={0.8} />
         </mesh>
         <mesh position={[-0.4, 0, 0]} scale={[1, 1, 1.5]}>
             <cylinderGeometry args={[0, 0.15, 0.6, 8]} />
             <meshBasicMaterial color="#00DDFF" transparent opacity={0.8} />
         </mesh>
      </group>

    </group>
  );
}
