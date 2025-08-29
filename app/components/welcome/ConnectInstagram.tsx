'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ConnectInstagram() {
  const [username, setUsername] = useState('');
  const router = useRouter();

  // right under: const router = useRouter();
const displayHandle = (() => {
    const v = username.trim();
    if (!v) return '@username';
    return v.startsWith('@') ? v : `@${v}`;
  })();
  

  const goNext = () => {
    if (!username.trim()) return;
    router.push(`/connect-wallet?username=${encodeURIComponent(username.trim())}`);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    goNext();
  };

  return (
    <div className="min-h-dvh bg-[#e8e9eb] flex justify-center items-center p-4">
      {/* Outer card */}
      <div className="mx-auto max-w-sm bg-white rounded-[32px] shadow-sm ring-1 ring-black/5 overflow-hidden">
        {/* Content (shorter overall) */}
        <form onSubmit={onSubmit} className="flex flex-col min-h-[72svh] sm:min-h-[620px]">
          {/* Top section with trimmed breathing room */}
          <div className="flex-1 px-6 pt-5">
            <div className="min-h-[32vh] flex flex-col justify-end">
              <h1 className="font-outfit text-[22px] leading-[130%] tracking-[-0.22px] text-[#232323] mb-4">
                Enter your Instagram username
              </h1>

              {/* Input */}
              <label className="block">
                <div className="bg-[#F7F7F8] border border-[#ECECED] rounded-[14px] px-3 py-2 focus-within:ring-2 focus-within:ring-black/5">
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="@username"
                    autoComplete="off"
                    className="w-full h-12 bg-transparent outline-none border-0 font-outfit text-[15px] placeholder:text-[#B1AFB9]"
                  />
                </div>
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-auto border-t border-[#F0F0F0]">
            {/* Handle preview row */}
            <div className="px-6 py-3 flex items-center justify-center gap-2 text-[#7A7786] font-outfit text-sm">
            <img src="/insta.webp" alt="Instagram Logo" className="w-8 h-8" />
            <span className="truncate">{displayHandle}</span>
            </div>

            {/* CTA + helper text */}
            <div className="px-4 pb-5">
              <button
                type="button"
                onClick={goNext}
                disabled={!username.trim()}
                className="group relative w-full h-14 rounded-[24px] bg-black text-white font-outfit text-base font-medium
                           disabled:opacity-60 disabled:cursor-not-allowed overflow-hidden"
              >
                {/* gentle sheen */}
                <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_100%_at_50%_-20%,rgba(255,255,255,0.16),transparent_50%)]" />

                <span className="relative flex items-center justify-center gap-3">
                  <span className="inline-flex items-center justify-center h-9 px-3 rounded-[18px]
                                   bg-white/10 ring-1 ring-white/15 backdrop-blur-[2px]">
                    <span className="text-white/90 font-outfit">1/3</span>
                  </span>
                  <span>Connect your Instagram</span>
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
