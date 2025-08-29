import { useState, useCallback } from 'react';

interface InstagramWalletMapping {
  id: string;
  instagramUsername: string;
  walletAddress: string;
  createdAt: string;
  updatedAt: string;
}

interface UseInstagramWalletMappingReturn {
  // State
  isLoading: boolean;
  error: string | null;
  
  // Actions
  createOrUpdateMapping: (instagramUsername: string, walletAddress: string) => Promise<{ success: boolean; mapping?: InstagramWalletMapping; error?: string }>;
  getWalletAddress: (instagramUsername: string) => Promise<{ success: boolean; walletAddress?: string; error?: string }>;
  getInstagramUsername: (walletAddress: string) => Promise<{ success: boolean; instagramUsername?: string; error?: string }>;
  deleteMapping: (instagramUsername: string) => Promise<{ success: boolean; error?: string }>;
  
  // Clear error
  clearError: () => void;
}

export function useInstagramWalletMapping(): UseInstagramWalletMappingReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const createOrUpdateMapping = useCallback(async (
    instagramUsername: string, 
    walletAddress: string
  ): Promise<{ success: boolean; mapping?: InstagramWalletMapping; error?: string }> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/instagram-wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instagramUsername,
          walletAddress,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        return { success: true, mapping: data.mapping };
      } else {
        setError(data.error || 'Failed to create/update mapping');
        return { success: false, error: data.error };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getWalletAddress = useCallback(async (
    instagramUsername: string
  ): Promise<{ success: boolean; walletAddress?: string; error?: string }> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `/api/instagram-wallet?instagramUsername=${encodeURIComponent(instagramUsername)}`
      );
      
      const data = await response.json();
      
      if (data.success) {
        return { success: true, walletAddress: data.walletAddress };
      } else {
        setError(data.error || 'Failed to get wallet address');
        return { success: false, error: data.error };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getInstagramUsername = useCallback(async (
    walletAddress: string
  ): Promise<{ success: boolean; instagramUsername?: string; error?: string }> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `/api/instagram-wallet?walletAddress=${encodeURIComponent(walletAddress)}`
      );
      
      const data = await response.json();
      
      if (data.success) {
        return { success: true, instagramUsername: data.instagramUsername };
      } else {
        setError(data.error || 'Failed to get Instagram username');
        return { success: false, error: data.error };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteMapping = useCallback(async (
    instagramUsername: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `/api/instagram-wallet?instagramUsername=${encodeURIComponent(instagramUsername)}`,
        { method: 'DELETE' }
      );
      
      const data = await response.json();
      
      if (data.success) {
        return { success: true };
      } else {
        setError(data.error || 'Failed to delete mapping');
        return { success: false, error: data.error };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    createOrUpdateMapping,
    getWalletAddress,
    getInstagramUsername,
    deleteMapping,
    clearError,
  };
}
