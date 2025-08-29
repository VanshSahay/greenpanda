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
  
  // Get Instagram username from the previous step
  const instagramUsername = searchParams.get('username');
  
  const [mappingStored, setMappingStored] = useState(false);

  // Store the mapping when wallet connects and we have both username and address
  useEffect(() => {
    if (isConnected && address && instagramUsername && !mappingStored) {
      const storeMapping = async () => {
        const result = await createOrUpdateMapping(instagramUsername, address);
        if (result.success) {
          setMappingStored(true);
          console.log('Instagram to wallet mapping stored:', result.mapping);
        } else {
          console.error('Failed to store mapping:', result.error);
        }
      };
      
      storeMapping();
    }
  }, [isConnected, address, instagramUsername, mappingStored, createOrUpdateMapping]);

  const goNext = () => {
    if (instagramUsername) {
      router.push(`/all-set?justConnected=1&username=${encodeURIComponent(instagramUsername)}`);
    } else {
      router.push(`/all-set?justConnected=1`);
    }
  };


  return (
    <div className="min-h-dvh bg-[#e8e9eb] flex justify-center items-center p-4">
      {/* Outer card */}
      <div className="mx-auto max-w-sm bg-white rounded-[32px] shadow-sm ring-1 ring-black/5 overflow-hidden">
        
      
          <div className="flex-1 px-6 pt-5">
            <div className="min-h-[32vh] flex flex-col justify-center items-center">
              <h1 className="font-outfit text-[22px] leading-[130%] tracking-[-0.22px] text-[#232323] mb-4">
                Connect your wallet
              </h1>

              {/* Status messages */}
              {instagramUsername && (
                <div className="mb-4 text-center">
                  <p className="text-[#666] font-outfit text-sm mb-2">
                    Instagram: @{instagramUsername}
                  </p>
                  {isConnected && address && (
                    <div className="flex items-center justify-center gap-2 text-green-600">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="font-outfit text-sm">Wallet connected</span>
                    </div>
                  )}
                  {error && (
                    <div className="flex items-center justify-center gap-2 text-red-600">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span className="font-outfit text-sm">Error: {error}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Input */}
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
                disabled={!isConnected || !mappingStored || isLoading}
                className="group relative w-full h-14 rounded-[24px] bg-black text-white font-outfit text-base font-medium
                             overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {/* gentle sheen */}
                <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_100%_at_50%_-20%,rgba(255,255,255,0.16),transparent_50%)]" />

                                  <span className="relative flex items-center justify-center gap-3">
                    <span className="inline-flex items-center justify-center h-9 px-3 rounded-[18px]
                                   bg-white/10 ring-1 ring-white/15 backdrop-blur-[2px]">
                      <span className="text-white/90 font-outfit">2/3</span>
                    </span>
                    <span>
                      {!isConnected ? 'Connect your Wallet' : 
                       !mappingStored ? 'Processing...' : 
                       'Continue'}
                    </span>
                  </span>
              </button>

              <p className="mt-3 text-center text-[#8D8A98] font-outfit text-sm leading-[140%]">
                To get started, connect your wallet with the address you used to create account on Zora.
              </p>
            </div>
          </div>
        
      </div>
    </div>
  );
}
