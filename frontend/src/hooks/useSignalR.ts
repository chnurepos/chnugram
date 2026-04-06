import { useEffect, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';
import { startConnection, stopConnection } from '../services/signalr';

export function useSignalR() {
  const { isAuthenticated } = useAuthStore();
  const started = useRef(false);

  useEffect(() => {
    if (isAuthenticated && !started.current) {
      started.current = true;
      startConnection().catch(console.error);
    }

    if (!isAuthenticated && started.current) {
      started.current = false;
      stopConnection().catch(console.error);
    }

    return () => {
      // Don't stop on unmount of individual components - only stop on logout
    };
  }, [isAuthenticated]);
}
