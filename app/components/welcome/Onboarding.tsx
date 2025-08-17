import { useRouter } from "next/navigation";

export default function Onboarding() {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-[#e8e9eb] flex justify-center items-center p-4">
      <div className="w-full max-w-sm mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-[#A0A0A0] font-outfit text-lg font-normal">
            Connect Instagram account
          </h1>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-[32px] p-6 shadow-lg">
          {/* Feature Cards Section */}
          <div className="flex flex-col gap-4 mb-8">
            {/* X Posts to Farcaster */}
            <div className="flex items-center gap-3">
              <div className="flex-1 flex items-center bg-[#F3F3F4] rounded-3xl px-4 py-6 min-h-[80px]">
                <span className="text-[#494656] font-outfit text-base font-normal leading-[130%] tracking-[-0.16px]">
                  Insta Posts to Zora
                </span>
              </div>
              <div className="w-[80px] h-[80px] bg-black rounded-3xl flex items-center justify-center flex-shrink-0">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill="white"/>
                </svg>
              </div>
            </div>

            {/* Flat fees */}
          

            {/* Make edits in the app itself */}
            <div className="flex items-center gap-3">
            <div className="w-[80px] h-[80px] bg-[#7C65C1] rounded-3xl flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 1001 1001" width="32" height="32" aria-hidden="true" role="img">
                  <path d="M9 11H7v6h2v-6zm4 0h-2v6h2v-6zm4 0h-2v6h2v-6zm2.5-9H18V1h-2v1H8V1H6v1H4.5C3.67 2 3 2.67 3 3.5v15C3 19.33 3.67 20 4.5 20h15c.83 0 1.5-.67 1.5-1.5v-15C21 2.67 20.33 2 19.5 2zm0 16h-15v-12h15v12z" fill="white"/>
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
            {/* Profile and X Status */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#7C65C1] rounded-lg flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 11H7v6h2v-6zm4 0h-2v6h2v-6zm4 0h-2v6h2v-6zm2.5-9H18V1h-2v1H8V1H6v1H4.5C3.67 2 3 2.67 3 3.5v15C3 19.33 3.67 20 4.5 20h15c.83 0 1.5-.67 1.5-1.5v-15C21 2.67 20.33 2 19.5 2zm0 16h-15v-12h15v12z" fill="white"/>
                  </svg>
                </div>
                <span className="text-[#666] font-outfit text-sm">@vitalik.eth</span>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-black rounded-md flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill="white"/>
                  </svg>
                </div>
                <span className="text-[#999] font-outfit text-sm">Not connected</span>
              </div>
            </div>

            {/* Connect Button */}
            <button 
           onClick={() => router.push("/pickandcast")}
            className="w-full bg-black text-white font-outfit text-lg font-medium py-4 rounded-2xl mb-4 hover:bg-gray-800 transition-colors">
              Connect Instagram
            </button>

            {/* Description */}
            <p className="text-[#666] font-outfit text-sm text-center leading-relaxed">
              To get started, connect your Insta account to Farcaster. We'll fetch your posts automatically once it's linked.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
