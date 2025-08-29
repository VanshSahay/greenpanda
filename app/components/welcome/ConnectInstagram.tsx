'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { useInstagramWalletMapping } from '@/lib/hooks/useInstagramWalletMapping';

export default function ConnectInstagram() {
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState<'idle'|'saving'|'saved'|'error'>('idle');
const [errMsg, setErrMsg] = useState<string | null>(null);

  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { createOrUpdateMapping, isLoading } = useInstagramWalletMapping();

  const displayHandle = (() => {
    const v = username.trim();
    if (!v) return '@username';
    return v.startsWith('@') ? v : `@${v}`;
  })();

  const goNext = async () => {
    const clean = username.trim();
    if (!clean) return;
  
    // make sure wallet is connected first
    if (!isConnected || !address) {
      router.push(`/connect-wallet?username=${encodeURIComponent(clean)}`);
      return;
    }
  
    setStatus('saving');
    setErrMsg(null);
  
    const res = await createOrUpdateMapping(clean, address);
    if (res.success) {
      setStatus('saved');
      // brief confirmation, then move on
      setTimeout(() => {
        router.push(`/all-set?justConnected=1&username=${encodeURIComponent(clean)}`);
      }, 600);
    } else {
      setStatus('error');
      setErrMsg(res.error ?? 'Something went wrong.');
    }
  };
  

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void goNext();
  };

  return (
    <div className="min-h-dvh bg-[#e8e9eb] flex justify-center items-center p-4">
      <div className="mx-auto max-w-sm bg-white rounded-[32px] shadow-sm ring-1 ring-black/5 overflow-hidden">
        <form onSubmit={onSubmit} className="flex flex-col min-h-[72svh] sm:min-h-[620px]">
          <div className="flex-1 px-6 pt-5">
            <div className="min-h-[32vh] flex flex-col justify-end">
              <h1 className="font-outfit text-[22px] leading-[130%] tracking-[-0.22px] text-[#232323] mb-4">
                Enter your Instagram username
              </h1>

              <label className="block">
                <div className="bg-[#F7F7F8] border border-[#ECECED] rounded-[14px] px-3 py-2 focus-within:ring-2 focus-within:ring-black/5">
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="@username"
                    autoComplete="off"
                    className="w-full h-12 bg-transparent outline-none border-0 font-outfit text-black text-[15px] placeholder:text-[#B1AFB9]"
                  />
                </div>
              </label>
            </div>
          </div>

          <div className="mt-auto border-t border-[#F0F0F0]">
            <div className="px-6 py-3 flex items-center justify-center gap-2 text-[#7A7786] font-outfit text-sm">
              <img src="/insta.webp" alt="Instagram Logo" className="w-8 h-8" />
              <span className="truncate">{displayHandle}</span>
            </div>

            {status === 'saving' && (
  <div className="px-6 -mt-1 flex items-center justify-center gap-2 text-[#7A7786] font-outfit text-sm">
    <span className="w-2 h-2 rounded-full bg-[#BDBCC3]" />
    <span>Linking…</span>
  </div>
)}
{status === 'saved' && (
  <div className="px-6 -mt-1 flex items-center justify-center gap-2 text-green-600 font-outfit text-sm">
    <span className="w-2 h-2 rounded-full bg-green-500" />
    <span>Linked ✓</span>
  </div>
)}
{status === 'error' && (
  <div className="px-6 -mt-1 flex items-center justify-center gap-2 text-red-600 font-outfit text-sm">
    <span className="w-2 h-2 rounded-full bg-red-500" />
    <span>{errMsg}</span>
  </div>
)}

            <div className="px-4 pb-5">
              <button
                type="button"
                onClick={goNext}
                disabled={!username.trim() || isLoading}
                className="group relative w-full h-14 rounded-[24px] bg-black text-white font-outfit text-base font-medium
                           disabled:opacity-60 disabled:cursor-not-allowed overflow-hidden"
              >
                <span className="relative flex items-center justify-center gap-3">
  <span className="inline-flex items-center justify-center h-9 px-3 rounded-[18px]
                   bg-white/10 ring-1 ring-white/15 backdrop-blur-[2px]">
    <span className="text-white/90 font-outfit">2/3</span>
  </span>
  <span>
    {status === 'saving' ? 'Processing…' :
     status === 'error'  ? 'Retry' :
     'Connect your Instagram'}
  </span>
</span>

              </button>

              <p className="mt-3 text-center text-[#8D8A98] font-outfit text-sm leading-[140%]">
                To get started, connect your Instagram account to Zora. We’ll fetch your posts automatically once it’s linked.
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
