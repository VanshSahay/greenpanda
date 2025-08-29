'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { useInstagramWalletMapping } from '@/lib/hooks/useInstagramWalletMapping';

export default function ConnectWallet() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { address, isConnected } = useAccount();
  const { createOrUpdateMapping, isLoading, error } = useInstagramWalletMapping();

  // In the new flow this will be empty here (fine to keep for robustness)
  const instagramUsername = searchParams.get('username');
  const [mappingStored, setMappingStored] = useState(false);

  // Only runs if a username is present (legacy/robustness)
  useEffect(() => {
    if (isConnected && address && instagramUsername && !mappingStored) {
      (async () => {
        const result = await createOrUpdateMapping(instagramUsername, address);
        if (result.success) setMappingStored(true);
        else console.error('Failed to store mapping:', result.error);
      })();
    }
  }, [isConnected, address, instagramUsername, mappingStored, createOrUpdateMapping]);

  const goNext = () => {
    router.push('/connect-instagram'); // next step is Instagram (2/3)
  };

  // If there is no username (normal case), only require wallet connection
  const isDisabled = instagramUsername
    ? (!isConnected || !mappingStored || isLoading) // robustness
    : !isConnected;

  return (
    <div className="min-h-dvh bg-[#e8e9eb] flex justify-center items-center p-4">
      <div className="mx-auto max-w-sm bg-white rounded-[32px] shadow-sm ring-1 ring-black/5 overflow-hidden">
        <div className="flex-1 px-6 pt-5">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-5 h-5 text-amber-600 mt-0.5">
                      <svg viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-amber-800 text-sm font-outfit font-medium">
                      To get started, connect your wallet with the address you used to create account on Zora.
                      </p>
                      
                    </div>
                  </div>
                </div>
          <div className="min-h-[32vh] flex flex-col justify-center items-center">
            <h1 className="font-outfit text-[22px] leading-[130%] tracking-[-0.22px] text-[#232323] mb-4">
              Connect your wallet
            </h1>

            {instagramUsername && (
              <div className="mb-4 text-center">
                <p className="text-[#666] font-outfit text-sm mb-2">Instagram: @{instagramUsername}</p>
                {isConnected && address && (
                  <div className="flex items-center justify-center gap-2 text-green-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="font-outfit text-sm">Wallet connected</span>
                  </div>
                )}
                {error && (
                  <div className="flex items-center justify-center gap-2 text-red-600">
                    <div className="w-2 h-2 bg-red-500 rounded-full" />
                    <span className="font-outfit text-sm">Error: {error}</span>
                  </div>
                )}
              </div>
            )}

            <label className="block">
              <ConnectButton />
            </label>
          </div>
        </div>

        <div className="mt-auto">
          <div className="px-4 pb-5">
            <button
              type="button"
              onClick={goNext}
              disabled={isDisabled}
              className="group relative w-full h-14 rounded-[24px] bg-black text-white font-outfit text-base font-medium
                         overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_100%_at_50%_-20%,rgba(255,255,255,0.16),transparent_50%)]" />
              <span className="relative flex items-center justify-center gap-3">
                <span className="inline-flex items-center justify-center h-9 px-3 rounded-[18px]
                                 bg-white/10 ring-1 ring-white/15 backdrop-blur-[2px]">
                  <span className="text-white/90 font-outfit">1/3</span>
                </span>
                <span>{!isConnected ? 'Connect your Wallet' : 'Continue'}</span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
