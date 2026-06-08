/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Suspense, useEffect, Component, ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { KeyboardControls } from '@react-three/drei';
import { GameScene } from './components/GameScene';
import { UI } from './components/UI';
import { useStore } from './store';

class ErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="absolute inset-0 z-50 bg-red-900 text-white p-10 font-mono">
          <h1 className="text-2xl font-bold mb-4">Runtime Error</h1>
          <pre className="whitespace-pre-wrap">{this.state.error?.message}</pre>
          <pre className="whitespace-pre-wrap mt-4 text-sm text-red-200">{this.state.error?.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const gameState = useStore(state => state.gameState);
  const bestTime = useStore(state => state.bestTime);
  const setBestTime = useStore(state => state.setBestTime);

  useEffect(() => {
    if (gameState === 'FINISHED') {
      const finalTime = useStore.getState().time;
      if (!bestTime || finalTime < bestTime) {
        setBestTime(finalTime);
      }
    }
  }, [gameState, bestTime, setBestTime]);

  return (
    <KeyboardControls
      map={[
        { name: 'forward', keys: ['ArrowUp', 'KeyW'] },
        { name: 'backward', keys: ['ArrowDown', 'KeyS'] },
        { name: 'left', keys: ['ArrowLeft', 'KeyA'] },
        { name: 'right', keys: ['ArrowRight', 'KeyD'] },
        { name: 'drift', keys: ['Space'] },
        { name: 'useNitro', keys: ['ShiftLeft', 'ShiftRight'] },
      ]}
    >
      <div className="w-full h-screen bg-black overflow-hidden relative font-sans">
        <ErrorBoundary>
          <Canvas 
            shadows 
            camera={{ position: [0, 5, 10], fov: 60 }}
            dpr={[1, 2]}
            gl={{ antialias: false, powerPreference: "high-performance", stencil: false, depth: true }}
          >
            <Suspense fallback={null}>
              <GameScene />
            </Suspense>
          </Canvas>
          <UI />
        </ErrorBoundary>
      </div>
    </KeyboardControls>
  );
}
