import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { TRACKS } from '../lib/track';
import { useStore } from '../store';

import asphaltImg from '../assets/images/realistic_asphalt_1780838121528.png';
import buildingImg from '../assets/images/neon_building_facade_1780838140579.png';
import sandImg from '../assets/images/realistic_sand_1780838153538.png';

function ItemBoxes() {
  const trackType = useStore(state => state.trackType);
  const { itemBoxesData } = TRACKS[trackType];
  const activeBoxes = useStore(state => state.activeBoxes);
  
  const meshRef = useRef<THREE.InstancedMesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
        meshRef.current.rotation.y += 0.02;
        meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 3) * 0.5;
    }
  });

  return (
    <group ref={meshRef}>
        {itemBoxesData.map((box, i) => {
            const isActive = activeBoxes[box.id] !== false;
            if (!isActive) return null;
            return (
                <group key={box.id} position={box.position}>
                    <mesh castShadow>
                        <boxGeometry args={[4, 4, 4]} />
                        <meshStandardMaterial color="#FF00FF" emissive="#FF00FF" emissiveIntensity={0.5} transparent opacity={0.6} wireframe />
                    </mesh>
                    <mesh>
                        <boxGeometry args={[3.8, 3.8, 3.8]} />
                        <meshStandardMaterial color="#00FFFF" transparent opacity={0.8} />
                    </mesh>
                </group>
            );
        })}
    </group>
  );
}

function NitroPickups() {
  const trackType = useStore(state => state.trackType);
  const { nitroPickupsData } = TRACKS[trackType];
  const activeNitros = useStore(state => state.activeNitros);
  
  const meshRef = useRef<THREE.InstancedMesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
        meshRef.current.rotation.y += 0.05;
        meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 5) * 0.5 + 0.5;
    }
  });

  return (
    <group ref={meshRef}>
        {nitroPickupsData.map((nitro, i) => {
            const isActive = activeNitros[nitro.id] !== false;
            if (!isActive) return null;
            return (
                <group key={nitro.id} position={nitro.position}>
                    {/* Inner core */}
                    <mesh castShadow>
                        <octahedronGeometry args={[1.5, 0]} />
                        <meshStandardMaterial color="#FFFFAA" emissive="#FFDD00" emissiveIntensity={2.0} />
                    </mesh>
                    {/* Outer glow aura */}
                    <mesh>
                        <octahedronGeometry args={[2.0, 1]} />
                        <meshStandardMaterial color="#FF8800" emissive="#FF5500" emissiveIntensity={1.0} transparent opacity={0.4} wireframe />
                    </mesh>
                </group>
            );
        })}
    </group>
  );
}

function MovingHazards() {
  const trackType = useStore(state => state.trackType);
  const { movingHazardsData } = TRACKS[trackType];
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame(({ clock }) => {
    const elapsed = clock.elapsedTime;
    movingHazardsData.forEach((hazard, i) => {
      const mesh = meshRefs.current[i];
      if (mesh) {
        // Deterministic sidewise movement
        const offset = Math.sin(elapsed * hazard.speed * 0.1) * hazard.offsetRange;
        const pos = hazard.basePos.clone().addScaledVector(hazard.right, offset);
        mesh.position.copy(pos);
        mesh.position.y += hazard.radius;
        // Roll the rock! It moves along 'right' vector so we rotate around tangent
        mesh.rotation.y += 0.05;
        mesh.rotation.x += offset * 0.01;
        mesh.rotation.z -= offset * 0.01;
      }
    });
  });

  return (
    <group>
      {movingHazardsData.map((hazard, i) => (
        <mesh 
          key={hazard.id} 
          ref={(el) => { meshRefs.current[i] = el; }}
          castShadow 
          receiveShadow
        >
          <icosahedronGeometry args={[hazard.radius, 1]} />
          <meshStandardMaterial color="#665544" roughness={0.9} flatShading />
        </mesh>
      ))}
    </group>
  );
}

function MudPits() {
  const trackType = useStore(state => state.trackType);
  const { mudPitsData } = TRACKS[trackType];
  return (
    <group>
      {mudPitsData.map((pit, i) => (
        <mesh key={`pit-${i}`} position={pit.position} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[pit.radius, 16]} />
          <meshStandardMaterial color="#3b2b1b" roughness={1.0} depthWrite={false} polygonOffset={true} polygonOffsetFactor={-1} polygonOffsetUnits={-1} />
        </mesh>
      ))}
    </group>
  );
}

export function Track() {
  const trackType = useStore(state => state.trackType);
  const { trackCurve, pathPoints, boostPadsData, cratesData } = TRACKS[trackType];

  const [asphaltTex, buildingTex, sandTex] = useTexture([asphaltImg, buildingImg, sandImg]);

  useMemo(() => {
    asphaltTex.wrapS = asphaltTex.wrapT = THREE.RepeatWrapping;
    asphaltTex.repeat.set(1, 100);
    
    buildingTex.wrapS = buildingTex.wrapT = THREE.RepeatWrapping;
    buildingTex.repeat.set(1, 1);
    
    sandTex.wrapS = sandTex.wrapT = THREE.RepeatWrapping;
    sandTex.repeat.set(100, 100);
  }, [asphaltTex, buildingTex, sandTex]);

  const createTrackMesh = (shapePts: number[][], repeatV = 100) => {
    const pts = trackCurve.getSpacedPoints(600);
    const vertices = [];
    const indices = [];
    const uvs = [];
    const numShapePts = shapePts.length;

    for (let i = 0; i < pts.length; i++) {
        const pt = pts[i];
        // handle wrap around for tangent exactly like getTangent so it loops seamlessly
        // but with CatmullRom, trackCurve.getTangentAt is fine
        const tangent = trackCurve.getTangentAt(i / (pts.length - 1)).normalize();
        const up = new THREE.Vector3(0, 1, 0);
        const right = new THREE.Vector3().crossVectors(tangent, up).normalize();
        
        const v = (i / (pts.length - 1)) * repeatV;

        for (let j = 0; j < numShapePts; j++) {
            const [offsetX, offsetY] = shapePts[j];
            const p = pt.clone().addScaledVector(right, offsetX);
            p.y += offsetY;
            vertices.push(p.x, p.y, p.z);
            
            const u = numShapePts > 1 ? j / (numShapePts - 1) : 0;
            uvs.push(u, v);
        }
    }

    for (let i = 0; i < pts.length; i++) {
        // Because the curve is closed, segment `pts.length - 1` connects back to `0`
        const nextI = (i + 1) % pts.length;
        
        for (let s = 0; s < numShapePts - 1; s++) {
            // Note: right hand rule might be flipped depending on shapePts direction.
            // We use DoubleSide material for road sometimes, or we ensure shape is clockwise/ccw.
            const bl = i * numShapePts + s;
            const br = nextI * numShapePts + s;
            const tl = i * numShapePts + (s + 1);
            const tr = nextI * numShapePts + (s + 1);

            indices.push(bl, br, tl);
            indices.push(br, tr, tl);
        }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom;
  };

  const roadGeometry = useMemo(() => {
    return createTrackMesh([
        [16, 0],
        [-16, 0]
    ]);
  }, []);

  const wallLeftGeometry = useMemo(() => {
    return createTrackMesh([
       [-16, 0],
       [-16, 2.5],
       [-17, 2.5],
       [-17, 0]
    ]);
  }, []);

  const wallRightGeometry = useMemo(() => {
    return createTrackMesh([
       [17, 0],
       [17, 2.5],
       [16, 2.5],
       [16, 0]
    ]);
  }, []);

  const dashes = useMemo(() => {
    const d = [];
    const numDashes = 150;
    for (let i = 0; i < numDashes; i++) {
        const t = i / numDashes;
        const p = trackCurve.getPointAt(t);
        const tangent = trackCurve.getTangentAt(t).normalize();
        const rotY = Math.atan2(tangent.x, tangent.z);
        d.push({ position: [p.x, p.y + 0.02, p.z] as [number, number, number], rotY });
    }
    return d;
  }, []);

  const kerbs = useMemo(() => {
    const k = [];
    const numKerbs = 400; // Track is long, need enough to alternate
    for (let i = 0; i < numKerbs; i++) {
        const t = i / numKerbs;
        const p = trackCurve.getPointAt(t);
        const tangent = trackCurve.getTangentAt(t).normalize();
        const rotY = Math.atan2(tangent.x, tangent.z);
        const up = new THREE.Vector3(0, 1, 0);
        const right = new THREE.Vector3().crossVectors(tangent, up).normalize();
        
        const color = (i % 2 === 0) ? '#FFFFFF' : '#FF1100';
        
        // Place just inside the walls
        const leftPos = p.clone().addScaledVector(right, -15);
        const rightPos = p.clone().addScaledVector(right, 15);

        k.push({ pos: [leftPos.x, leftPos.y + 0.02, leftPos.z] as [number, number, number], rotY, color });
        k.push({ pos: [rightPos.x, rightPos.y + 0.02, rightPos.z] as [number, number, number], rotY, color });
    }
    return k;
  }, []);

  const roadMaterials = useMemo(() => {
    return {
      neon_city: new THREE.MeshStandardMaterial({ map: asphaltTex, color: '#333333', roughness: 0.15, metalness: 0.8, envMapIntensity: 2, side: THREE.DoubleSide }),
      desert: new THREE.MeshStandardMaterial({ map: asphaltTex, color: '#554433', roughness: 0.8, metalness: 0.1, envMapIntensity: 1, side: THREE.DoubleSide }),
      space: new THREE.MeshStandardMaterial({ map: asphaltTex, color: '#222233', roughness: 0.2, metalness: 0.9, envMapIntensity: 2, side: THREE.DoubleSide })
    };
  }, [asphaltTex]);

  const wallMaterials = useMemo(() => {
    return {
      neon_city: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.2, metalness: 0.6, envMapIntensity: 1.5, side: THREE.DoubleSide }),
      desert: new THREE.MeshStandardMaterial({ color: '#c2b280', roughness: 0.9, metalness: 0.0, side: THREE.DoubleSide }),
      space: new THREE.MeshStandardMaterial({ color: '#222244', roughness: 0.1, metalness: 0.9, emissive: '#111133', envMapIntensity: 2, side: THREE.DoubleSide })
    };
  }, []);

  const wallWarningMaterials = useMemo(() => {
    return {
      neon_city: new THREE.MeshStandardMaterial({ color: '#ff3300', roughness: 0.3, metalness: 0.2, side: THREE.DoubleSide }),
      desert: new THREE.MeshStandardMaterial({ color: '#ff8800', roughness: 0.9, metalness: 0.0, side: THREE.DoubleSide }),
      space: new THREE.MeshStandardMaterial({ color: '#00ffff', roughness: 0.1, metalness: 0.9, emissive: '#004444', side: THREE.DoubleSide })
    };
  }, []);

  const roadMaterial = roadMaterials[trackType];
  const wallMaterial = wallMaterials[trackType];
  const wallWarningMaterial = wallWarningMaterials[trackType];

  // Generate some high-quality futuristic decorations along the path
  const decorations = useMemo(() => {
    const items = [];
    for (let i = 0; i < pathPoints.length; i += 2) { 
      const t = i / (pathPoints.length - 1);
      const p = pathPoints[i];
      const tangent = trackCurve.getTangentAt(Math.min(t, 1));
      const up = new THREE.Vector3(0, 1, 0);
      const right = new THREE.Vector3().crossVectors(tangent, up).normalize();
      
      const rotY = Math.atan2(tangent.x, tangent.z);

      // Add a streetlamp every few points, alternating sides
      if (trackType === 'neon_city' && i % 6 === 0) {
        const isLeft = i % 12 === 0;
        const offset = isLeft ? -18 : 18;
        const lampPos = p.clone().addScaledVector(right, offset);
        items.push({
          pos: [lampPos.x, lampPos.y, lampPos.z] as [number, number, number],
          scale: 1,
          type: 'streetlamp',
          rotY: rotY + (isLeft ? Math.PI / 2 : -Math.PI / 2),
        });
      }

      // Left side building/decoration
      if (Math.random() > 0.4) {
        const leftPos = p.clone().addScaledVector(right, -40 - Math.random() * 50);
        let type = trackType === 'neon_city' ? 'cyber_building' : trackType === 'desert' ? 'rock' : trackType === 'jungle' ? 'tree' : trackType === 'icy_mountain' ? 'ice_pillar' : 'asteroid';
        const r = Math.random();
        if (trackType === 'neon_city') {
          if (r > 0.85) type = 'billboard_left';
          else if (r > 0.6) type = 'pillar';
        } else if (trackType === 'desert') {
          if (r > 0.7) type = 'cactus';
        } else if (trackType === 'jungle') {
          if (r > 0.8) type = 'ruin';
        } else if (trackType === 'icy_mountain') {
          if (r > 0.8) type = 'snow_rock';
        }
        items.push({ 
            pos: [leftPos.x, leftPos.y, leftPos.z] as [number, number, number], 
            scale: trackType === 'desert' || trackType === 'icy_mountain' ? 2 + Math.random() * 8 : (2 + Math.random() * 5), 
            type, 
            rotY: rotY + Math.random() * Math.PI * 2,
            color: ['#00FFFF', '#FF00FF', '#00FF00', '#FF4400'][Math.floor(Math.random() * 4)]
        });
      }
      
      // Right side building/decoration
      if (Math.random() > 0.4) {
        const rightPos = p.clone().addScaledVector(right, 40 + Math.random() * 50);
        let type = trackType === 'neon_city' ? 'cyber_building' : trackType === 'desert' ? 'rock' : trackType === 'jungle' ? 'tree' : trackType === 'icy_mountain' ? 'ice_pillar' : 'asteroid';
        const r = Math.random();
        if (trackType === 'neon_city') {
          if (r > 0.85) type = 'billboard_right';
          else if (r > 0.6) type = 'pillar';
        } else if (trackType === 'desert') {
          if (r > 0.7) type = 'cactus';
        } else if (trackType === 'jungle') {
          if (r > 0.8) type = 'ruin';
        } else if (trackType === 'icy_mountain') {
          if (r > 0.8) type = 'snow_rock';
        }
        items.push({ 
            pos: [rightPos.x, rightPos.y, rightPos.z] as [number, number, number], 
            scale: trackType === 'desert' || trackType === 'icy_mountain' ? 2 + Math.random() * 8 : (2 + Math.random() * 5), 
            type, 
            rotY: rotY + Math.random() * Math.PI * 2,
            color: ['#00FFFF', '#FF00FF', '#00FF00', '#FF4400'][Math.floor(Math.random() * 4)]
        });
      }
    }
    return items;
  }, [trackType]);

  return (
    <group>
      {/* Visual Road */}
      <mesh geometry={roadGeometry} material={roadMaterial} receiveShadow />
      
      {/* Visual Walls */}
      <mesh geometry={wallLeftGeometry} material={wallMaterial} receiveShadow castShadow />
      <mesh geometry={wallRightGeometry} material={wallWarningMaterial} receiveShadow castShadow />

      {/* Center Dashes */}
      <group>
        {dashes.map((d, i) => (
          <group key={`dash-${i}`} position={d.position} rotation={[0, d.rotY, 0]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[0.5, 4]} />
              <meshStandardMaterial color="#fff" />
            </mesh>
          </group>
        ))}
      </group>

      {/* Racing Kerbs */}
      <group>
        {kerbs.map((k, i) => (
          <group key={`kerb-${i}`} position={k.pos} rotation={[0, k.rotY, 0]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[2, 4.5]} />
              <meshStandardMaterial color={k.color} roughness={0.6} />
            </mesh>
          </group>
        ))}
      </group>
      
      <ItemBoxes />
      <NitroPickups />

      {/* Boost Pads */}
      <group>
        {boostPadsData.map((pad, i) => (
          <group key={`boost-${i}`} position={pad.position} rotation={[0, Math.atan2(trackCurve.getTangentAt((i+1) / 6 - 0.05).x, trackCurve.getTangentAt((i+1) / 6 - 0.05).z), 0]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[6, 8]} />
              <meshStandardMaterial color="#00FFFF" emissive="#00FFFF" emissiveIntensity={2} transparent opacity={0.8} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Starting Line */}
      <group position={[pathPoints[0].x, pathPoints[0].y, pathPoints[0].z]} rotation={[0, Math.atan2(trackCurve.getTangent(0).x, trackCurve.getTangent(0).z), 0]}>
        <group position={[0, 0.02, 0]}>
          {Array.from({ length: 16 }).map((_, i) => (
            <group key={`start-check-${i}`} position={[-15 + i * 2, 0, 0]}>
               <mesh position={[0, 0, 1]} rotation={[-Math.PI/2, 0, 0]}><planeGeometry args={[2, 2]} /><meshStandardMaterial color={i%2===0?"#ffffff":"#000000"} /></mesh>
               <mesh position={[0, 0, -1]} rotation={[-Math.PI/2, 0, 0]}><planeGeometry args={[2, 2]} /><meshStandardMaterial color={i%2===0?"#000000":"#ffffff"} /></mesh>
               <mesh position={[0, 0, 3]} rotation={[-Math.PI/2, 0, 0]}><planeGeometry args={[2, 2]} /><meshStandardMaterial color={i%2===0?"#000000":"#ffffff"} /></mesh>
               <mesh position={[0, 0, -3]} rotation={[-Math.PI/2, 0, 0]}><planeGeometry args={[2, 2]} /><meshStandardMaterial color={i%2===0?"#ffffff":"#000000"} /></mesh>
            </group>
          ))}
        </group>
        
        {/* Banner Props */}
        <mesh position={[-18, 5, 0]}>
          <cylinderGeometry args={[0.5, 0.5, 10]} />
          <meshStandardMaterial color="#888" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[18, 5, 0]}>
          <cylinderGeometry args={[0.5, 0.5, 10]} />
          <meshStandardMaterial color="#888" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0, 10, 0]}>
          <boxGeometry args={[37, 3, 0.5]} />
          <meshStandardMaterial color="#FF3300" emissive="#FF3300" emissiveIntensity={0.2} />
        </mesh>
      </group>

      {/* Ground (Large plain below) */}
      <mesh position={[0, -2, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[2000, 2000]} />
        <meshStandardMaterial 
          map={trackType === 'desert' ? sandTex : undefined} 
          color={trackType === 'neon_city' ? "#050510" : trackType === 'desert' ? '#ffffff' : trackType === 'jungle' ? '#1b3b1b' : trackType === 'icy_mountain' ? '#e0f7fa' : '#000000'} 
          roughness={0.9} 
        />
      </mesh>

      {/* Decorations (Futuristic environment) */}
      <group>
        {decorations.map((dec, i) => (
          <group key={i} position={dec.pos} scale={dec.scale} rotation={[0, dec.rotY || 0, 0]}>
            {dec.type === 'cyber_building' ? (
                <group>
                   {/* Building Base */}
                   <mesh position={[0, 10, 0]} castShadow receiveShadow>
                     <boxGeometry args={[10, 20, 10]} />
                     <meshStandardMaterial map={buildingTex} color="#fff" roughness={0.1} metalness={0.9} />
                   </mesh>
                   {/* Glowing Strips */}
                   <mesh position={[0, 10, 0]}>
                     <boxGeometry args={[10.5, 2, 10.5]} />
                     <meshStandardMaterial color={dec.color} emissive={dec.color} emissiveIntensity={2} />
                   </mesh>
                   <mesh position={[0, 18, 0]}>
                     <boxGeometry args={[8, 4, 8]} />
                     <meshStandardMaterial color="#222" roughness={0.2} metalness={0.9} />
                   </mesh>
                </group>
            ) : dec.type === 'pillar' ? (
                <mesh position={[0, 15, 0]} castShadow>
                   <cylinderGeometry args={[2, 4, 30, 8]} />
                   <meshStandardMaterial color="#222" roughness={0.3} metalness={0.9} />
                   <mesh position={[0, 10, 0]}>
                     <cylinderGeometry args={[2.5, 2.5, 1, 8]} />
                     <meshStandardMaterial color={dec.color} emissive={dec.color} emissiveIntensity={3} />
                   </mesh>
                </mesh>
            ) : dec.type === 'streetlamp' ? (
                <group>
                   <mesh position={[0, 8, 0]} castShadow>
                     <cylinderGeometry args={[0.2, 0.4, 16]} />
                     <meshStandardMaterial color="#222" metalness={0.8} roughness={0.2} />
                   </mesh>
                   <mesh position={[0, 15.8, 3]} rotation={[Math.PI / 2, 0, 0]}>
                     <cylinderGeometry args={[0.2, 0.2, 6]} />
                     <meshStandardMaterial color="#222" metalness={0.8} roughness={0.2} />
                   </mesh>
                   <mesh position={[0, 15.8, 6]}>
                     <boxGeometry args={[1, 0.4, 2]} />
                     <meshStandardMaterial color="#FFF" emissive="#FFF" emissiveIntensity={3} />
                   </mesh>
                   <spotLight position={[0, 15.8, 6]} angle={0.8} penumbra={0.5} intensity={3} color="#FFF" distance={60} target-position={[0, 0, 10]} />
                </group>
            ) : dec.type === 'rock' ? (
                <mesh position={[0, 2, 0]} castShadow>
                   <dodecahedronGeometry args={[4, 1]} />
                   <meshStandardMaterial color="#8B4513" roughness={0.9} />
                </mesh>
            ) : dec.type === 'asteroid' ? (
                <mesh position={[0, 15 + Math.random() * 20, 0]} castShadow>
                   <dodecahedronGeometry args={[6, 0]} />
                   <meshStandardMaterial color="#333344" roughness={0.8} metalness={0.4} />
                   <mesh position={[0, 0, 0]}>
                      <dodecahedronGeometry args={[6.2, 0]} />
                      <meshStandardMaterial color={dec.color} wireframe transparent opacity={0.3} emissive={dec.color} />
                   </mesh>
                </mesh>
            ) : dec.type === 'cactus' ? (
                <group position={[0, 0, 0]}>
                   <mesh position={[0, 4, 0]} castShadow>
                     <cylinderGeometry args={[0.8, 1, 8]} />
                     <meshStandardMaterial color="#2E8B57" roughness={0.9} />
                   </mesh>
                   <mesh position={[1.5, 3, 0]} rotation={[0, 0, Math.PI / 4]} castShadow>
                     <cylinderGeometry args={[0.6, 0.6, 4]} />
                     <meshStandardMaterial color="#2E8B57" roughness={0.9} />
                   </mesh>
                   <mesh position={[-1.5, 5, 0]} rotation={[0, 0, -Math.PI / 4]} castShadow>
                     <cylinderGeometry args={[0.6, 0.6, 3]} />
                     <meshStandardMaterial color="#2E8B57" roughness={0.9} />
                   </mesh>
                </group>
            ) : dec.type === 'tree' ? (
                <group position={[0, 0, 0]}>
                   <mesh position={[0, 4, 0]} castShadow>
                     <cylinderGeometry args={[1, 1.5, 8]} />
                     <meshStandardMaterial color="#3E2723" roughness={0.9} />
                   </mesh>
                   <mesh position={[0, 10, 0]} castShadow>
                     <dodecahedronGeometry args={[5, 1]} />
                     <meshStandardMaterial color="#1B5E20" roughness={0.8} />
                   </mesh>
                </group>
            ) : dec.type === 'ruin' ? (
                <group position={[0, 0, 0]}>
                   <mesh position={[0, 5, 0]} castShadow>
                     <boxGeometry args={[4, 10, 4]} />
                     <meshStandardMaterial color="#5D4037" roughness={1.0} />
                   </mesh>
                   <mesh position={[0, 10, 0]} castShadow>
                     <boxGeometry args={[6, 2, 6]} />
                     <meshStandardMaterial color="#4E342E" roughness={1.0} />
                   </mesh>
                </group>
            ) : dec.type === 'ice_pillar' ? (
                <mesh position={[0, 8, 0]} castShadow>
                   <cylinderGeometry args={[0, 3, 16, 6]} />
                   <meshStandardMaterial color="#B2EBF2" roughness={0.1} metalness={0.8} transparent opacity={0.8} />
                </mesh>
            ) : dec.type === 'snow_rock' ? (
                <mesh position={[0, 4, 0]} castShadow>
                   <dodecahedronGeometry args={[5, 1]} />
                   <meshStandardMaterial color="#FFFFFF" roughness={0.8} />
                </mesh>
            ) : (
                <group>
                   {/* Billboard */}
                   <mesh position={[0, 15, 0]} castShadow>
                     <boxGeometry args={[2, 30, 2]} />
                     <meshStandardMaterial color="#111" />
                   </mesh>
                   <mesh position={[0, 25, 0]} rotation={[0, Math.PI/2, 0]}>
                     <planeGeometry args={[30, 15]} />
                     <meshStandardMaterial color={dec.color} emissive={dec.color} emissiveIntensity={1.5} side={THREE.DoubleSide} />
                   </mesh>
                </group>
            )}
          </group>
        ))}
      </group>
      
      {/* Dynamic Hazards */}
      <MudPits />
      <MovingHazards />

      {/* Obstacles / Crates */}
      {cratesData.map((crate, i) => (
        <group key={`crate-${i}`} position={crate.position} rotation={[0, Math.sin(i)*Math.PI, 0]}>
            <mesh castShadow receiveShadow position={[0, -0.5, 0]}>
                <boxGeometry args={[4, 4, 4]} />
                <meshStandardMaterial color="#8B4513" roughness={0.9} map={null} />
            </mesh>
            <mesh position={[0, -0.5, 0]}>
                <boxGeometry args={[4.2, 4.2, 4.2]} />
                <meshStandardMaterial color="#FF3300" opacity={0.6} transparent wireframe emissive="#FF3300" emissiveIntensity={0.5} />
            </mesh>
            <pointLight distance={10} intensity={0.5} color="#FF3300" />
        </group>
      ))}

    </group>
  );
}
