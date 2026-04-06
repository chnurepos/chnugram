import { useEffect, useRef } from 'react';
import { useMessageStore } from '../../stores/messageStore';
import { useReadMessages } from '../../hooks/useReadMessages';
import MessageItem from './MessageItem';
import { isToday, isYesterday, format } from 'date-fns';
import { uk } from 'date-fns/locale';
import type { Message } from '../../types';

interface MessageListProps {
  chatId: string;
  currentUserId: string;
  isLoading: boolean;
  onAvatarClick?: (userId: string) => void;
  allMessages?: Message[]; // full message map for reply preview
}

export default function MessageList({ chatId, currentUserId, isLoading, onAvatarClick, allMessages }: MessageListProps) {
  const { getMessages, isSendingMessage } = useMessageStore();
  const messages = getMessages(chatId);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isFirstLoad = useRef(true);
  const { observe } = useReadMessages(currentUserId);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      if (isFirstLoad.current) {
        bottomRef.current?.scrollIntoView({ behavior: 'instant' });
        isFirstLoad.current = false;
      } else {
        const lastMsg = messages[messages.length - 1];
        if (lastMsg.senderId === currentUserId) {
          bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        } else {
          const container = containerRef.current;
          if (container) {
            const { scrollTop, scrollHeight, clientHeight } = container;
            if (scrollHeight - scrollTop - clientHeight < 150) {
              bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
            }
          }
        }
      }
    }
  }, [messages.length, currentUserId]);

  useEffect(() => {
    isFirstLoad.current = true;
  }, [chatId]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: 'var(--bg-chat)' }}>
        <div className="animate-spin w-8 h-8 border-4 border-t-transparent rounded-full" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-sm" style={{ background: 'var(--bg-chat)' }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-sm" style={{ background: 'var(--bg-card)' }}>
          <svg className="w-8 h-8" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>Поки що немає повідомлень</p>
        <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Напишіть перше повідомлення!</p>
      </div>
    );
  }

  const grouped = groupByDate(messages);
  // Build message map for reply preview
  const msgMap = new Map(messages.map(m => [m.id, m]));

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-3" style={{ background: 'var(--bg-chat)' }}>
      {Object.entries(grouped).map(([dateLabel, msgs]) => (
        <div key={dateLabel}>
          <div className="flex items-center justify-center my-4">
            <span className="text-xs px-3 py-1 rounded-full font-medium" style={{ background: 'var(--bg-date-pill)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
              {dateLabel}
            </span>
          </div>

          {msgs.map((msg, idx) => {
            const prevMsg = idx > 0 ? msgs[idx - 1] : null;
            const nextMsg = idx < msgs.length - 1 ? msgs[idx + 1] : null;
            const isOwn = msg.senderId === currentUserId;
            const showAvatar = !isOwn && (!nextMsg || nextMsg.senderId !== msg.senderId);
            const showSenderName = !isOwn && (!prevMsg || prevMsg.senderId !== msg.senderId);
            const shouldMarkRead = !isOwn && !msg.isDeleted && !msg.readBy.includes(currentUserId) && !isSendingMessage(msg.id);
            const replyToMsg = msg.replyToId ? (msgMap.get(msg.replyToId) ?? null) : null;

            return (
              <MessageItem
                key={msg.id}
                message={msg}
                isOwn={isOwn}
                showAvatar={showAvatar}
                showSenderName={showSenderName}
                currentUserId={currentUserId}
                isSending={isSendingMessage(msg.id)}
                onAvatarClick={onAvatarClick}
                shouldMarkRead={shouldMarkRead}
                onObserve={observe}
                replyToMessage={replyToMsg}
              />
            );
          })}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

function groupByDate<T extends { sentAt: string }>(messages: T[]): Record<string, T[]> {
  const groups: Record<string, T[]> = {};
  for (const msg of messages) {
    const date = new Date(msg.sentAt);
    let key: string;
    if (isToday(date)) key = 'Сьогодні';
    else if (isYesterday(date)) key = 'Вчора';
    else key = format(date, 'd MMMM yyyy', { locale: uk });
    if (!groups[key]) groups[key] = [];
    groups[key].push(msg);
  }
  return groups;
}
