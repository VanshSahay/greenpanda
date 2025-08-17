"use client";

import { useEffect } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import Onboarding from "./components/welcome/Onboarding";

export default function App() {
  useEffect(() => {
    // Wait for the app to be ready, then call sdk.actions.ready()
    // This hides the splash screen and displays the app content
    const initializeMiniApp = async () => {
      try {
        await sdk.actions.ready();
        console.log('MiniApp is ready');
      } catch (error) {
        console.error('Failed to initialize MiniApp:', error);
      }
    };

    initializeMiniApp();
  }, []);

  return (
    <div>
      <Onboarding />
    </div>
  );
}
