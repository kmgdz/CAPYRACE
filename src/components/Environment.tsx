import { Sky, Environment, ContactShadows } from '@react-three/drei';
import { useStore } from '../store';
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function WeatherParticles() {
  const weather = useStore(state => state.weather);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  
  const count = 15000;
  const areaSize = 300;
  const areaHeight = 150;

  const { dummy, velocities, particlesData } = useMemo(() => {
    const dummy = new THREE.Object3D();
    const velocities = new Float32Array(count);
    const particlesData = [];
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * areaSize;
      const y = Math.random() * areaHeight;
      const z = (Math.random() - 0.5) * areaSize;
      velocities[i] = Math.random() * 0.5 + 0.5; // base speed
      particlesData.push({ x, y, z });
    }
    return { dummy, velocities, particlesData };
  }, [count, areaSize, areaHeight]);

  useFrame((state, delta) => {
    if (!meshRef.current || weather === 'clear') return;
    
    const speedMult = weather === 'rain' ? 80 : 15; // Rain is fast, snow is slow

    for (let i = 0; i < count; i++) {
        let { x, y, z } = particlesData[i];
        
        // update Y pos
        y -= velocities[i] * speedMult * delta;
        if (y < 0) {
            y = areaHeight;
            x = (Math.random() - 0.5) * areaSize;
            z = (Math.random() - 0.5) * areaSize;
        }

        // Slight wind
        x += (weather === 'snow' ? Math.sin(state.clock.elapsedTime + i) * 2 : 1) * delta;
        
        particlesData[i] = { x, y, z };
        
        dummy.position.set(x, y, z);
        if (weather === 'rain') {
            dummy.scale.set(0.2, 3, 0.2); // long drops
        } else {
            dummy.scale.set(1, 1, 1); // snowflakes
        }
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  if (weather === 'clear') return null;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[0.2, 4, 4]} />
      <meshBasicMaterial color={weather === 'rain' ? "#88ccff" : "#ffffff"} transparent opacity={0.6} />
    </instancedMesh>
  );
}

const c_sunriseColor = new THREE.Color('#FF8C00');
const c_noonColor = new THREE.Color('#FFFFFF');
const c_nightColor = new THREE.Color('#222244');
const c_targetDirColor = new THREE.Color();
const c_dayAmbientNeon = new THREE.Color('#4466ff');
const c_dayAmbientDesert = new THREE.Color('#FFE4B5');
const c_dayAmbientNormal = new THREE.Color('#ffffff');
const c_nightAmbientSpace = new THREE.Color('#ffffff');
const c_nightAmbientNormal = new THREE.Color('#111122');
const c_targetAmbientColor = new THREE.Color();

export function GameEnvironment() {
  const trackType = useStore(state => state.trackType);
  const gameState = useStore(state => state.gameState);

  const dirLightRef = useRef<THREE.DirectionalLight>(null);
  const ambientLightRef = useRef<THREE.AmbientLight>(null);
  
  // Sky uniforms
  const sunPosition = useRef(new THREE.Vector3(100, 20, 100));

  useFrame((state) => {
    // 1 minute per cycle
    const timeSpeed = 0.05; 
    
    // We can use the clock to cycle time of day constantly
    const timeOfDay = state.clock.elapsedTime * timeSpeed;
    
    // Cycle between 0 and PI
    const sunTheta = timeOfDay % (Math.PI * 2);
    
    // Update Sun Position
    sunPosition.current.x = Math.cos(sunTheta) * 200;
    sunPosition.current.y = Math.sin(sunTheta) * 200;
    sunPosition.current.z = Math.cos(sunTheta) * 100;

    // Calculate light colors based on sun height
    const heightRatio = Math.max(0, Math.sin(sunTheta)); // 0 = night, 1 = noon
    const isNight = heightRatio === 0;
    
    if (dirLightRef.current) {
        dirLightRef.current.position.copy(sunPosition.current);
        
        // Intensity fades at sunset/night
        const targetDirIntensity = isNight ? 0.1 : heightRatio * 1.5 + 0.3;
        dirLightRef.current.intensity = THREE.MathUtils.lerp(dirLightRef.current.intensity, targetDirIntensity, 0.1);
        
        // Color shifts to warm at sunset
        if (isNight) {
            c_targetDirColor.copy(c_nightColor);
        } else if (heightRatio < 0.3) {
            c_targetDirColor.copy(c_sunriseColor).lerp(c_noonColor, heightRatio / 0.3);
        } else {
            c_targetDirColor.copy(c_noonColor);
        }
        
        dirLightRef.current.color.lerp(c_targetDirColor, 0.1);
    }

    if (ambientLightRef.current) {
        const targetAmbIntensity = isNight ? 0.2 : heightRatio * 0.4 + 0.2;
        ambientLightRef.current.intensity = THREE.MathUtils.lerp(ambientLightRef.current.intensity, targetAmbIntensity, 0.1);
        
        const dayAmbient = trackType === 'neon_city' ? c_dayAmbientNeon : (trackType === 'desert' ? c_dayAmbientDesert : c_dayAmbientNormal);
        const nightAmbient = trackType === 'space' ? c_nightAmbientSpace : c_nightAmbientNormal;
        
        c_targetAmbientColor.copy(isNight ? nightAmbient : dayAmbient);
        ambientLightRef.current.color.lerp(c_targetAmbientColor, 0.1);
    }
  });

  return (
    <group>
      <WeatherParticles />
      {trackType === 'neon_city' && (
        <>
          <ambientLight ref={ambientLightRef} intensity={0.6} color="#4466ff" />
          <directionalLight 
            ref={dirLightRef}
            position={[100, 200, 50]} 
            intensity={0.8} 
            color="#8888ff"
            castShadow 
            shadow-bias={-0.0001}
            shadow-mapSize={[4096, 4096]} 
            shadow-camera-left={-300}
            shadow-camera-right={300}
            shadow-camera-top={300}
            shadow-camera-bottom={-300}
            shadow-camera-near={1}
            shadow-camera-far={1000}
          />
          <Environment preset="city" background={false} />
          <Sky 
            distance={450000} 
            sunPosition={sunPosition.current} 
            inclination={0.6} 
            azimuth={0.25} 
            rayleigh={0.1} 
            turbidity={0.1} 
            mieCoefficient={0.005} 
            mieDirectionalG={0.8} 
          />
        </>
      )}

      {trackType === 'desert' && (
        <>
          <ambientLight ref={ambientLightRef} intensity={0.6} color="#FFE4B5" />
          <directionalLight 
            ref={dirLightRef}
            position={[100, 200, 50]} 
            intensity={1.8} 
            color="#FFFFFF"
            castShadow 
            shadow-bias={-0.0001}
            shadow-mapSize={[4096, 4096]} 
            shadow-camera-left={-300}
            shadow-camera-right={300}
            shadow-camera-top={300}
            shadow-camera-bottom={-300}
            shadow-camera-near={1}
            shadow-camera-far={1000}
          />
          <Environment preset="sunset" background={false} />
          <Sky 
            distance={450000} 
            sunPosition={sunPosition.current} 
            inclination={0.49} 
            azimuth={0.25} 
            rayleigh={2} 
            turbidity={10} 
            mieCoefficient={0.005} 
            mieDirectionalG={0.8} 
          />
        </>
      )}

      {trackType === 'space' && (
        <>
          <ambientLight ref={ambientLightRef} intensity={0.4} color="#ffffff" />
          <directionalLight 
            ref={dirLightRef}
            position={[0, 200, 0]} 
            intensity={1.2} 
            color="#aaaaff"
            castShadow 
            shadow-bias={-0.0001}
            shadow-mapSize={[4096, 4096]} 
            shadow-camera-left={-300}
            shadow-camera-right={300}
            shadow-camera-top={300}
            shadow-camera-bottom={-300}
            shadow-camera-near={1}
            shadow-camera-far={1000}
          />
          <Environment preset="night" background={false} />
        </>
      )}

      {trackType === 'jungle' && (
        <>
          <ambientLight ref={ambientLightRef} intensity={0.5} color="#A5D6A7" />
          <directionalLight 
            ref={dirLightRef}
            position={[100, 200, 50]} 
            intensity={1.1} 
            castShadow 
          />
          <Sky 
            distance={450000} 
            sunPosition={sunPosition.current} 
            inclination={0.3} 
            azimuth={0.25} 
            rayleigh={2}
            turbidity={8}
            mieCoefficient={0.005} 
            mieDirectionalG={0.8} 
          />
        </>
      )}

      {trackType === 'icy_mountain' && (
        <>
          <ambientLight ref={ambientLightRef} intensity={0.7} color="#E0F7FA" />
          <directionalLight 
            ref={dirLightRef}
            position={[100, 150, -50]} 
            intensity={1.3} 
            color="#E1F5FE"
            castShadow 
          />
          <Sky 
            distance={450000} 
            sunPosition={sunPosition.current} 
            inclination={0.2} 
            azimuth={0.5} 
            rayleigh={0.5}
            turbidity={1}
            mieCoefficient={0.005} 
            mieDirectionalG={0.6} 
          />
        </>
      )}
    </group>
  );
}
