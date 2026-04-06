import { useState } from 'react';
import { usersApi, chatsApi } from '../../services/api';
import { useChatStore } from '../../stores/chatStore';
import { useAuthStore } from '../../stores/authStore';
import Avatar from '../ui/Avatar';
import type { User } from '../../types';

interface NewChatModalProps {
  onClose: () => void;
}

export default function NewChatModal({ onClose }: NewChatModalProps) {
  const [mode, setMode] = useState<'private' | 'group'>('private');
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [groupName, setGroupName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const { addChat, setActiveChat } = useChatStore();
  const { user } = useAuthStore();

  const handleSearch = async (query: string) => {
    setSearch(query);
    if (query.length < 2) { setSearchResults([]); return; }
    setIsSearching(true);
    try {
      const response = await usersApi.search(query);
      const results = response.data.data?.items ?? [];
      setSearchResults(results.filter(u => u.id !== user?.id));
    } catch {}
    finally { setIsSearching(false); }
  };

  const toggleUser = (selectedUser: User) => {
    if (mode === 'private') {
      setSelectedUsers([selectedUser]);
    } else {
      setSelectedUsers(prev =>
        prev.some(u => u.id === selectedUser.id)
          ? prev.filter(u => u.id !== selectedUser.id)
          : [...prev, selectedUser]
      );
    }
  };

  const handleCreate = async () => {
    if (selectedUsers.length === 0) return;
    if (mode === 'group' && !groupName.trim()) return;
    setIsCreating(true);
    try {
      const response = await chatsApi.createChat({
        type: mode,
        name: mode === 'group' ? groupName : undefined,
        memberIds: selectedUsers.map(u => u.id),
      });
      const chat = response.data.data!;
      addChat(chat);
      setActiveChat(chat.id);
      onClose();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      alert(error?.response?.data?.message ?? 'Помилка створення чату');
    } finally { setIsCreating(false); }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 fade-in"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onMouseDown={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-2xl overflow-hidden slide-up" style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-lg)' }}
        onMouseDown={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Новий чат</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl transition-colors"
            style={{ background: 'var(--bg-input)', color: 'var(--text-muted)' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4">
          {/* Mode selector */}
          <div className="flex rounded-xl p-1 mb-4" style={{ background: 'var(--bg-input)' }}>
            <button
              onClick={() => { setMode('private'); setSelectedUsers([]); }}
              className="flex-1 py-1.5 text-sm font-medium rounded-lg transition-all"
              style={{
                background: mode === 'private' ? 'var(--bg-card)' : 'transparent',
                color: mode === 'private' ? 'var(--accent)' : 'var(--text-muted)',
                boxShadow: mode === 'private' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              Приватний
            </button>
            <button
              onClick={() => setMode('group')}
              className="flex-1 py-1.5 text-sm font-medium rounded-lg transition-all"
              style={{
                background: mode === 'group' ? 'var(--bg-card)' : 'transparent',
                color: mode === 'group' ? 'var(--accent)' : 'var(--text-muted)',
                boxShadow: mode === 'group' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              Груповий
            </button>
          </div>

          {/* Group name */}
          {mode === 'group' && (
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Назва групи"
              className="input-field mb-4"
            />
          )}

          {/* Selected users */}
          {selectedUsers.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-3">
              {selectedUsers.map(u => (
                <div key={u.id} className="flex items-center gap-1 px-2.5 py-1 rounded-xl" style={{ background: 'var(--accent-muted)', border: '1px solid var(--accent)' }}>
                  <span className="text-xs font-medium" style={{ color: 'var(--accent)' }}>{u.displayName}</span>
                  <button onClick={() => toggleUser(u)} style={{ color: 'var(--accent)' }}>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Search */}
          <div className="relative mb-3">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2" style={{ width: '14px', height: '14px', color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Пошук за іменем або @username"
              className="input-field pl-9"
            />
          </div>

          {/* Results */}
          <div className="max-h-60 overflow-y-auto space-y-0.5 rounded-xl overflow-hidden">
            {isSearching ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin w-5 h-5 border-2 rounded-full" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map(u => (
                <button
                  key={u.id}
                  onClick={() => toggleUser(u)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors"
                  style={{
                    background: selectedUsers.some(s => s.id === u.id) ? 'var(--accent-muted)' : 'var(--bg-input)',
                  }}
                  onMouseEnter={e => { if (!selectedUsers.some(s => s.id === u.id)) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={e => { if (!selectedUsers.some(s => s.id === u.id)) e.currentTarget.style.background = 'var(--bg-input)'; }}
                >
                  <Avatar src={u.avatarUrl} name={u.displayName} size="sm" isOnline={u.isOnline} />
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{u.displayName}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>@{u.username}</p>
                  </div>
                  {selectedUsers.some(s => s.id === u.id) && (
                    <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'var(--accent)' }}>
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              ))
            ) : search.length >= 2 ? (
              <p className="text-center py-4 text-sm" style={{ color: 'var(--text-muted)' }}>Нікого не знайдено</p>
            ) : (
              <p className="text-center py-4 text-sm" style={{ color: 'var(--text-muted)' }}>Введіть ім'я або username</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-4 pb-4">
          <button onClick={onClose} className="btn-secondary flex-1">Скасувати</button>
          <button
            onClick={handleCreate}
            disabled={selectedUsers.length === 0 || (mode === 'group' && !groupName.trim()) || isCreating}
            className="btn-primary flex-1"
          >
            {isCreating ? 'Створюємо...' : 'Створити'}
          </button>
        </div>
      </div>
    </div>
  );
}
