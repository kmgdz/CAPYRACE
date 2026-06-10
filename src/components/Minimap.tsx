import { useEffect, useRef } from 'react';
import { TRACKS } from '../lib/track';
import { mapData } from '../lib/mapData';
import { useStore } from '../store';

export function Minimap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trackType = useStore(state => state.trackType);

  // AI colors array matching GameScene AIs
  const aiColors = ["#FF3366", "#00FFFF", "#FFD700", "#9933FF", "#00FF66"];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const { pathPoints } = TRACKS[trackType];

    let frameId: number;
    
    // Bounds: x: -320 to 320, z: -320 to 160 roughly
    // We'll calculate dynamic bounds from pathPoints to be safe
    let minX = Infinity, maxX = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    
    pathPoints.forEach(p => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.z < minZ) minZ = p.z;
      if (p.z > maxZ) maxZ = p.z;
    });
    
    // Add margin
    const margin = 50;
    minX -= margin; maxX += margin;
    minZ -= margin; maxZ += margin;
    
    const viewWidth = maxX - minX;
    const viewHeight = maxZ - minZ;

    const render = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Coordinate transform function
      const toScreenX = (x: number) => ((x - minX) / viewWidth) * canvas.width;
      const toScreenY = (z: number) => ((z - minZ) / viewHeight) * canvas.height;

      // Draw track outline
      ctx.beginPath();
      pathPoints.forEach((p, i) => {
        const sx = toScreenX(p.x);
        const sy = toScreenY(p.z);
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      });
      ctx.closePath();
      
      // Outer stroke (dark border)
      ctx.lineWidth = 16 * (canvas.width / 500); 
      ctx.strokeStyle = "#444";
      ctx.lineJoin = "round";
      ctx.stroke();

      // Inner stroke (grey road)
      ctx.lineWidth = 12 * (canvas.width / 500);
      ctx.strokeStyle = "#222";
      ctx.stroke();
      
      // Center dashed line
      ctx.beginPath();
      pathPoints.forEach((p, i) => {
        const sx = toScreenX(p.x);
        const sy = toScreenY(p.z);
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      });
      ctx.closePath();
      ctx.lineWidth = 2 * (canvas.width / 500);
      ctx.strokeStyle = "#fff";
      ctx.setLineDash([8, 8]);
      ctx.stroke();
      ctx.setLineDash([]); // Reset line dash

      // Starting Line
      const startP = pathPoints[0];
      const startSx = toScreenX(startP.x);
      const startSy = toScreenY(startP.z);
      // We know track goes roughly +x from start in our points
      ctx.beginPath();
      ctx.moveTo(startSx, startSy - 10);
      ctx.lineTo(startSx, startSy + 10);
      ctx.lineWidth = 6 * (canvas.width / 500);
      ctx.strokeStyle = "#00FF00";
      ctx.stroke();

      // Draw AIs
      for (let i = 0; i < mapData.aiTargetsX.length; i++) {
        const aiX = mapData.aiTargetsX[i];
        const aiZ = mapData.aiTargetsZ[i];
        
        ctx.beginPath();
        ctx.arc(toScreenX(aiX), toScreenY(aiZ), 6 * (canvas.width / 300), 0, Math.PI * 2);
        ctx.fillStyle = aiColors[i % aiColors.length];
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#000";
        ctx.stroke();
      }

      // Draw Player
      ctx.beginPath();
      ctx.arc(toScreenX(mapData.playerTargetX), toScreenY(mapData.playerTargetZ), 8 * (canvas.width / 300), 0, Math.PI * 2);
      ctx.fillStyle = "#FF3300";
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = "#FFF";
      ctx.stroke();

      // Draw Projectiles
      const projectiles = useStore.getState().projectiles;
      for (let i = 0; i < projectiles.length; i++) {
         const p = projectiles[i];
         ctx.beginPath();
         ctx.arc(toScreenX(p.x), toScreenY(p.z), 4 * (canvas.width / 300), 0, Math.PI * 2);
         ctx.fillStyle = "#00FFFF";
         ctx.fill();
         ctx.lineWidth = 1;
         ctx.strokeStyle = "#FFF";
         ctx.stroke();
      }

      frameId = requestAnimationFrame(render);
    };
    
    frameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frameId);
  }, [trackType]);

  return (
    <div className="absolute right-6 bottom-6 w-48 h-48 sm:w-64 sm:h-64 bg-black/60 backdrop-blur-md rounded-2xl border-4 border-white/10 p-4 shadow-xl pointer-events-none">
      <canvas 
        ref={canvasRef}
        width={400} 
        height={400}
        className="w-full h-full drop-shadow-lg"
      />
    </div>
  );
}

