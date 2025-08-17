'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (username: string, privateKey: string) => void;
}

export default function ConnectionModal({ isOpen, onClose, onConnect }: ConnectionModalProps) {
  const [username, setUsername] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [errors, setErrors] = useState<{ username?: string; privateKey?: string }>({});

  const validateForm = () => {
    const newErrors: { username?: string; privateKey?: string } = {};
    
    if (!username.trim()) {
      newErrors.username = 'Username is required';
    } else if (username.trim().length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }
    
    if (!privateKey.trim()) {
      newErrors.privateKey = 'Private key is required';
    } else if (privateKey.trim().length < 10) {
      newErrors.privateKey = 'Private key must be at least 10 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConnect = async () => {
    if (!validateForm()) return;
    
    setIsConnecting(true);
    try {
      // Simulate connection delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      onConnect(username.trim(), privateKey.trim());
    } finally {
      setIsConnecting(false);
    }
  };

  const handleClose = () => {
    if (isConnecting) return;
    setUsername('');
    setPrivateKey('');
    setErrors({});
    setShowPrivateKey(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={handleClose}
          >
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="text-center mb-8">
                <h2 className="text-2xl font-outfit font-semibold text-[#1a1a1a] mb-2">
                  Connect 
                </h2>
              </div>

              {/* Form */}
              <div className="space-y-6">
                {/* Username Input */}
                <div>
                  <label className="block text-sm font-outfit font-medium text-[#333] mb-2">
                    Instagram Username
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        if (errors.username) setErrors(prev => ({ ...prev, username: undefined }));
                      }}
                      placeholder="Enter your username"
                      className={`w-full px-4 py-3 rounded-xl border-2 font-outfit text-base transition-all duration-200 focus:outline-none ${
                        errors.username
                          ? 'border-red-300 focus:border-red-500 bg-red-50'
                          : 'border-gray-200 focus:border-[#7C65C1] bg-gray-50 focus:bg-white'
                      }`}
                      disabled={isConnecting}
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#7C65C1]">
                      @
                    </div>
                  </div>
                  {errors.username && (
                    <p className="text-red-500 text-sm font-outfit mt-1">{errors.username}</p>
                  )}
                </div>

                {/* Private Key Input */}
                <div>
                  <label className="block text-sm font-outfit font-medium text-[#333] mb-2">
                    Private Key
                  </label>
                  <div className="relative">
                    <input
                      type={showPrivateKey ? 'text' : 'password'}
                      value={privateKey}
                      onChange={(e) => {
                        setPrivateKey(e.target.value);
                        if (errors.privateKey) setErrors(prev => ({ ...prev, privateKey: undefined }));
                      }}
                      placeholder="Enter your private key"
                      className={`w-full px-4 py-3 pr-12 rounded-xl border-2 font-outfit text-base transition-all duration-200 focus:outline-none ${
                        errors.privateKey
                          ? 'border-red-300 focus:border-red-500 bg-red-50'
                          : 'border-gray-200 focus:border-[#7C65C1] bg-gray-50 focus:bg-white'
                      }`}
                      disabled={isConnecting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPrivateKey(!showPrivateKey)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#666] hover:text-[#7C65C1] transition-colors"
                      disabled={isConnecting}
                    >
                      {showPrivateKey ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <path d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7z" stroke="currentColor" strokeWidth="2" fill="none"/>
                          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" fill="none"/>
                          <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <path d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7z" stroke="currentColor" strokeWidth="2" fill="none"/>
                          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" fill="none"/>
                        </svg>
                      )}
                    </button>
                  </div>
                  {errors.privateKey && (
                    <p className="text-red-500 text-sm font-outfit mt-1">{errors.privateKey}</p>
                  )}
                </div>

                {/* Security Notice */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 text-amber-600 mt-0.5">
                      <svg viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-amber-800 text-sm font-outfit font-medium">
                        Your credentials are secure
                      </p>
                      <p className="text-amber-700 text-xs font-outfit mt-1">
                        We encrypt and store your information safely. Your private key is never shared.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-8">
                <button
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-[#7C65C1] to-[#9B7FE8] text-white font-outfit font-medium hover:shadow-lg hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                >
                  {isConnecting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Connecting...
                    </>
                  ) : (
                    'Connect'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
