import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChatStore } from '../../stores/chatStore';
import { useAuthStore } from '../../stores/authStore';
import { authApi } from '../../services/api';
import { getAvatarUrl, getChatName, getChatAvatar, formatChatTime } from '../../utils/helpers';
import { getCustomContact } from '../chat/UserProfileModal';
import Avatar from '../ui/Avatar';
import NewChatModal from '../chat/NewChatModal';
import SearchModal from '../chat/SearchModal';
import SettingsPanel from './SettingsPanel';
import type { Chat } from '../../types';
import { stopConnection } from '../../services/signalr';

interface SidebarProps {
  onProfileClick: () => void;
}

export default function Sidebar({ onProfileClick }: SidebarProps) {
  const { chats, activeChatId, setActiveChat, isLoadingChats, onlineUsers } = useChatStore();
  const { user, refreshToken, logout } = useAuthStore();
  const [showNewChat, setShowNewChat] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const handleLogout = async () => {
    try { if (refreshToken) await authApi.logout(refreshToken); } catch {}
    await stopConnection();
    logout();
    navigate('/login');
  };

  const filteredChats = search.trim()
    ? chats.filter(c => getChatName(c, user?.id ?? '').toLowerCase().includes(search.toLowerCase()))
    : chats;

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-sidebar)' }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <h1 className="truncate" style={{ color: 'var(--accent)', fontFamily: "'Space Mono', monospace", fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase' }}>// CHNUgram</h1>
        </div>
        <div className="flex items-center gap-0.5">
          <IconBtn onClick={() => setShowSearch(true)}>
            <svg className="w-4.5 h-4.5" style={{width:'18px',height:'18px'}} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </IconBtn>
          <IconBtn onClick={() => setShowNewChat(true)}>
            <svg style={{width:'18px',height:'18px'}} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </IconBtn>
        </div>
      </div>

      {/* Search filter */}
      <div className="px-3 py-2">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2" style={{width:'14px',height:'14px',color:'var(--text-muted)'}} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Пошук..."
            className="w-full pl-8 pr-3 py-2 rounded-xl text-sm outline-none transition-all"
            style={{ background: 'var(--bg-input)', color: 'var(--text-primary)' }}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
              <svg style={{width:'13px',height:'13px'}} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {isLoadingChats ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin w-5 h-5 border-2 rounded-full" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="p-8 text-center">
            <svg className="w-10 h-10 mx-auto mb-3 opacity-20" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{search ? 'Нічого не знайдено' : 'Немає чатів'}</p>
          </div>
        ) : (
          <div className="py-1 px-2">
            {filteredChats.map(chat => (
              <ChatItem
                key={chat.id}
                chat={chat}
                currentUserId={user?.id ?? ''}
                isActive={chat.id === activeChatId}
                onClick={() => setActiveChat(chat.id)}
                onlineUsers={onlineUsers}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-2">
        <div className="flex items-center gap-1 px-2 py-1.5 rounded-xl" style={{ background: 'var(--bg-hover)' }}>
          <button
            onClick={onProfileClick}
            className="flex items-center gap-2.5 flex-1 min-w-0"
          >
            <Avatar src={getAvatarUrl(user?.avatarUrl)} name={user?.displayName ?? '?'} size="sm" isOnline />
            <div className="flex-1 text-left min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{user?.displayName}</p>
              <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>@{user?.username}</p>
            </div>
          </button>
          <IconBtn onClick={() => setShowSettings(true)}>
            <svg style={{width:'16px',height:'16px'}} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </IconBtn>
          <IconBtn onClick={handleLogout}>
            <svg style={{width:'16px',height:'16px'}} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </IconBtn>
        </div>
      </div>

      {showNewChat && <NewChatModal onClose={() => setShowNewChat(false)} />}
      {showSearch && <SearchModal onClose={() => setShowSearch(false)} />}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  );
}

function IconBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="p-2 rounded-xl transition-colors flex-shrink-0"
      style={{ color: 'var(--text-muted)' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)', e.currentTarget.style.color = 'var(--accent)')}
      onMouseLeave={e => (e.currentTarget.style.background = '', e.currentTarget.style.color = 'var(--text-muted)')}
    >
      {children}
    </button>
  );
}

interface ChatItemProps {
  chat: Chat;
  currentUserId: string;
  isActive: boolean;
  onClick: () => void;
  onlineUsers: Set<string>;
}

function ChatItem({ chat, currentUserId, isActive, onClick, onlineUsers }: ChatItemProps) {
  const { typingUsers } = useChatStore();
  const typingInChat = typingUsers[chat.id] ?? [];

  const otherMember = chat.type === 'private'
    ? chat.members.find(m => m.userId !== currentUserId)
    : null;

  const custom = otherMember ? getCustomContact(otherMember.userId) : null;
  const rawName = getChatName(chat, currentUserId);
  const chatName = (chat.type === 'private' && custom?.customName) ? custom.customName : rawName;
  const rawAvatar = getChatAvatar(chat, currentUserId);
  const avatarUrl = (chat.type === 'private' && custom?.customAvatarUrl) ? custom.customAvatarUrl : rawAvatar;
  const isOtherOnline = otherMember ? (onlineUsers.has(otherMember.userId) || otherMember.isOnline) : false;

  const lastMessageText = typingInChat.length > 0
    ? `${typingInChat[0].username} друкує...`
    : chat.lastMessage?.isDeleted
      ? 'Повідомлення видалено'
      : chat.lastMessage?.content ?? (chat.lastMessage?.attachments?.length ? '📎 Файл' : '');

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left mb-0.5"
      style={{
        background: isActive ? 'var(--bg-active)' : 'transparent',
      }}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)'; }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
    >
      <div className="relative flex-shrink-0">
        <Avatar src={avatarUrl} name={chatName} size="md" isOnline={chat.type === 'private' ? isOtherOnline : undefined} />
        {chat.type === 'group' && (
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center border-2" style={{ background: 'var(--accent)', borderColor: 'var(--bg-sidebar)' }}>
            <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
            </svg>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-sm font-semibold truncate" style={{ color: isActive ? 'var(--accent)' : 'var(--text-primary)' }}>{chatName}</span>
          {chat.lastMessage && (
            <span className="text-xs flex-shrink-0 ml-2" style={{ color: 'var(--text-muted)' }}>
              {formatChatTime(chat.lastMessage.sentAt)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs truncate flex-1" style={{ color: typingInChat.length > 0 ? 'var(--accent)' : 'var(--text-muted)', fontStyle: typingInChat.length > 0 ? 'italic' : 'normal' }}>
            {lastMessageText || 'Немає повідомлень'}
          </span>
          {chat.unreadCount > 0 && (
            <span className="ml-2 flex-shrink-0 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 font-medium" style={{ background: 'var(--accent)', fontSize: '10px' }}>
              {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
