import { useCallback, useRef } from 'react';
import { sendTyping, sendStopTyping } from '../services/signalr';

export function useTyping(chatId: string) {
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTyping = useRef(false);

  const onType = useCallback(async () => {
    if (!isTyping.current) {
      isTyping.current = true;
      await sendTyping(chatId).catch(() => {});
    }

    if (typingTimeout.current) {
      clearTimeout(typingTimeout.current);
    }

    typingTimeout.current = setTimeout(async () => {
      isTyping.current = false;
      await sendStopTyping(chatId).catch(() => {});
    }, 3000);
  }, [chatId]);

  const onBlur = useCallback(async () => {
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    if (isTyping.current) {
      isTyping.current = false;
      await sendStopTyping(chatId).catch(() => {});
    }
  }, [chatId]);

  return { onType, onBlur };
}
