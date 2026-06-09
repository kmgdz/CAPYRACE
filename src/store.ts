import { create } from 'zustand';

export const gameRacers: Record<string, { progress: number, isPlayer: boolean }> = {};

export type GameState = 'MENU' | 'COUNTDOWN' | 'PLAYING' | 'PAUSED' | 'FINISHED' | 'REPLAY';
export type KartType = 'classic' | 'f1' | 'cyber';
export type TrackType = 'neon_city' | 'desert' | 'space' | 'jungle' | 'icy_mountain';
export type WeatherType = 'clear' | 'rain' | 'snow';
export type PowerupType = 'hyper-speed' | 'shield' | null;
export type CameraView = 'third-person' | 'first-person';

interface RacerData {
  id: string;
  x: number;
  z: number;
  progress: number;
  isPlayer: boolean;
}

interface StoreState {
  gameState: GameState;
  volume: number;
  cameraView: CameraView;
  lap: number;
  maxLaps: number;
  time: number;
  bestTime: number | null;
  position: number;
  speed: number;
  nitro: number;
  kartType: KartType;
  kartColor: string;
  trackType: TrackType;
  weather: WeatherType;
  activePowerup: PowerupType;
  isShielded: boolean;
  isHyperSpeed: boolean;
  racers: Record<string, RacerData>;
  activeBoxes: Record<string, boolean>;
  activeNitros: Record<string, boolean>;
  leaderboardData: Array<{ id: number, name: string, time: number, date: string }>;
  replayData: any[];
  setGameState: (state: GameState) => void;
  setVolume: (v: number) => void;
  setCameraView: (v: CameraView) => void;
  setLap: (lap: number) => void;
  setTime: (time: number) => void;
  setBestTime: (time: number) => void;
  setPosition: (pos: number) => void;
  setSpeed: (speed: number) => void;
  setNitro: (nitro: number) => void;
  setKartType: (type: KartType) => void;
  setKartColor: (color: string) => void;
  setTrackType: (track: TrackType) => void;
  setWeather: (weather: WeatherType) => void;
  setActivePowerup: (powerup: PowerupType) => void;
  setShielded: (shielded: boolean) => void;
  setHyperSpeed: (hyper: boolean) => void;
  updateRacer: (id: string, data: Partial<RacerData>) => void;
  setItemBoxActive: (id: string, active: boolean) => void;
  setNitroActive: (id: string, active: boolean) => void;
  setReplayData: (data: any[]) => void;
  fetchLeaderboard: () => Promise<void>;
  submitLeaderboard: (name: string, time: number) => Promise<void>;
  resetRace: () => void;
}

export const useStore = create<StoreState>((set) => ({
  gameState: 'MENU',
  volume: 1,
  cameraView: 'third-person',
  lap: 1,
  maxLaps: 3,
  time: 0,
  bestTime: null,
  position: 1,
  speed: 0,
  nitro: 0,
  kartType: 'cyber',
  kartColor: '#FF4400',
  trackType: 'neon_city',
  weather: 'clear',
  activePowerup: null,
  isShielded: false,
  isHyperSpeed: false,
  racers: {},
  activeBoxes: {},
  activeNitros: {},
  leaderboardData: [],
  replayData: [],
  setGameState: (state) => set({ gameState: state }),
  setVolume: (volume) => set({ volume }),
  setCameraView: (cameraView) => set({ cameraView }),
  setLap: (lap) => set({ lap }),
  setTime: (time) => set({ time }),
  setBestTime: (time) => set({ bestTime: time }),
  setPosition: (position) => set({ position }),
  setSpeed: (speed) => set({ speed }),
  setNitro: (nitro) => set({ nitro }),
  setKartType: (type) => set({ kartType: type }),
  setKartColor: (color) => set({ kartColor: color }),
  setTrackType: (type) => set({ trackType: type }),
  setWeather: (weather) => set({ weather }),
  setActivePowerup: (powerup) => set({ activePowerup: powerup }),
  setShielded: (shielded) => set({ isShielded: shielded }),
  setHyperSpeed: (hyper) => set({ isHyperSpeed: hyper }),
  updateRacer: (id, data) => set((state) => ({ 
    racers: { ...state.racers, [id]: { ...state.racers[id], ...data } } 
  })),
  setItemBoxActive: (id, active) => set((state) => ({ activeBoxes: { ...state.activeBoxes, [id]: active } })),
  setNitroActive: (id, active) => set((state) => ({ activeNitros: { ...state.activeNitros, [id]: active } })),
  setReplayData: (data) => set({ replayData: data }),
  fetchLeaderboard: async () => {
    try {
      const res = await fetch("/api/leaderboard");
      if (res.ok) {
        const data = await res.json();
        set({ leaderboardData: data });
      }
    } catch(e) { console.error(e); }
  },
  submitLeaderboard: async (name, time) => {
    try {
      const res = await fetch("/api/leaderboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, time })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.leaderboard) {
          set({ leaderboardData: data.leaderboard });
        }
      }
    } catch(e) { console.error(e); }
  },
  resetRace: () => set({ lap: 1, time: 0, gameState: 'COUNTDOWN', position: 1, speed: 0, nitro: 0, activePowerup: null, isShielded: false, isHyperSpeed: false }),
}));
