'use client';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function Onboarding() {
  const router = useRouter();

  // Slow & smooth, both tiles land together
  const DURATION = 3;
  const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

  // Slide in from inside the card (clipped by parent)
  const fromLeft = {
    hidden: { x: '-110%', opacity: 0 },
    show:   { x: 0,        opacity: 1, transition: { type: 'tween' as const, duration: DURATION, ease: EASE } },
  };
  const fromRight = {
    hidden: { x: '110%', opacity: 0 },
    show:   { x: 0,       opacity: 1, transition: { type: 'tween' as const, duration: DURATION, ease: EASE } },
  };

  return (
    <div className="min-h-dvh bg-[#e8e9eb] flex justify-center items-center p-4">
      <div className="w-full max-w-sm mx-auto">
        {/* Main Card (clipping enabled) */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="bg-white rounded-[32px] p-6 shadow-lg overflow-hidden"
        >
          {/* Feature Cards (no stagger; arrive together) */}
          <div className="flex flex-col gap-4 mb-8">
            {/* Insta Posts to Zora — from left */}
            <motion.div
              variants={fromLeft}
              initial="hidden"
              animate="show"
              style={{ willChange: 'transform' }}
              className="flex items-center gap-3"
            >
              <div className="flex-1 flex items-center justify-center bg-[#F3F3F4] rounded-3xl px-4 py-6 min-h-[80px]">
                <span className="text-[#494656] font-outfit text-base font-normal leading-[130%] tracking-[-0.16px]">
                  Instagram Posts to Zora
                </span>
              </div>
              <motion.div
                whileHover={{ y: -2, scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="w-[80px] h-[80px] bg-[#F3F3F4] rounded-3xl flex items-center justify-center flex-shrink-0"
              >
                <img src="/Zorb.svg" alt="Zora" className="w-12 h-12" />
              </motion.div>
            </motion.div>

            {/* Make edits in the app itself — from right */}
            <motion.div
              variants={fromRight}
              initial="hidden"
              animate="show"
              style={{ willChange: 'transform' }}
              className="flex items-center gap-3"
            >
              <motion.div
                whileHover={{ y: -2, scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="w-[80px] h-[80px] bg-[#F3F3F4] rounded-3xl flex items-center justify-center flex-shrink-0"
              >
             <img src="/insta.webp" alt="Zora" className="w-54 h-54" />                
                
              </motion.div>

              <div className="flex-1 flex items-center justify-center bg-[#F3F3F4] rounded-3xl px-4 py-6 min-h-[80px]">
                <span className="text-[#494656] font-outfit text-base font-normal leading-[130%] tracking-[-0.16px]">
                  Make edits in the app itself
                </span>
              </div>
            </motion.div>
          </div>

          {/* Footer */}
          <div className="border-t border-[#F0F0F0] pt-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center">
                  <img src="/Zorb.svg" alt="Zora" className="w-6 h-6" />
                </div>
               
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center">
                <img src="/insta.webp" alt="Zora" className="w-8 h-8" />
                </div>
                
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.98 }}
              whileHover={{ y: -1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 34 }}
              onClick={() => router.push('/connect-wallet')}
              className="w-full text-white font-outfit text-lg font-medium py-4 rounded-2xl mb-4 transition-all duration-200 bg-black hover:bg-gray-800"
            >
              Continue
            </motion.button>

            <p className="text-[#666] font-outfit text-sm text-center leading-relaxed">
              Tap Continue to start picking posts and coining to Zora. You can link your account in the next steps.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
