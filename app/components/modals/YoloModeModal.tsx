import Link from 'next/link';
import { useState } from 'react';

export default function YoloModeModal() {
  const [yoloModeEnabled, setYoloModeEnabled] = useState(false);

  const handleEnableYolo = () => {
    setYoloModeEnabled(true);
    // Add actual YOLO mode logic here
    console.log('YOLO mode enabled');
  };

  return (
    <div className="min-h-screen bg-[#e8e9eb] p-4">
      {/* Header */}
      <div className="text-[#666] font-outfit text-base mb-6">
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-[32px] max-w-sm mx-auto overflow-hidden">
        {/* Card Header */}
        <div className="flex items-center justify-between p-6 pb-4">
          <h1 className="text-black font-outfit text-xl font-medium">
            Setting
          </h1>
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1L13.5 2.5L16.17 5.17C15.24 5.06 14.32 5 13.38 5C10.1 5 7.1 5.81 4.77 7.28C2.68 8.61 2 10.88 2 12C2 13.12 2.68 15.39 4.77 16.72C7.1 18.19 10.1 19 13.38 19C14.32 19 15.24 18.94 16.17 18.83L13.5 21.5L15 23L21 17V15H19V9H21ZM17.33 17.97C16.5 18.16 15.56 18.2 14.59 18.2C11.34 18.2 8.67 17.45 6.81 16.36C5.21 15.42 4.8 14.58 4.8 14C4.8 13.42 5.21 12.58 6.81 11.64C8.67 10.55 11.34 9.8 14.59 9.8C15.56 9.8 16.5 9.84 17.33 10.03V17.97Z" fill="white" />
            </svg>
          </div>
        </div>

        {/* YOLO Mode Section */}
        <div className="px-6 mb-6">
          <div className="bg-[#F8F8F8] rounded-3xl p-6">
            {/* YOLO Mode Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-black font-outfit text-lg font-medium">
                YOLO Mode
              </h2>
            </div>

            {/* YOLO Mode Description */}
            <p className="text-[#666] font-outfit text-sm leading-relaxed mb-6">
              Automatically coin all new posts without approval.
            </p>

            <img src="/Icon/curvyLineIcon.svg" alt="Edit" className="mb-6" />


            {/* Enable YOLO Mode Button */}
            <button
              onClick={handleEnableYolo}
              disabled={yoloModeEnabled}
              className={`w-full py-4 rounded-2xl font-outfit text-base font-medium mb-4 transition-colors ${yoloModeEnabled
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-black text-white hover:bg-gray-800'
                }`}
            >
              {yoloModeEnabled ? 'YOLO mode enabled' : 'Enable YOLO mode'}
            </button>
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="flex items-center justify-around py-6 border-t border-[#F0F0F0]">
          <Link
            href="/pickandcast"
            className="rounded-full flex items-center justify-center transition-colors"
          >
            <img src="/Icon/rightArrowIcon.svg" alt="Edit" className="w-12 h-12 rotate-180" />
          </Link>
        </div>
      </div>
    </div>
  );
}
