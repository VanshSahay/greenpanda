'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';

export default function PickAndCastOnboarding() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const cameFromConnect =
    searchParams.get('justConnected') === '1' || searchParams.get('connected') === '1';

  const [showAllSet, setShowAllSet] = useState(cameFromConnect);

  useEffect(() => {
    if (!showAllSet) return;
    const t = setTimeout(() => setShowAllSet(false), 1000); 
    return () => clearTimeout(t);
  }, [showAllSet]);

  const continueFlow = () => {
    const username = searchParams.get('username');
    if (username) {
      router.push(`/pickandcast?username=${encodeURIComponent(username)}`);
    } else {
      router.push('/pickandcast');
    }
  };

  return (
    <div className="min-h-[100svh] bg-[#e8e9eb] p-4">
      <div className="mx-auto max-w-sm">
        <div
          className="relative bg-white rounded-[24px] overflow-hidden flex flex-col ring-1 ring-black/5 shadow-[0_10px_30px_rgba(0,0,0,0.06)]"
          style={{ height: 'calc(95svh - 1.25rem + env(safe-area-inset-bottom,0px))' }}
        >
          {/* success overlay */}
          <AnimatePresence>
            {showAllSet && (
              <motion.div
                key="allset"
                className="absolute inset-0 z-50 grid place-items-center bg-white"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
              >
                <motion.div
                  initial={{ scale: 0.86, y: 10, opacity: 0 }}
                  animate={{ scale: 1, y: 0, opacity: 1 }}
                  exit={{ scale: 0.98, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  className="text-center"
                >
                  <div className="mx-auto mb-3 w-14 h-14 rounded-full bg-black text-white grid place-items-center shadow">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="font-outfit text-xl text-black">You’re all set!</div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Header */}
          <div className="px-6 pt-6 pb-0 shrink-0">
            <h1 className="text-black font-outfit text-xl font-medium">Swipe and Coin</h1>
          </div>

          {/* Body */}
          <div
            className="px-6 pb-6 flex-1 overflow-y-auto overscroll-contain -mt-12"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom,0px), 16px)' }}
          >
            {/* spacer for top bars (kept for your layout) */}
            <div className="relative h-12 mb-2" />

            {/* Inner panel */}
            <div className="rounded-[28px] border border-[#ECECED] bg-[#FAFAFA] p-4 pt-7">
              <div className="w-full max-w-[360px] mx-auto">
                <h2 className="text-center font-outfit text-[20px] font-medium text-[#232323] mb-3">
                  Welcome to Parrot
                </h2>

                {/* fanned cards */}
                <div className="relative mx-auto w-[240px] h-[210px] overflow-visible pointer-events-none">
                  <div className="absolute top-[18px] left-1 rotate-[-10deg] w-[92px] h-[180px] rounded-[16px] bg-[#F7F7F8] border border-[#ECECED] z-10" />
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[112px] h-[200px] rounded-[16px] bg-white border border-[#ECECED] shadow-[0_2px_10px_rgba(0,0,0,0.04)] z-30" />
                  <div className="absolute top-[18px] right-1 rotate-[10deg] w-[92px] h-[180px] rounded-[16px] bg-[#F7F7F8] border border-[#ECECED] z-10" />
                </div>

                <p className="mt-5 text-center text-[#4D4A59] font-outfit text-[16px] leading-[150%] px-2">
                  swipe right to coin, left to ignore, or swipe up to edit
                </p>
              </div>

              {/* divider with "or" */}
              <div className="flex items-center my-6 gap-3">
                <div className="flex-1 h-5">
                  <img src="/Icon/curvyLineIcon.svg" alt="" aria-hidden className="w-full h-full object-contain" />
                </div>
                <span className="px-3 text-[#A3A1AA] font-outfit text-sm whitespace-nowrap shrink-0">or</span>
                <div className="flex-1 h-5">
                  <img src="/Icon/curvyLineIcon.svg" alt="" aria-hidden className="w-full h-full object-contain scale-x-[-1]" />
                </div>
              </div>

              {/* actions */}
              <div className="mx-auto w-full max-w-[360px] rounded-3xl bg-white/70 shadow-sm ring-1 ring-[#EEE] px-6 py-4 flex items-center justify-between">
                <Action icon={<CrossIcon className="w-5 h-5" />} label="Ignore" />
                <Action icon={<EditIcon className="w-5 h-5" />} label="Edit" />
                <Action icon={<ArrowIcon className="w-5 h-5" />} label="Post" />
              </div>

              <p className="mt-6 text-center text-[#4D4A59] font-outfit text-[16px] leading-[150%] px-6">
                Click on any of the buttons to do the particular action.
              </p>

              {/* CTA */}
              <div className="mt-7">
                <button
                  onClick={continueFlow}
                  className="w-full h-14 rounded-[24px] bg-black text-white font-outfit text-base font-medium shadow-[0_6px_0_0_#1A1A1A] relative overflow-hidden"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-black via-black to-black opacity-35 pointer-events-none" />
                  <span className="relative inline-flex items-center gap-3">
                    <span className="inline-flex items-center justify-center h-9 px-3 rounded-[18px] bg-black/40 ring-1 ring-white/10">3/3</span>
                    Continue fetching posts
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* --- tiny icon + action helpers --- */
function Action({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-12 h-12 rounded-full bg-[#F4F4F5] text-[#3B3A41] grid place-items-center">{icon}</div>
      <span className="text-[#8F8D96] font-outfit text-sm">{label}</span>
    </div>
  );
}

function CrossIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="#3B3A41" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
function EditIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="#3B3A41" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}
function ArrowIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="#3B3A41" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14m-7-7l7 7-7 7" />
    </svg>
  );
}
