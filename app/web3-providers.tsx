'use client';

import { useState } from 'react';
import { WagmiProvider } from 'wagmi';
import { base } from 'wagmi/chains';
import { getDefaultConfig, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const wagmiConfig = getDefaultConfig({
  appName: 'Parrot',
  projectId: '6bf0fb8b46e12e88e7664004567b8ab7',
  chains: [base],
  ssr: false, // keep your original setting
});

export default function Web3Providers({ children }: { children: React.ReactNode }) {
  // create once to avoid recreating in StrictMode
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
