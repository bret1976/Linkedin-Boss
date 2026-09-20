import { useState, useEffect, useCallback } from 'react';
import { LinkedInStatus, LinkedInProfile, LinkedInPostResult } from '../types/linkedin';

export interface ConnectOptions {
  type?: 'quick-session' | 'cookie' | 'profile-url';
  cookie?: string;
  profileUrl?: string;
  name?: string;
  headline?: string;
}

export function useLinkedIn() {
  const [status, setStatus] = useState<LinkedInStatus>({
    connected: false,
    profile: null,
    agentReachActive: true
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch('/api/linkedin/status');
      if (!res.ok) {
        throw new Error(`Failed to check LinkedIn status (${res.status})`);
      }
      const data: LinkedInStatus = await res.json();
      setStatus(data);
      if (data.error) {
        setError(data.error);
      }
    } catch (err: any) {
      console.error('Failed to check LinkedIn status:', err);
      setError(err.message || 'Error checking status');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const connect = useCallback(async (options: ConnectOptions) => {
    try {
      setIsConnecting(true);
      setError(null);

      const res = await fetch('/api/linkedin/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to connect LinkedIn account');
      }

      await checkStatus();
      return data.profile as LinkedInProfile;
    } catch (err: any) {
      setError(err.message || 'Failed to initiate connection');
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, [checkStatus]);

  const disconnect = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/linkedin/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to disconnect account');
      }
      await checkStatus();
      return true;
    } catch (err: any) {
      setError(err.message || 'Disconnect failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [checkStatus]);

  const publishPost = useCallback(async (text: string, imageBase64?: string): Promise<LinkedInPostResult> => {
    try {
      const res = await fetch('/api/linkedin/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          imageBase64
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to publish post to LinkedIn');
      }

      return {
        success: true,
        shareUrl: data.shareUrl,
        postText: data.postText,
        imageUrl: data.imageUrl,
        data
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to post' };
    }
  }, []);

  return {
    status,
    isLoading,
    isConnecting,
    error,
    checkStatus,
    connect,
    disconnect,
    publishPost
  };
}

