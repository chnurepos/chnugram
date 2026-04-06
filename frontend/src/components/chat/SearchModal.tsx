import { useState, useCallback } from 'react';
import { usersApi, chatsApi } from '../../services/api';
import { useChatStore } from '../../stores/chatStore';
import { useAuthStore } from '../../stores/authStore';
import Avatar from '../ui/Avatar';
import type { User } from '../../types';

interface SearchModalProps {
  onClose: () => void;
}

export default function SearchModal({ onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { chats, addChat, setActiveChat } = useChatStore();
  const { user } = useAuthStore();

  const handleSearch = useCallback(async (q: string) => {
    setQuery(q);
    if (q.length < 2) { setResults([]); return; }
    setIsSearching(true);
    try {
      const response = await usersApi.search(q);
      const users = response.data.data?.items ?? [];
      setResults(users.filter(u => u.id !== user?.id));
    } catch {}
    finally { setIsSearching(false); }
  }, [user?.id]);

  const handleOpenChat = async (selectedUser: User) => {
    const existingChat = chats.find(c =>
      c.type === 'private' && c.members.some(m => m.userId === selectedUser.id)
    );
    if (existingChat) { setActiveChat(existingChat.id); onClose(); return; }
    try {
      const response = await chatsApi.createChat({ type: 'private', memberIds: [selectedUser.id] });
      const chat = response.data.data!;
      addChat(chat);
      setActiveChat(chat.id);
      onClose();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      if (error?.response?.data?.message?.includes('already exists')) {
        const existingId = error.response?.data?.message?.match(/[0-9a-f-]{36}/)?.[0];
        if (existingId) { setActiveChat(existingId); onClose(); }
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 fade-in"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onMouseDown={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-2xl overflow-hidden slide-up" style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-lg)' }}
        onMouseDown={e => e.stopPropagation()}>
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5">
          <svg style={{ width: '16px', height: '16px', color: 'var(--text-muted)', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Пошук користувачів..."
            className="flex-1 outline-none text-sm bg-transparent"
            style={{ color: 'var(--text-primary)' }}
            autoFocus
          />
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl transition-colors flex-shrink-0"
            style={{ background: 'var(--bg-input)', color: 'var(--text-muted)' }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {isSearching ? (
            <div className="flex justify-center py-6">
              <div className="animate-spin w-5 h-5 border-2 rounded-full" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
            </div>
          ) : results.length > 0 ? (
            <div className="p-2 space-y-0.5">
              {results.map(u => (
                <button
                  key={u.id}
                  onClick={() => handleOpenChat(u)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors"
                  style={{ color: 'var(--text-primary)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                >
                  <Avatar src={u.avatarUrl} name={u.displayName} size="md" isOnline={u.isOnline} />
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{u.displayName}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>@{u.username}</p>
                  </div>
                  {u.isOnline && (
                    <span className="text-xs font-medium" style={{ color: 'var(--online)' }}>онлайн</span>
                  )}
                </button>
              ))}
            </div>
          ) : query.length >= 2 ? (
            <p className="text-center py-6 text-sm" style={{ color: 'var(--text-muted)' }}>Нікого не знайдено</p>
          ) : (
            <p className="text-center py-6 text-sm" style={{ color: 'var(--text-muted)' }}>Введіть щонайменше 2 символи</p>
          )}
        </div>
      </div>
    </div>
  );
}
