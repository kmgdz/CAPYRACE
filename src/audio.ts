import * as THREE from 'three';

class AudioSystem {
  ctx: AudioContext | null = null;
  masterGain: GainNode | null = null;
  musicGain: GainNode | null = null;
  sfxGain: GainNode | null = null;
  
  engines = new Map<string, any>();
  musicInterval: any = null;
  currentTrackType: string | null = null;

  initialized: boolean = false;
  
  // Music nodes
  droneOsc: OscillatorNode | null = null;
  droneGain: GainNode | null = null;
  noiseNode: AudioBufferSourceNode | null = null;
  noiseGain: GainNode | null = null;
  noiseFilter: BiquadFilterNode | null = null;

  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.4;
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.8;
      this.sfxGain.connect(this.masterGain);
      
      this.initialized = true;
      this.createNoiseBuffer();
    } catch(e) {
      console.warn("AudioContext init failed", e);
    }
  }

  createNoiseBuffer() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2; // 2 seconds
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
  }
  noiseBuffer: AudioBuffer | null = null;

  updateListener(cameraPos: THREE.Vector3, cameraDir: THREE.Vector3, up: THREE.Vector3) {
    if (!this.ctx) return;
    const listener = this.ctx.listener;
    
    // Position
    if (listener.positionX) {
        listener.positionX.setTargetAtTime(cameraPos.x, this.ctx.currentTime, 0.1);
        listener.positionY.setTargetAtTime(cameraPos.y, this.ctx.currentTime, 0.1);
        listener.positionZ.setTargetAtTime(cameraPos.z, this.ctx.currentTime, 0.1);
    } else {
        listener.setPosition(cameraPos.x, cameraPos.y, cameraPos.z);
    }
    
    // Orientation
    if (listener.forwardX) {
        listener.forwardX.setTargetAtTime(cameraDir.x, this.ctx.currentTime, 0.1);
        listener.forwardY.setTargetAtTime(cameraDir.y, this.ctx.currentTime, 0.1);
        listener.forwardZ.setTargetAtTime(cameraDir.z, this.ctx.currentTime, 0.1);
        listener.upX.setTargetAtTime(up.x, this.ctx.currentTime, 0.1);
        listener.upY.setTargetAtTime(up.y, this.ctx.currentTime, 0.1);
        listener.upZ.setTargetAtTime(up.z, this.ctx.currentTime, 0.1);
    } else {
        listener.setOrientation(cameraDir.x, cameraDir.y, cameraDir.z, up.x, up.y, up.z);
    }
  }

  createEngine(id: string) {
    if (!this.ctx || !this.sfxGain) return null;
    
    const panner = this.ctx.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 10;
    panner.maxDistance = 1000;
    panner.rolloffFactor = 3;
    
    const baseOsc = this.ctx.createOscillator();
    baseOsc.type = 'triangle';
    const textureOsc = this.ctx.createOscillator();
    textureOsc.type = 'square';
    const squeakOsc = this.ctx.createOscillator();
    squeakOsc.type = 'sine';
    
    const engineFilter = this.ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    
    const purrLfo = this.ctx.createOscillator();
    purrLfo.type = 'sine';
    const purrLfoGain = this.ctx.createGain();
    purrLfoGain.gain.value = 0.5;
    const amGain = this.ctx.createGain();
    amGain.gain.value = 0.5;
    
    purrLfo.connect(purrLfoGain);
    purrLfoGain.connect(amGain.gain);
    
    const engineGain = this.ctx.createGain();
    engineGain.gain.value = 0;
    
    const squeakGain = this.ctx.createGain();
    squeakGain.gain.value = 0;
    
    baseOsc.connect(engineFilter);
    textureOsc.connect(engineFilter);
    engineFilter.connect(amGain);
    amGain.connect(engineGain);
    
    squeakOsc.connect(squeakGain);
    squeakGain.connect(engineGain);
    
    engineGain.connect(panner);
    panner.connect(this.sfxGain);
    
    baseOsc.start();
    textureOsc.start();
    squeakOsc.start();
    purrLfo.start();
    
    const engineData = { baseOsc, textureOsc, purrLfo, engineFilter, engineGain, squeakOsc, squeakGain, panner };
    this.engines.set(id, engineData);
    return engineData;
  }

  private isResuming = false;

  updateEngine(id: string, speedRatio: number, position?: THREE.Vector3) {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended' && !this.isResuming) {
       this.isResuming = true;
       this.ctx.resume().finally(() => { this.isResuming = false; });
    }
    
    let engine = this.engines.get(id);
    if (!engine) {
       engine = this.createEngine(id);
       if (!engine) return;
    }
    
    if (position) {
       engine.panner.positionX.setTargetAtTime(position.x, this.ctx.currentTime, 0.1);
       engine.panner.positionY.setTargetAtTime(position.y, this.ctx.currentTime, 0.1);
       engine.panner.positionZ.setTargetAtTime(position.z, this.ctx.currentTime, 0.1);
    }
    
    const baseFreq = 50 + speedRatio * 100;
    engine.baseOsc.frequency.setTargetAtTime(baseFreq, this.ctx.currentTime, 0.1);
    engine.textureOsc.frequency.setTargetAtTime(baseFreq * 2.05, this.ctx.currentTime, 0.1);
    
    const lfoRate = 8 + speedRatio * 17;
    engine.purrLfo.frequency.setTargetAtTime(lfoRate, this.ctx.currentTime, 0.1);
    
    const squeakFreq = 1000 + speedRatio * 1500;
    engine.squeakOsc.frequency.setTargetAtTime(squeakFreq, this.ctx.currentTime, 0.1);
    const targetSqueakVol = speedRatio > 0.6 ? (speedRatio - 0.6) * 0.3 : 0;
    engine.squeakGain.gain.setTargetAtTime(targetSqueakVol, this.ctx.currentTime, 0.2);
    
    const filterFreq = 300 + (speedRatio * speedRatio) * 1200; 
    engine.engineFilter.frequency.setTargetAtTime(filterFreq, this.ctx.currentTime, 0.1);
    engine.engineFilter.Q.value = 1.0 + speedRatio * 2.0;

    const targetVol = 0.2 + speedRatio * 0.4;
    engine.engineGain.gain.setTargetAtTime(targetVol, this.ctx.currentTime, 0.1);
  }

  // Active drift loop state
  driftOsc: OscillatorNode | null = null;
  driftGain: GainNode | null = null;
  isDrifting: boolean = false;

  setDrifting(drifting: boolean) {
    if (!this.ctx || !this.sfxGain) return;
    if (this.ctx.state === 'suspended' && !this.isResuming) {
       this.isResuming = true;
       this.ctx.resume().finally(() => { this.isResuming = false; });
    }

    if (drifting && !this.isDrifting) {
       this.isDrifting = true;
       this.driftOsc = this.ctx.createOscillator();
       this.driftOsc.type = 'sawtooth';
       this.driftGain = this.ctx.createGain();
       this.driftGain.gain.value = 0;
       
       const filter = this.ctx.createBiquadFilter();
       filter.type = 'bandpass';
       filter.frequency.value = 1500;
       filter.Q.value = 1;
       
       this.driftOsc.connect(filter);
       if (this.noiseNode) {
           const noiseFilter = this.ctx.createBiquadFilter();
           noiseFilter.type = 'highpass';
           noiseFilter.frequency.value = 1000;
           this.noiseNode.connect(noiseFilter);
           noiseFilter.connect(this.driftGain);
       }
       filter.connect(this.driftGain);
       this.driftGain.connect(this.sfxGain);
       
       this.driftOsc.frequency.setValueAtTime(800, this.ctx.currentTime);
       this.driftOsc.start();
       
       this.driftGain.gain.setTargetAtTime(0.3, this.ctx.currentTime, 0.1);
    } else if (!drifting && this.isDrifting) {
       this.isDrifting = false;
       if (this.driftGain) {
           this.driftGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
           const osc = this.driftOsc;
           setTimeout(() => {
               try { osc?.stop(); osc?.disconnect(); } catch(e) {}
           }, 200);
       }
       this.driftGain = null;
       this.driftOsc = null;
    }
  }

  playCrash(position?: THREE.Vector3) {
    if (!this.ctx || !this.sfxGain) return;
    if (this.ctx.state === 'suspended' && !this.isResuming) {
       this.isResuming = true;
       this.ctx.resume().finally(() => { this.isResuming = false; });
    }

    const panner = this.ctx.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 10;
    panner.maxDistance = 1000;
    panner.rolloffFactor = 3;
    if (position) {
       panner.positionX.value = position.x;
       panner.positionY.value = position.y;
       panner.positionZ.value = position.z;
    }
    panner.connect(this.sfxGain);

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc1.type = 'triangle';
    osc2.type = 'square'; 
    
    osc1.frequency.setValueAtTime(1200, this.ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.15);
    osc2.frequency.setValueAtTime(1250, this.ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(350, this.ctx.currentTime + 0.15);
    
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.8, this.ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(panner);

    osc1.start(this.ctx.currentTime);
    osc2.start(this.ctx.currentTime);
    osc1.stop(this.ctx.currentTime + 0.25);
    osc2.stop(this.ctx.currentTime + 0.25);
  }

  playBoost() {
    if (!this.ctx || !this.sfxGain) return;
    if (this.ctx.state === 'suspended' && !this.isResuming) {
       this.isResuming = true;
       this.ctx.resume().finally(() => { this.isResuming = false; });
    }

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(2500, this.ctx.currentTime + 0.1);
    osc.frequency.linearRampToValueAtTime(2300, this.ctx.currentTime + 0.2);
    osc.frequency.linearRampToValueAtTime(2500, this.ctx.currentTime + 0.3);
    osc.frequency.linearRampToValueAtTime(2300, this.ctx.currentTime + 0.4);
    osc.frequency.exponentialRampToValueAtTime(500, this.ctx.currentTime + 0.8);
    
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.6, this.ctx.currentTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.8);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + 0.85);
  }

  playMusic(trackType: string) {
    if (!this.ctx || !this.musicGain) return;
    if (this.ctx.state === 'suspended' && !this.isResuming) {
       this.isResuming = true;
       this.ctx.resume().finally(() => { this.isResuming = false; });
    }

    this.stopMusic();
    this.currentTrackType = trackType;

    // Playful capybara countdown barks
    const playBark = (delay: number, duration: number, isHigh: boolean) => {
        const time = this.ctx!.currentTime + delay;
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'triangle';
        
        if (isHigh) {
            osc.frequency.setValueAtTime(1000, time);
            osc.frequency.exponentialRampToValueAtTime(600, time + duration);
        } else {
            osc.frequency.setValueAtTime(600, time);
            osc.frequency.exponentialRampToValueAtTime(300, time + duration);
        }
        
        gain.gain.setValueAtTime(0.4, time);
        gain.gain.linearRampToValueAtTime(0.01, time + duration);

        osc.connect(gain);
        gain.connect(this.musicGain!);
        
        osc.start(time);
        osc.stop(time + duration + 0.1);
    };

    playBark(0, 0.2, false); 
    playBark(1, 0.2, false); 
    playBark(2, 0.2, false); 
    playBark(3, 0.4, true);  

    // Start background music loop after countdown
    setTimeout(() => {
        this.startBackgroundMusic(trackType);
    }, 3000);
  }
  
  startBackgroundMusic(trackType: string) {
    if (!this.ctx || !this.musicGain) return;
    
    // Clear old drone
    if (this.droneOsc) {
        try { this.droneOsc.stop(); } catch(e) {}
        this.droneOsc.disconnect();
    }
    if (this.noiseNode) {
        try { this.noiseNode.stop(); } catch(e) {}
        this.noiseNode.disconnect();
    }

    this.droneOsc = this.ctx.createOscillator();
    this.droneGain = this.ctx.createGain();
    this.droneOsc.connect(this.droneGain);
    this.droneGain.connect(this.musicGain);

    this.noiseNode = this.ctx.createBufferSource();
    if (this.noiseBuffer) this.noiseNode.buffer = this.noiseBuffer;
    this.noiseNode.loop = true;
    this.noiseFilter = this.ctx.createBiquadFilter();
    this.noiseGain = this.ctx.createGain();
    
    this.noiseNode.connect(this.noiseFilter);
    this.noiseFilter.connect(this.noiseGain);
    this.noiseGain.connect(this.musicGain);
    
    let tempo = 120;
    
    if (trackType === 'neon_city') {
        // Synthwave arpeggios
        this.droneOsc.type = 'sawtooth';
        this.droneOsc.frequency.value = 55; // Low A
        this.droneGain.gain.value = 0.1;
        this.droneOsc.start();
        tempo = 140;
    } else if (trackType === 'desert') {
        // Didgeridoo drone
        this.droneOsc.type = 'triangle';
        this.droneOsc.frequency.value = 40; 
        this.droneGain.gain.value = 0.3;
        
        const amOsc = this.ctx.createOscillator();
        amOsc.frequency.value = 4;
        const amGain = this.ctx.createGain();
        amGain.gain.value = 0.5;
        this.droneGain.gain.value = 0.5;
        amOsc.connect(amGain.gain);
        amOsc.start();
        
        this.droneOsc.start();
        tempo = 90;
    } else if (trackType === 'space') {
        // Ambient sine wave drone
        this.droneOsc.type = 'sine';
        this.droneOsc.frequency.value = 110; // A2
        this.droneGain.gain.value = 0.2;
        this.droneOsc.start();
        tempo = 70;
    } else if (trackType === 'jungle') {
        // Marimba / Wood percussion vibe
        this.droneOsc.type = 'triangle';
        this.droneOsc.frequency.value = 65.41; // C2
        this.droneGain.gain.value = 0.15;
        this.droneOsc.start();
        tempo = 130;
    } else if (trackType === 'icy_mountain') {
        // Cold wind
        this.droneGain.gain.value = 0.0;
        this.droneOsc.start();
        
        this.noiseFilter.type = 'bandpass';
        this.noiseFilter.frequency.value = 800;
        this.noiseFilter.Q.value = 2;
        this.noiseGain.gain.value = 0.15;
        this.noiseNode.start();
        
        // Modulate wind
        const lfo = this.ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.1;
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 400;
        lfo.connect(lfoGain);
        lfoGain.connect(this.noiseFilter.frequency);
        lfo.start();
        tempo = 100;
    } else {
        this.droneOsc.type = 'sine';
        this.droneOsc.frequency.value = 220; 
        this.droneGain.gain.value = 0.1;
        this.droneOsc.start();
    }

    // Rhythmic sequence
    const beatDuration = 60 / tempo;
    let nextNoteTime = this.ctx.currentTime + 0.1;
    let beat = 0;

    const playDrum = (freq: number, decay: number, isSnare: boolean) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.connect(gain);
        gain.connect(this.musicGain!);
        
        osc.type = isSnare ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, nextNoteTime);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.5, nextNoteTime + 0.1);
        
        gain.gain.setValueAtTime(0.5, nextNoteTime);
        gain.gain.exponentialRampToValueAtTime(0.01, nextNoteTime + decay);
        
        osc.start(nextNoteTime);
        osc.stop(nextNoteTime + decay);

        if (isSnare && this.noiseNode) {
            // Add noise burst for snare
            const nGain = this.ctx!.createGain();
            const nFilter = this.ctx!.createBiquadFilter();
            nFilter.type = 'highpass';
            nFilter.frequency.value = 2000;
            
            this.noiseNode.connect(nFilter);
            nFilter.connect(nGain);
            nGain.connect(this.musicGain!);
            
            nGain.gain.setValueAtTime(0.3, nextNoteTime);
            nGain.gain.exponentialRampToValueAtTime(0.01, nextNoteTime + 0.1);
        }
    };

    const playArp = (freq: number) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.connect(gain);
        gain.connect(this.musicGain!);
        
        osc.type = trackType === 'neon_city' ? 'square' : (trackType === 'icy_mountain' ? 'sine' : 'triangle');
        osc.frequency.value = freq;
        
        gain.gain.setValueAtTime(0.1, nextNoteTime);
        gain.gain.linearRampToValueAtTime(0.01, nextNoteTime + beatDuration * 0.5);
        
        osc.start(nextNoteTime);
        osc.stop(nextNoteTime + beatDuration);
    };

    const scheduleNotes = () => {
        if (!this.ctx || this.currentTrackType !== trackType) return;
        
        while (nextNoteTime < this.ctx.currentTime + 0.1) {
            if (trackType === 'neon_city') {
                if (beat % 4 === 0) playDrum(100, 0.2, false);
                if (beat % 4 === 2) playDrum(200, 0.2, true);
                
                const pentatonic = [220, 261.63, 329.63, 392, 440];
                if (beat % 2 === 0) {
                   playArp(pentatonic[(beat / 2) % pentatonic.length] * 2);
                }
            } else if (trackType === 'jungle') {
                if (beat % 8 === 0 || beat % 8 === 3 || beat % 8 === 6) {
                    playDrum(150, 0.1, false);
                }
                const jungleNotes = [261.63, 293.66, 349.23, 392, 440];
                if (beat % 2 !== 0) {
                    playArp(jungleNotes[Math.floor(Math.random() * jungleNotes.length)] * 2);
                }
            } else if (trackType === 'space') {
                if (beat % 8 === 0) playDrum(80, 0.5, false); // deep kick
                if (beat % 16 === 8) {
                    const arpFreq = 440 + Math.random() * 200;
                    playArp(arpFreq);
                }
            } else if (trackType === 'desert') {
                if (beat % 4 === 0) playDrum(60, 0.4, false);
                if (beat % 16 === 14) playDrum(120, 0.1, false);
            } else if (trackType === 'icy_mountain') {
                const bells = [523.25, 587.33, 659.25, 783.99]; // C5, D5, E5, G5
                if (beat % 4 === 0 && Math.random() > 0.3) {
                    playArp(bells[Math.floor(Math.random() * bells.length)] * 2);
                }
            }

            nextNoteTime += beatDuration * 0.25; // 16th notes
            beat++;
        }
    };

    this.musicInterval = setInterval(scheduleNotes, 25);
  }

  stopMusic() {
    this.currentTrackType = null;
    if (this.musicInterval) {
        clearInterval(this.musicInterval);
        this.musicInterval = null;
    }
    if (this.droneOsc) {
        try { this.droneOsc.stop(); } catch(e) {}
        this.droneOsc.disconnect();
        this.droneOsc = null;
    }
    if (this.noiseNode) {
        try { this.noiseNode.stop(); } catch(e) {}
        this.noiseNode.disconnect();
        this.noiseNode = null;
    }
  }

  stopEngine(id: string) {
    if (this.engines.has(id)) {
        const engine = this.engines.get(id);
        engine.engineGain.gain.setTargetAtTime(0, this.ctx!.currentTime, 0.1);
    }
  }
  
  stopAllEngines() {
    this.engines.forEach((engine, id) => {
        engine.engineGain.gain.setTargetAtTime(0, this.ctx!.currentTime, 0.1);
    });
  }

  setVolume(vol: number) {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.05);
    }
  }
}

export const audioSystem = new AudioSystem();
