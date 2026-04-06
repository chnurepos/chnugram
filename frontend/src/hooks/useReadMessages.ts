import { useEffect, useRef, useCallback } from 'react';
import { messagesApi } from '../services/api';
import { useMessageStore } from '../stores/messageStore';

/**
 * Observes message elements and marks them as read when they become visible.
 * Call `observe(messageId, element)` for each message that the current user hasn't read.
 */
export function useReadMessages(currentUserId: string) {
  const pendingRef = useRef<Map<string, Element>>(new Map());
  const { markMessageRead } = useMessageStore();

  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const messageId = (entry.target as HTMLElement).dataset.messageId;
            if (!messageId) continue;
            observerRef.current?.unobserve(entry.target);
            pendingRef.current.delete(messageId);
            // Mark as read in backend + local store
            messagesApi.markRead(messageId).catch(() => {});
            markMessageRead(messageId, currentUserId);
          }
        }
      },
      { threshold: 0.5 }
    );

    return () => {
      observerRef.current?.disconnect();
    };
  }, [currentUserId, markMessageRead]);

  const observe = useCallback((messageId: string, el: Element | null) => {
    if (!el || !observerRef.current) return;
    if (pendingRef.current.has(messageId)) return;
    pendingRef.current.set(messageId, el);
    observerRef.current.observe(el);
  }, []);

  const unobserve = useCallback((messageId: string) => {
    const el = pendingRef.current.get(messageId);
    if (el && observerRef.current) {
      observerRef.current.unobserve(el);
      pendingRef.current.delete(messageId);
    }
  }, []);

  return { observe, unobserve };
}
