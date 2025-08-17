'use client';
import { useState } from 'react';
import { useRouter } from "next/navigation";
import ConnectionModal from '../modals/ConnectionModal';

export default function Onboarding() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    isConnected: boolean;
    username?: string;
  }>({ isConnected: false });

  const handleConnect = (username: string, privateKey: string) => {
    // Store connection info (in a real app, you'd send this to your backend)
    // For now, we're not using privateKey but it's required for the connection flow
    console.log('Connecting with username:', username, 'privateKey length:', privateKey.length);
    
    setConnectionStatus({
      isConnected: true,
      username: username,
    });
    
    // Close modal and navigate to pick and cast page
    setIsModalOpen(false);
    router.push("/pickandcast");
  };
  return (
    <div className="min-h-screen bg-[#e8e9eb] flex justify-center items-center p-4">
      <div className="w-full max-w-sm mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-[#A0A0A0] font-outfit text-lg font-normal">
            Connect
          </h1>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-[32px] p-6 shadow-lg">
          {/* Feature Cards Section */}
          <div className="flex flex-col gap-4 mb-8">
            {/* Instagram Posts to Zora */}
            <div className="flex items-center gap-3">
              <div className="flex-1 flex items-center bg-[#F3F3F4] rounded-3xl px-4 py-6 min-h-[80px]">
                <span className="text-[#494656] font-outfit text-base font-normal leading-[130%] tracking-[-0.16px]">
                  Insta Posts to Zora
                </span>
              </div>
              {/* Zora icon */}
              <div className="w-[80px] h-[80px] bg-black rounded-3xl flex items-center justify-center flex-shrink-0">
                {/* Put your Zorb.svg in /public/zorb.svg */}
                <img
                  src="/Zorb.svg"
                  alt="Zora"
                  className="w-8 h-8"
                />
              </div>
            </div>

            {/* Make edits in the app itself */}
            <div className="flex items-center gap-3">
              {/* Instagram icon (monochrome glyph) */}
              <div className="w-[80px] h-[80px] bg-[#7C65C1] rounded-3xl flex items-center justify-center flex-shrink-0">
                <svg width="32" height="32" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm10 2H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3zm-5 3a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6zM18.5 6.5a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 0 1 2.2 0z"
                    fill="white"
                  />
                </svg>
              </div>
              <div className="flex-1 flex items-center bg-[#F3F3F4] rounded-3xl px-4 py-6 min-h-[80px]">
                <span className="text-[#494656] font-outfit text-base font-normal leading-[130%] tracking-[-0.16px]">
                  Make edits in the app itself
                </span>
              </div>
            </div>
          </div>

          {/* Connection Status Section */}
          <div className="border-t border-[#F0F0F0] pt-6">
            {/* Profile and Connection Status */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                {/* Small Instagram glyph */}
                <div className="w-8 h-8 bg-[#7C65C1] rounded-lg flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm10 2H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3zm-5 3a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6zM18.5 6.5a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 0 1 2.2 0z"
                      fill="white"
                    />
                  </svg>
                </div>
                <span className="text-[#666] font-outfit text-sm">
                  @{connectionStatus.username || 'vitalik.eth'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Small Zora icon */}
                <div className="w-6 h-6 bg-black rounded-md flex items-center justify-center">
                  <img src="/zorb.svg" alt="Zora" className="w-4 h-4" />
                </div>
                <span className={`font-outfit text-sm ${connectionStatus.isConnected ? 'text-green-600' : 'text-[#999]'}`}>
                  {connectionStatus.isConnected ? 'Connected' : 'Not connected'}
                </span>
              </div>
            </div>

            {/* Connect Button */}
            <button
              onClick={() => connectionStatus.isConnected ? router.push("/pickandcast") : setIsModalOpen(true)}
              className={`w-full text-white font-outfit text-lg font-medium py-4 rounded-2xl mb-4 transition-all duration-200 ${
                connectionStatus.isConnected 
                  ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg' 
                  : 'bg-black hover:bg-gray-800'
              }`}
            >
              {connectionStatus.isConnected ? 'Go to Pick & Cast' : 'Connect'}
            </button>

            {/* Description */}
            <p className="text-[#666] font-outfit text-sm text-center leading-relaxed">
              {connectionStatus.isConnected 
                ? `Connected as @${connectionStatus.username}. Ready to cast your posts to Zora!`
                : "To get started, connect your Insta account to Zora. We'll fetch your posts automatically once it's linked."
              }
            </p>
          </div>
        </div>

        {/* Connection Modal */}
        <ConnectionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onConnect={handleConnect}
        />
      </div>
    </div>
  );
}
