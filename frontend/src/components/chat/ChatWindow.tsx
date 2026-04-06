import { useEffect, useRef, useState } from 'react';
import { useChatStore } from '../../stores/chatStore';
import { useMessageStore } from '../../stores/messageStore';
import { useAuthStore } from '../../stores/authStore';
import { messagesApi } from '../../services/api';
import { joinChat, leaveChat } from '../../services/signalr';
import { getChatName, getChatAvatar, formatLastSeen } from '../../utils/helpers';
import { getCustomContact } from './UserProfileModal';
import Avatar from '../ui/Avatar';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import UserProfileModal from './UserProfileModal';
import type { Chat } from '../../types';

interface ChatWindowProps {
  chatId: string;
}

export default function ChatWindow({ chatId }: ChatWindowProps) {
  const { chats, setActiveChat, typingUsers, onlineUsers } = useChatStore();
  const { setMessages, setLoading, setHasMore, isLoading } = useMessageStore();
  const { user } = useAuthStore();
  const previousChatId = useRef<string>('');
  const [profileUserId, setProfileUserId] = useState<string | null>(null);

  const chat = chats.find(c => c.id === chatId);
  const typingInChat = typingUsers[chatId] ?? [];

  useEffect(() => {
    if (!chatId) return;

    const loadMessages = async () => {
      setLoading(chatId, true);
      try {
        const response = await messagesApi.getMessages(chatId, 1, 50);
        const { items, hasMore } = response.data.data!;
        setMessages(chatId, items, true);
        setHasMore(chatId, hasMore);
      } catch (err) {
        console.error('Failed to load messages:', err);
      } finally {
        setLoading(chatId, false);
      }
    };

    if (previousChatId.current && previousChatId.current !== chatId) {
      leaveChat(previousChatId.current).catch(() => {});
    }

    previousChatId.current = chatId;
    joinChat(chatId).catch(() => {});
    loadMessages();
  }, [chatId, setLoading, setMessages, setHasMore]);

  if (!chat) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: 'var(--bg-chat)' }}>
        <div className="animate-spin w-8 h-8 border-4 border-t-transparent rounded-full" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  const otherMember = chat.type === 'private'
    ? chat.members.find(m => m.userId !== user?.id)
    : null;

  // Custom contact info
  const custom = otherMember ? getCustomContact(otherMember.userId) : null;
  const rawName = getChatName(chat, user?.id ?? '');
  const chatName = (chat.type === 'private' && custom?.customName) ? custom.customName : rawName;
  const rawAvatar = getChatAvatar(chat, user?.id ?? '');
  const avatarUrl = (chat.type === 'private' && custom?.customAvatarUrl) ? custom.customAvatarUrl : rawAvatar;

  const otherMemberIsOnline = otherMember ? onlineUsers.has(otherMember.userId) || otherMember.isOnline : false;
  const onlineCount = chat.members.filter(m => m.userId !== user?.id && (onlineUsers.has(m.userId) || m.isOnline)).length;

  const statusText = typingInChat.length > 0
    ? `${typingInChat.map(u => u.username).join(', ')} друкує...`
    : otherMember
    ? (otherMemberIsOnline ? 'онлайн' : `був(ла) ${formatLastSeen(otherMember?.userId ? undefined : undefined)}`)
    : `${onlineCount} онлайн`;

  const isStatusOnline = typingInChat.length === 0 && (otherMemberIsOnline || onlineCount > 0);

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-chat)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2.5" style={{ background: 'var(--bg-header)', boxShadow: 'var(--shadow-sm)' }}>
        <button
          onClick={() => setActiveChat(null)}
          className="md:hidden p-1.5 rounded-xl transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = ''}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <button
          onClick={() => otherMember && setProfileUserId(otherMember.userId)}
          className={otherMember ? 'cursor-pointer' : 'cursor-default'}
        >
          <Avatar src={avatarUrl} name={chatName} size="md" isOnline={otherMember ? otherMemberIsOnline : undefined} />
        </button>

        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-sm truncate leading-tight" style={{ color: 'var(--text-primary)', fontFamily: "inherit" }}>{chatName}</h2>
          <p className="text-xs truncate leading-tight" style={{
            color: typingInChat.length > 0 ? 'var(--accent)' : isStatusOnline ? 'var(--online)' : 'var(--text-muted)',
            fontStyle: typingInChat.length > 0 ? 'italic' : 'normal',
          }}>
            {statusText}
          </p>
        </div>

        <ChatActions chat={chat} currentUserId={user?.id ?? ''} onMemberClick={setProfileUserId} />
      </div>

      {/* Messages */}
      <MessageList
        chatId={chatId}
        currentUserId={user?.id ?? ''}
        isLoading={isLoading[chatId] ?? false}
        onAvatarClick={setProfileUserId}
      />

      {/* Message Input */}
      <MessageInput chatId={chatId} />

      {/* User Profile Modal */}
      {profileUserId && (
        <UserProfileModal
          userId={profileUserId}
          onClose={() => setProfileUserId(null)}
        />
      )}
    </div>
  );
}

function ChatActions({ chat, currentUserId, onMemberClick }: { chat: Chat; currentUserId: string; onMemberClick: (userId: string) => void }) {
  const [showMembers, setShowMembers] = useState(false);
  const { onlineUsers } = useChatStore();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMembers) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowMembers(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMembers]);

  if (chat.type === 'private') return null;

  return (
    <div className="relative flex items-center gap-1" ref={panelRef}>
      <button
        onClick={() => setShowMembers(v => !v)}
        className="p-2 rounded-xl transition-colors"
        style={{ color: showMembers ? 'var(--accent)' : 'var(--text-muted)', background: showMembers ? 'var(--accent-muted)' : '' }}
        onMouseEnter={e => { if (!showMembers) { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--accent)'; } }}
        onMouseLeave={e => { if (!showMembers) { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--text-muted)'; } }}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
      {showMembers && (
        <div className="absolute right-0 top-full mt-2 z-30 rounded-2xl w-64 py-2 max-h-80 overflow-y-auto slide-up"
          style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)' }}>
          <p className="text-xs font-semibold uppercase px-4 pb-2 pt-1 tracking-wide" style={{ color: 'var(--text-muted)' }}>{chat.members.length} учасників</p>
          {chat.members.map(m => {
            const isOnline = onlineUsers.has(m.userId) || m.isOnline;
            return (
              <button
                key={m.userId}
                onClick={() => { if (m.userId !== currentUserId) { onMemberClick(m.userId); setShowMembers(false); } }}
                className="w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left"
                style={{ cursor: m.userId === currentUserId ? 'default' : 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = ''; }}
              >
                <div className="relative">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-medium overflow-hidden flex-shrink-0" style={{ background: 'var(--accent)' }}>
                    {m.avatarUrl ? <img src={m.avatarUrl} alt="" className="w-full h-full object-cover" /> : m.displayName[0].toUpperCase()}
                  </div>
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2" style={{ background: isOnline ? 'var(--online)' : 'var(--text-muted)', borderColor: 'var(--bg-card)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {m.displayName}{m.userId === currentUserId ? ' (ви)' : ''}
                  </p>
                  <p className="text-xs truncate" style={{ color: isOnline ? 'var(--online)' : 'var(--text-muted)' }}>
                    {isOnline ? 'онлайн' : '@' + m.username}
                  </p>
                </div>
                {m.role !== 'member' && (
                  <span className="text-xs font-medium px-1.5 py-0.5 rounded-md" style={{
                    background: m.role === 'owner' ? 'rgba(253,203,110,0.2)' : 'var(--accent-muted)',
                    color: m.role === 'owner' ? '#e67e22' : 'var(--accent)',
                  }}>
                    {m.role === 'owner' ? 'Власник' : 'Адмін'}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
