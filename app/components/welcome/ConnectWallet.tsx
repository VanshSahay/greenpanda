'use client';
import { useRouter } from 'next/navigation';
import {ConnectButton} from '@rainbow-me/rainbowkit';

export default function ConnectInstagram() {
  const router = useRouter();
  const goNext = () => {
    router.push(`/all-set?justConnected=1`);
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
                className="group relative w-full h-14 rounded-[24px] bg-black text-white font-outfit text-base font-medium
                             overflow-hidden"
              >
                {/* gentle sheen */}
                <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_100%_at_50%_-20%,rgba(255,255,255,0.16),transparent_50%)]" />

                <span className="relative flex items-center justify-center gap-3">
                  <span className="inline-flex items-center justify-center h-9 px-3 rounded-[18px]
                                   bg-white/10 ring-1 ring-white/15 backdrop-blur-[2px]">
                    <span className="text-white/90 font-outfit">2/3</span>
                  </span>
                  <span>Connect your Wallet</span>
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
