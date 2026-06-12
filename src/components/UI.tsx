import { useEffect, useState, useRef } from 'react';
import { useStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';
import { Minimap } from './Minimap';
import { audioSystem } from '../audio';

import neonCityImage from '../assets/images/neon_city_track_1780765799520.png';
import desertCanyonImage from '../assets/images/desert_canyon_track_1780765833831.png';
import spaceStationImage from '../assets/images/space_station_track_1780765816890.png';
import jungleTrackImage from '../assets/images/jungle_track_1780925242008.png';
import icyMountainTrackImage from '../assets/images/icy_mountain_track_1780925257821.png';
import formulaImage from '../assets/images/formula_kart_1780766506442.png';
import cyberImage from '../assets/images/cyber_kart_1780766522761.png';
import busterImage from '../assets/images/buster_kart_1780766538017.png';

const formatTime = (t: number) => {
  const mins = Math.floor(t / 60);
  const secs = Math.floor(t % 60);
  const ms = Math.floor((t % 1) * 100);
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
};

function Leaderboard() {
  const leaderboardData = useStore(state => state.leaderboardData);
  const fetchLeaderboard = useStore(state => state.fetchLeaderboard);
  
  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return (
    <div className="bg-black/60 backdrop-blur-md rounded-xl p-4 border border-cyan-500/30 min-w-[300px] shadow-[0_0_15px_rgba(0,255,255,0.1)]">
      <h3 className="text-cyan-400 font-black tracking-widest text-center mb-4 border-b border-cyan-500/30 pb-2">GLOBAL LEADERBOARD</h3>
      <div className="flex flex-col gap-2">
        {leaderboardData.length === 0 ? (
          <p className="text-gray-400 text-center text-sm font-mono py-4">No records yet. Be the first!</p>
        ) : (
          leaderboardData.slice(0, 5).map((entry, idx) => (
            <div key={entry.id} className="flex justify-between items-center text-sm font-mono border-b border-white/5 pb-1">
              <span className="text-white basis-1/2 overflow-hidden text-ellipsis whitespace-nowrap"><span className="text-cyan-600 mr-2">{idx + 1}.</span>{entry.name}</span>
              <span className="text-orange-400 font-bold">{formatTime(entry.time)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function PlayingHUD() {
  const lap = useStore(state => state.lap);
  const maxLaps = useStore(state => state.maxLaps);
  const activePowerup = useStore(state => state.activePowerup);

  const timeRef = useRef<HTMLParagraphElement>(null);
  const speedRef = useRef<HTMLSpanElement>(null);
  const nitroRef = useRef<HTMLDivElement>(null);
  const posRef = useRef<HTMLParagraphElement>(null);
  const rpmRef = useRef<SVGPathElement>(null);

  const [showFinalLap, setShowFinalLap] = useState(false);

  useEffect(() => {
    if (lap === maxLaps && maxLaps > 1) {
      setShowFinalLap(true);
      const timer = setTimeout(() => setShowFinalLap(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [lap, maxLaps]);

  useEffect(() => {
    let frameId: number;
    const loop = () => {
      const state = useStore.getState();
      
      if (timeRef.current) {
        timeRef.current.innerText = formatTime(state.time);
      }
      
      if (speedRef.current) {
        speedRef.current.innerText = Math.floor(state.speed).toString();
      }

      if (posRef.current) {
        let suffix = 'th';
        if (state.position === 1) suffix = 'st';
        else if (state.position === 2) suffix = 'nd';
        else if (state.position === 3) suffix = 'rd';
        posRef.current.innerHTML = `${state.position}<span class="text-xl text-white/50">${suffix}</span> / 6`;
      }

      if (rpmRef.current) {
        rpmRef.current.style.strokeDashoffset = String(210 - (Math.min(state.speed / 100, 1) * 210));
      }

      if (nitroRef.current) {
        const isPulse = state.nitro > 95;
        nitroRef.current.style.width = `${Math.min(100, Math.max(0, state.nitro))}%`;
        const hasPulseClass = nitroRef.current.classList.contains('bg-white');
        if (isPulse !== hasPulseClass) {
          if (isPulse) {
            nitroRef.current.className = `h-full transition-all duration-75 bg-white shadow-[0_0_10px_rgba(255,255,255,1)] animate-pulse`;
          } else {
            nitroRef.current.className = `h-full transition-all duration-75 bg-gradient-to-r from-orange-500 to-yellow-400`;
          }
        }
      }

      frameId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(frameId);
  }, []);

  return (
    <motion.div 
      key="playing"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 p-6 flex flex-col justify-between"
    >
      <div className="flex justify-between items-start">
        <div className="flex gap-4">
          <div className="bg-black/50 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10">
            <p className="text-cyan-400 text-xs font-bold tracking-widest mb-1">POS</p>
            <p ref={posRef} className="text-4xl font-black text-white"></p>
          </div>
          <div className="bg-black/50 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10">
            <p className="text-orange-400 text-xs font-bold tracking-widest mb-1">LAP</p>
            <p className="text-4xl font-black text-white">{lap} <span className="text-xl text-white/50">/ {maxLaps}</span></p>
          </div>
        </div>
        
        <div className="flex-1 flex justify-center pointer-events-none">
           <AnimatePresence>
               {activePowerup && (
                   <motion.div 
                     initial={{ scale: 0, y: -50 }} 
                     animate={{ scale: 1, y: 0 }} 
                     exit={{ scale: 0, opacity: 0 }}
                     className={`w-32 h-32 rounded-2xl flex flex-col items-center justify-center border-4 ${
                        activePowerup === 'hyper-speed' ? 'border-orange-500 bg-orange-500/20 shadow-[0_0_30px_rgba(255,100,0,0.8)]' : 
                        activePowerup === 'missile' ? 'border-red-500 bg-red-500/20 shadow-[0_0_30px_rgba(255,0,0,0.8)]' :
                        'border-cyan-400 bg-cyan-400/20 shadow-[0_0_30px_rgba(0,255,255,0.8)]'
                     } backdrop-blur-md`}
                   >
                      <span className="text-5xl mb-2">{
                         activePowerup === 'hyper-speed' ? '⚡' : 
                         activePowerup === 'missile' ? '☄️' : '🛡️'
                      }</span>
                      <span className={`text-xs font-black tracking-widest ${
                         activePowerup === 'hyper-speed' ? 'text-orange-400' : 
                         activePowerup === 'missile' ? 'text-red-400' : 'text-cyan-400'
                      }`}>
                         {activePowerup === 'hyper-speed' ? 'BOOST' : 
                          activePowerup === 'missile' ? 'PLASMA' : 'SHIELD'}
                      </span>
                      {activePowerup === 'missile' && <span className="text-[9px] mt-1 text-red-300 font-bold tracking-tighter">PRESS ENTER TO FIRE</span>}
                   </motion.div>
               )}
           </AnimatePresence>
        </div>

        <div className="bg-black/50 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 text-right">
          <p className="text-orange-400 text-xs font-bold tracking-widest mb-1">TIME</p>
          <p ref={timeRef} className="text-3xl font-mono text-white">0:00.00</p>
        </div>
      </div>
      
      <div className="flex justify-start items-end pointer-events-auto">
        <div className="relative w-48 h-48 ml-4 mb-4 flex flex-col items-center justify-center">
          <svg className="absolute inset-0 w-full h-full drop-shadow-[0_0_15px_rgba(255,100,0,0.6)]" viewBox="0 0 100 100">
            <path 
              d="M 20 80 A 45 45 0 1 1 80 80" 
              fill="none" 
              stroke="rgba(255, 255, 255, 0.1)" 
              strokeWidth="8" 
              strokeLinecap="round" 
            />
            <path 
              ref={rpmRef}
              d="M 20 80 A 45 45 0 1 1 80 80" 
              fill="none" 
              stroke="url(#speedGradient)" 
              strokeWidth="8" 
              strokeLinecap="round"
              strokeDasharray="210"
              strokeDashoffset="210"
              className="transition-all duration-75"
            />
             {Array.from({ length: 9 }).map((_, i) => {
              const angle = -225 + i * (270 / 8); 
              const isRedline = i >= 6;
              return (
                  <g key={i} transform={`rotate(${angle} 50 50)`}>
                      <line x1="50" y1="10" x2="50" y2="15" stroke={isRedline ? "#ef4444" : "#ffffff"} strokeWidth="2" />
                  </g>
              );
            })}
            
            <defs>
              <linearGradient id="speedGradient" x1="0%" y1="100%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="50%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#ef4444" />
              </linearGradient>
            </defs>
          </svg>
          
          <div className="absolute inset-0 flex flex-col items-center justify-center pt-8">
            <span ref={speedRef} className="text-5xl font-black text-white italic tracking-tighter drop-shadow-[0_2px_10px_rgba(255,100,0,0.8)]">
              0
            </span>
            <span className="text-orange-400 text-xs font-bold tracking-widest mt-1">KM/H</span>
            
            <div className="mt-2 w-24 h-2 bg-black/60 rounded-full overflow-hidden border border-white/20 shadow-[0_0_10px_rgba(0,0,0,0.5)]">
               <div 
                ref={nitroRef}
                className={`h-full transition-all duration-75 bg-gradient-to-r from-orange-500 to-yellow-400`}
                style={{ width: '0%' }}
               />
            </div>
          </div>
        </div>
      </div>
      
      <AnimatePresence>
        {showFinalLap && (
          <motion.div 
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [1, 1.2, 1], opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none z-50"
          >
            <h2 className="text-6xl md:text-9xl font-black italic text-transparent bg-clip-text bg-gradient-to-br from-yellow-300 via-orange-500 to-red-600 drop-shadow-[0_0_50px_rgba(255,100,0,0.8)] tracking-tighter">
              FINAL LAP!
            </h2>
          </motion.div>
        )}
      </AnimatePresence>

      <Minimap />
    </motion.div>
  );
}

function FinishedHUD({ bestTime, submitLeaderboard, playerName, setPlayerName, hasSubmitted, setHasSubmitted, resetRace }: any) {
  const time = useStore(state => state.time);
  
  return (
    <motion.div 
      key="finished"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center backdrop-blur-sm z-50 overflow-y-auto py-10"
    >
      <div className="bg-black border border-cyan-500/30 p-12 shadow-[0_0_50px_rgba(0,255,255,0.15)] flex flex-col items-center max-w-lg w-full rounded-2xl">
        <h2 className="text-cyan-400 text-6xl font-black italic tracking-tighter mb-2 drop-shadow-[0_0_15px_rgba(0,255,255,0.5)]">RACE OVER</h2>
        
        {(() => {
          let medal = null;
          let label = '';
          let color = '';
          if (time <= 120) {
              medal = '🏆';
              label = 'GOLD MEDAL';
              color = 'text-yellow-400 drop-shadow-[0_0_15px_rgba(255,215,0,0.8)]';
          } else if (time <= 150) {
              medal = '🥈';
              label = 'SILVER MEDAL';
              color = 'text-gray-300 drop-shadow-[0_0_15px_rgba(192,192,192,0.8)]';
          } else if (time <= 200) {
              medal = '🥉';
              label = 'BRONZE MEDAL';
              color = 'text-amber-600 drop-shadow-[0_0_15px_rgba(205,127,50,0.8)]';
          }
          
          if (medal) {
              return (
                <div className="flex flex-col items-center mb-6 mt-4 animate-bounce">
                    <span className="text-6xl mb-2">{medal}</span>
                    <span className={`text-2xl font-black ${color} tracking-widest`}>{label}</span>
                </div>
          );
        }
        })()}

        <p className="text-white text-2xl font-mono mb-4 mt-4">Time: {formatTime(time)}</p>
        {bestTime && bestTime < time && (
          <p className="text-yellow-400 text-lg font-mono mb-8">Best: {formatTime(bestTime)}</p>
        )}
        {(!bestTime || time < bestTime) && (
          <p className="text-yellow-400 text-lg font-mono mb-2 font-bold animate-pulse">NEW BEST TIME!</p>
        )}
        
        <div className="flex flex-col items-center gap-6 my-6 min-w-[300px]">
          <Leaderboard />
          
          {!hasSubmitted ? (
              <div className="flex gap-2 w-full">
                <input 
                  type="text" 
                  placeholder="ENTER INITIALS" 
                  value={playerName}
                  onChange={e => setPlayerName(e.target.value.toUpperCase().slice(0, 3))}
                  className="bg-white/10 border border-white/20 text-white font-mono px-4 py-2 w-full rounded focus:outline-none focus:border-cyan-400 uppercase text-center tracking-[0.5em]"
                />
                <button 
                  onClick={() => {
                    if(playerName) {
                      submitLeaderboard(playerName, time);
                      setHasSubmitted(true);
                    }
                  }}
                  disabled={!playerName}
                  className="bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-400 border border-cyan-500 hover:border-cyan-300 px-6 py-2 rounded font-bold tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  SUBMIT
                </button>
              </div>
          ) : (
            <div className="text-cyan-400 font-bold tracking-widest border border-cyan-500/30 px-6 py-2 rounded bg-cyan-500/10">
              SCORE SUBMITTED
            </div>
          )}
        </div>
        
        <div className="flex gap-4 mt-4 w-full">
           <button 
             onClick={() => {
                 useStore.getState().setGameState('REPLAY');
             }}
             className="flex-1 px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/20 text-white font-bold rounded tracking-widest transition-colors flex items-center justify-center gap-2"
           >
             <span>🎥</span> VIEW REPLAY
           </button>
           <button 
             onClick={resetRace}
             className="flex-1 px-8 py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded tracking-widest transition-colors shadow-[0_0_15px_rgba(255,100,0,0.4)]"
           >
             PLAY AGAIN
           </button>
        </div>
      </div>
    </motion.div>
  );
}

export function UI() {
  const gameState = useStore(state => state.gameState);
  const volume = useStore(state => state.volume);
  const cameraView = useStore(state => state.cameraView);
  const bestTime = useStore(state => state.bestTime);
  const kartType = useStore(state => state.kartType);
  const kartColor = useStore(state => state.kartColor);
  const trackType = useStore(state => state.trackType);
  const weather = useStore(state => state.weather);

  const resetRace = useStore(state => state.resetRace);
  const setGameState = useStore(state => state.setGameState);
  const setVolume = useStore(state => state.setVolume);
  const setCameraView = useStore(state => state.setCameraView);
  const setKartType = useStore(state => state.setKartType);
  const setKartColor = useStore(state => state.setKartColor);
  const setTrackType = useStore(state => state.setTrackType);
  const setWeather = useStore(state => state.setWeather);
  const submitLeaderboard = useStore(state => state.submitLeaderboard);

  const [countdownText, setCountdownText] = useState('3');
  const [playerName, setPlayerName] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const handleStart = () => {
    audioSystem.init();
    setCountdownText('3');
    setHasSubmitted(false);
    setPlayerName('');
    resetRace();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (gameState === 'PLAYING') {
          setGameState('PAUSED');
        } else if (gameState === 'PAUSED') {
          setGameState('PLAYING');
        }
      }
      if (e.key.toLowerCase() === 'v' && gameState === 'PLAYING') {
        useStore.setState((state) => ({ 
          cameraView: state.cameraView === 'third-person' ? 'first-person' : 'third-person' 
        }));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, setGameState]);

  useEffect(() => {
    if (gameState === 'COUNTDOWN') {
      audioSystem.playMusic(trackType); // plays the beep
      setCountdownText('3');
      
      let step = 0;
      const texts = ['3', '2', '1', 'GO!'];
      
      const interval = setInterval(() => {
        step++;
        if (step < texts.length) {
          setCountdownText(texts[step]);
          if (texts[step] === 'GO!') {
            clearInterval(interval);
            setGameState('PLAYING');
          }
        }
      }, 1000); // 1 sec per beep
      
      return () => clearInterval(interval);
    }
  }, [gameState, setGameState]);

  useEffect(() => {
    if (gameState === 'PLAYING') {
      const timer = setTimeout(() => {
        setCountdownText('');
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [gameState]);

  useEffect(() => {
    if (gameState === 'FINISHED') {
      audioSystem.stopMusic();
      audioSystem.stopAllEngines();
    }
  }, [gameState]);

  useEffect(() => {
    audioSystem.setVolume(volume);
  }, [volume]);

  return (
    <div className="absolute inset-0 pointer-events-none select-none">
      <AnimatePresence>
        {gameState === 'MENU' && (
          <motion.div 
            key="menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black/80 flex flex-col items-center justify-center pointer-events-auto"
          >
            <div className="absolute top-8 right-8 hidden xl:block">
              <Leaderboard />
            </div>
            
            <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-orange-400 to-orange-600 mb-4 text-center select-none font-sans uppercase tracking-tighter drop-shadow-[0_0_20px_rgba(255,100,0,0.5)]">
              CapyRace
            </h1>
            
            {/* Track Selection */}
            <div className="mb-4 border-t border-b border-cyan-500/30 py-4 px-4 w-full max-w-3xl bg-black/40 backdrop-blur-md rounded-xl shadow-[0_0_30px_rgba(0,100,255,0.1)]">
               <h3 className="text-cyan-400 tracking-widest text-sm mb-4 font-bold text-center drop-shadow-[0_0_8px_rgba(0,255,255,0.5)]">SELECT TRACK</h3>
               <div className="flex gap-4 justify-center pointer-events-auto flex-wrap">
                   {[
                    { id: 'neon_city', label: 'NEON CITY', img: neonCityImage },
                    { id: 'desert', label: 'DESERT CANYON', img: desertCanyonImage },
                    { id: 'space', label: 'SPACE STATION', img: spaceStationImage },
                    { id: 'jungle', label: 'JUNGLE RUINS', img: jungleTrackImage },
                    { id: 'icy_mountain', label: 'ICY PEAKS', img: icyMountainTrackImage }
                  ].map(track => (
                     <button
                       key={track.id}
                       onClick={(e) => {
                         e.stopPropagation();
                         setTrackType(track.id as any);
                       }}
                       className={`relative overflow-hidden group border-2 ${trackType === track.id ? 'border-cyan-500 bg-cyan-500/20 shadow-[0_0_15px_rgba(0,255,255,0.4)]' : 'border-gray-700 bg-black/60'} hover:border-cyan-400 hover:bg-cyan-900/30 transition-all rounded-lg p-2 flex flex-col items-center gap-1 w-36 md:w-48`}
                     >
                       <div className="w-full h-20 md:h-28 rounded overflow-hidden mb-1 relative">
                         <img src={track.img} alt={track.label} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                         <div className="absolute inset-0 bg-black/30 group-hover:bg-transparent transition-colors"></div>
                       </div>
                       {trackType === track.id && <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/20 to-transparent pointer-events-none" />}
                       <span className={`relative text-[10px] md:text-xs tracking-widest font-black ${trackType === track.id ? 'text-cyan-400 drop-shadow-[0_0_5px_rgba(0,255,255,0.8)]' : 'text-gray-500'}`}>{track.label}</span>
                     </button>
                  ))}
               </div>
            </div>

            {/* Weather Selection */}
            <div className="mb-4 py-2 px-4 w-full max-w-3xl flex flex-col items-center pointer-events-auto">
               <h3 className="text-gray-400 tracking-widest text-[10px] mb-2 font-bold text-center">WEATHER</h3>
               <div className="flex gap-2 justify-center">
                   {[
                    { id: 'clear', label: '☀️ CLEAR', color: 'yellow' },
                    { id: 'rain', label: '🌧️ Raining', color: 'blue' },
                    { id: 'snow', label: '❄️ SNOWING', color: 'white' }
                  ].map(w => {
                    const isSelected = weather === w.id;
                    return (
                     <button
                       key={w.id}
                       onClick={(e) => {
                         e.stopPropagation();
                         setWeather(w.id as any);
                       }}
                       className={`px-4 py-1 border rounded font-mono text-xs font-bold transition-all ${isSelected ? `border-${w.color}-500 bg-${w.color}-500/20 text-${w.color}-400 shadow-[0_0_10px_rgba(255,255,255,0.2)]` : 'border-gray-800 bg-black/50 text-gray-500 hover:border-gray-500'}`}
                     >
                       {w.label}
                     </button>
                    )
                  })}
               </div>
            </div>

             {/* Kart Selection */}
            <div className="mb-8 border-t border-b border-orange-500/30 py-4 px-4 w-full max-w-3xl bg-black/40 backdrop-blur-md rounded-xl shadow-[0_0_30px_rgba(255,100,0,0.1)]">
               <h3 className="text-orange-400 tracking-widest text-sm mb-4 font-bold text-center drop-shadow-[0_0_8px_rgba(255,150,0,0.5)]">SELECT YOUR VEHICLE</h3>
               
               <div className="flex flex-col items-center gap-6 justify-center pointer-events-auto">
                 <div className="flex flex-col gap-4 w-full">
                   <div className="flex gap-4 justify-center flex-wrap">
                      {[
                        { id: 'f1', label: 'FORMULA', img: formulaImage },
                        { id: 'cyber', label: 'CYBER', img: cyberImage },
                        { id: 'classic', label: 'BUSTER', img: busterImage }
                      ].map(kart => (
                         <button
                           key={kart.id}
                           onClick={(e) => {
                             e.stopPropagation();
                             setKartType(kart.id as any);
                           }}
                           className={`relative overflow-hidden group border-2 ${kartType === kart.id ? 'border-orange-500 bg-orange-500/20 shadow-[0_0_15px_rgba(255,100,0,0.4)]' : 'border-gray-700 bg-black/60'} hover:border-orange-400 hover:bg-orange-900/30 transition-all rounded-lg p-2 flex flex-col items-center gap-1 w-36 md:w-48`}
                         >
                           <div className="w-full h-24 md:h-32 rounded overflow-hidden mb-1 relative">
                             <img src={kart.img} alt={kart.label} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                             <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors"></div>
                           </div>
                           {kartType === kart.id && <div className="absolute inset-0 bg-gradient-to-t from-orange-500/20 to-transparent pointer-events-none" />}
                           <span className={`relative text-[10px] md:text-xs tracking-widest font-black ${kartType === kart.id ? 'text-orange-400 drop-shadow-[0_0_5px_rgba(255,150,0,0.8)]' : 'text-gray-500'}`}>{kart.label}</span>
                         </button>
                      ))}
                   </div>
                   
                   {/* Color Selection */}
                   <div className="flex gap-3 justify-center pointer-events-auto flex-wrap">
                      {['#FF4400', '#00DDFF', '#FF00DD', '#00FF44', '#FFE600', '#FFFFFF'].map(color => (
                          <button
                            key={color}
                            onClick={(e) => {
                              e.stopPropagation();
                              setKartColor(color);
                            }}
                            className={`w-8 h-8 rounded-full border-2 transition-transform ${kartColor === color ? 'border-white scale-125' : 'border-transparent hover:scale-110'}`}
                            style={{ backgroundColor: color, boxShadow: kartColor === color ? `0 0 15px ${color}` : 'none' }}
                          />
                      ))}
                   </div>
                 </div>
               </div>
            </div>

            <button 
              onClick={handleStart}
              className="px-12 py-4 bg-orange-500 hover:bg-orange-400 text-white font-bold text-2xl rounded-full shadow-lg hover:shadow-orange-500/50 transition-all border-b-4 border-orange-700 active:border-b-0 active:translate-y-1"
            >
              START ENGINE
            </button>
            <div className="mt-12 flex gap-4 text-sm font-mono text-white/50 flex-wrap justify-center max-w-xl">
              <span className="bg-white/10 px-3 py-1 rounded">W / ↑ : GAS</span>
              <span className="bg-white/10 px-3 py-1 rounded">S / ↓ : BRAKE</span>
              <span className="bg-white/10 px-3 py-1 rounded">A D / ← → : STEER</span>
              <span className="bg-white/10 px-3 py-1 rounded text-cyan-300">SPACE: DRIFT</span>
              <span className="bg-white/10 px-3 py-1 rounded text-orange-400">SHIFT: NITRO</span>
              <span className="bg-white/10 px-3 py-1 rounded text-gray-400">ESC: PAUSE</span>
              <span className="bg-white/10 px-3 py-1 rounded text-purple-400">V: CAMERA</span>
            </div>
          </motion.div>
        )}

        {(gameState === 'COUNTDOWN' || (gameState === 'PLAYING' && countdownText === 'GO!')) && (
          <motion.div 
            key="countdown"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <AnimatePresence mode="popLayout">
              {countdownText && (
                <motion.h2 
                  key={countdownText}
                  initial={{ scale: 0, opacity: 0, rotate: -15 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  exit={{ scale: 2, opacity: 0, rotate: 15 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  className={`absolute text-8xl md:text-[150px] font-black italic tracking-tighter ${
                    countdownText === 'GO!' 
                      ? 'text-green-500 drop-shadow-[0_0_40px_rgba(0,255,0,0.8)]' 
                      : 'text-orange-500 drop-shadow-[0_0_40px_rgba(255,100,0,0.8)]'
                  }`}
                >
                  {countdownText}
                </motion.h2>
              )}
            </AnimatePresence>
          </motion.div>
        )}
        
        {gameState === 'REPLAY' && (
          <motion.div
            key="replay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 p-6 flex flex-col justify-between pointer-events-none"
          >
             <div className="flex justify-between items-start">
               <div className="bg-red-600/80 pointer-events-auto backdrop-blur-md px-4 py-2 rounded-lg border border-red-400">
                 <p className="text-white text-sm font-bold tracking-widest animate-pulse">● REC / REPLAY</p>
               </div>
               
               <button 
                 onClick={() => setGameState('FINISHED')}
                 className="pointer-events-auto px-6 py-2 bg-white/10 hover:bg-white/20 border border-white/30 backdrop-blur-md text-white font-bold rounded shadow-lg transition-all"
               >
                 EXIT REPLAY
               </button>
             </div>
             
             {/* Cinema Bars */}
             <div className="absolute top-0 left-0 right-0 h-24 bg-black pointer-events-none" />
             <div className="absolute bottom-0 left-0 right-0 h-24 bg-black pointer-events-none" />
          </motion.div>
        )}

        {gameState === 'PLAYING' && <PlayingHUD />}

        {gameState === 'PAUSED' && (
          <motion.div 
            key="paused"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center pointer-events-auto backdrop-blur-sm z-50"
          >
            <h2 className="text-5xl md:text-7xl font-black text-white mb-8 tracking-widest drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]">
              PAUSED
            </h2>
            
            <div className="flex flex-col gap-6 w-full max-w-sm mb-12">
              <button 
                onClick={() => setGameState('PLAYING')}
                className="px-8 py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xl rounded-full shadow-[0_0_15px_rgba(0,255,255,0.4)] transition-all border-b-4 border-cyan-800 active:border-b-0 active:translate-y-1 w-full"
              >
                RESUME
              </button>
              
              <div className="bg-white/10 rounded-2xl p-6 border border-white/20">
                <p className="text-cyan-300 tracking-widest text-sm mb-4 font-bold text-center">MASTER VOLUME</p>
                <div className="flex items-center gap-4">
                  <span className="text-white">🔇</span>
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.01" 
                    value={volume} 
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-full accent-cyan-500"
                  />
                  <span className="text-white">🔊</span>
                </div>
              </div>

              <div className="bg-white/10 rounded-2xl p-6 border border-white/20">
                <p className="text-cyan-300 tracking-widest text-sm mb-4 font-bold text-center">CAMERA VIEW</p>
                <div className="flex justify-center">
                  <button 
                    onClick={() => setCameraView(cameraView === 'third-person' ? 'first-person' : 'third-person')}
                    className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-full border border-gray-600 transition-all uppercase"
                  >
                    {cameraView.replace('-', ' ')}
                  </button>
                </div>
              </div>

              <button 
                onClick={() => {
                  audioSystem.init();
                  resetRace();
                }}
                className="px-8 py-3 bg-red-600/80 hover:bg-red-500 text-white border border-red-400/50 font-bold text-lg rounded-full shadow-[0_0_15px_rgba(255,0,0,0.3)] transition-all w-full"
              >
                RESTART RACE
              </button>

              <button 
                onClick={() => {
                  setGameState('MENU');
                }}
                className="px-8 py-3 bg-gray-700/80 hover:bg-gray-600 text-white border border-white/20 font-bold text-lg rounded-full transition-all w-full"
              >
                MAIN MENU
              </button>
            </div>
          </motion.div>
        )}

        {gameState === 'FINISHED' && (
          <FinishedHUD 
            bestTime={bestTime}
            submitLeaderboard={submitLeaderboard}
            playerName={playerName}
            setPlayerName={setPlayerName}
            hasSubmitted={hasSubmitted}
            setHasSubmitted={setHasSubmitted}
            resetRace={() => {
              setHasSubmitted(false);
              setPlayerName('');
              handleStart();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
