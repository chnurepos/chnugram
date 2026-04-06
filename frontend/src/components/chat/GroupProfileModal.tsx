import { useState, useRef } from 'react';
import { chatsApi, usersApi } from '../../services/api';
import { useChatStore } from '../../stores/chatStore';
import { getAvatarUrl, formatLastSeen } from '../../utils/helpers';
import Avatar from '../ui/Avatar';
import type { Chat, User } from '../../types';

interface GroupProfileModalProps {
  chat: Chat;
  currentUserId: string;
  onClose: () => void;
  onMemberClick: (userId: string) => void;
}

type View = 'main' | 'edit' | 'add';

export default function GroupProfileModal({ chat, currentUserId, onClose, onMemberClick }: GroupProfileModalProps) {
  const { onlineUsers, setChats, chats, setActiveChat } = useChatStore();
  const [view, setView] = useState<View>('main');
  const [name, setName] = useState(chat.name ?? '');
  const [description, setDescription] = useState(chat.description ?? '');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [localAvatarUrl, setLocalAvatarUrl] = useState<string | undefined>(getAvatarUrl(chat.avatarUrl));
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Add member search
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  const myRole = chat.members.find(m => m.userId === currentUserId)?.role;
  const isOwner = myRole === 'owner';
  const isAdmin = myRole === 'admin' || isOwner;
  const memberIds = new Set(chat.members.map(m => m.userId));

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setAvatarUploading(true);
    try {
      const res = await chatsApi.updateChatAvatar(chat.id, file);
      const url = getAvatarUrl(res.data.data ?? undefined);
      setLocalAvatarUrl(url);
      setChats(chats.map(c => c.id === chat.id ? { ...c, avatarUrl: res.data.data ?? undefined } : c));
    } catch (err) { console.error(err); }
    finally { setAvatarUploading(false); }
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await chatsApi.updateChat(chat.id, { name: name.trim(), description: description.trim() || undefined });
      setChats(chats.map(c => c.id === chat.id ? { ...c, name: name.trim(), description: description.trim() || undefined } : c));
      setView('main');
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try {
      await chatsApi.deleteChat(chat.id);
      setChats(chats.filter(c => c.id !== chat.id));
      setActiveChat(null);
      onClose();
    } catch (err) { console.error(err); setDeleting(false); }
  };

  const handleLeave = async () => {
    try {
      await chatsApi.removeMember(chat.id, currentUserId);
      setChats(chats.filter(c => c.id !== chat.id));
      setActiveChat(null);
      onClose();
    } catch (err) { console.error(err); }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      await chatsApi.removeMember(chat.id, userId);
      setChats(chats.map(c => c.id === chat.id ? { ...c, members: c.members.filter(m => m.userId !== userId) } : c));
    } catch (err) { console.error(err); }
  };

  const handleSearch = async (q: string) => {
    setSearchQ(q);
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await usersApi.search(q);
      setSearchResults((res.data.data?.items ?? []).filter(u => !memberIds.has(u.id)));
    } catch { setSearchResults([]); }
    finally { setSearching(false); }
  };

  const handleAddMember = async (userId: string) => {
    setAddingId(userId);
    try {
      await chatsApi.addMember(chat.id, userId);
      const added = searchResults.find(u => u.id === userId);
      if (added) {
        setChats(chats.map(c => c.id === chat.id ? {
          ...c,
          members: [...c.members, {
            userId: added.id, username: added.username, displayName: added.displayName,
            avatarUrl: added.avatarUrl, role: 'member' as const, isOnline: added.isOnline,
            joinedAt: new Date().toISOString(), lastSeenAt: added.lastSeenAt,
          }],
        } : c));
        setSearchResults(prev => prev.filter(u => u.id !== userId));
      }
    } catch (err) { console.error(err); }
    finally { setAddingId(null); }
  };

  const onlineCount = chat.members.filter(m => onlineUsers.has(m.userId) || m.isOnline).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center fade-in"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
      onMouseDown={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-sm mx-0 sm:mx-4 sm:rounded-2xl slide-up"
        style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-lg)', maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: '20px 20px 0 0' }}
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2 flex-shrink-0">
          {view !== 'main' ? (
            <button onClick={() => setView('main')} className="p-1.5 rounded-xl transition-colors" style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = ''; }}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          ) : <div className="w-8" />}
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {view === 'edit' ? 'Редагувати групу' : view === 'add' ? 'Додати учасників' : 'Група'}
          </span>
          <button onClick={onClose} className="p-1.5 rounded-xl transition-colors" style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = ''; }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* ── MAIN VIEW ── */}
          {view === 'main' && (
            <>
              {/* Avatar + name */}
              <div className="flex flex-col items-center px-6 pt-2 pb-5">
                <div className="relative mb-3">
                  <div className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center shadow-lg" style={{ background: 'var(--accent)' }}>
                    {avatarUploading
                      ? <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : localAvatarUrl
                        ? <img src={localAvatarUrl} alt="" className="w-full h-full object-cover" />
                        : <span className="text-white text-3xl font-bold">{(chat.name ?? 'G')[0].toUpperCase()}</span>
                    }
                  </div>
                  {isOwner && (
                    <button
                      onClick={() => avatarInputRef.current?.click()}
                      className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-colors"
                      style={{ background: 'var(--accent)', color: '#000' }}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                  )}
                  <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </div>
                <h2 className="text-xl font-bold text-center mb-0.5" style={{ color: 'var(--text-primary)' }}>{chat.name ?? 'Група'}</h2>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {chat.members.length} учасників{onlineCount > 0 ? `, ${onlineCount} онлайн` : ''}
                </p>
                {chat.description && (
                  <p className="text-sm text-center mt-2" style={{ color: 'var(--text-secondary)' }}>{chat.description}</p>
                )}
              </div>

              {/* Action buttons row */}
              <div className="flex justify-center gap-4 px-4 pb-5">
                {isAdmin && (
                  <ActionBtn icon={
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  } label="Редагувати" onClick={() => setView('edit')} />
                )}
                {isAdmin && (
                  <ActionBtn icon={
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                  } label="Додати" onClick={() => setView('add')} />
                )}
                {isOwner && (
                  <ActionBtn icon={
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  } label="Видалити" onClick={handleDelete} danger />
                )}
                {!isOwner && (
                  <ActionBtn icon={
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  } label="Вийти" onClick={handleLeave} danger />
                )}
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: 'var(--border-real)', margin: '0 0 4px' }} />

              {/* Members list */}
              <div className="px-2 pb-4">
                <p className="px-3 pt-3 pb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  {chat.members.length} учасників
                </p>
                {chat.members.map(m => {
                  const isOnline = onlineUsers.has(m.userId) || m.isOnline;
                  const isSelf = m.userId === currentUserId;
                  return (
                    <div key={m.userId} className="flex items-center gap-3 px-3 py-2 rounded-xl transition-colors"
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = ''; }}
                    >
                      <button onClick={() => !isSelf && onMemberClick(m.userId)} className="flex items-center gap-3 flex-1 min-w-0 text-left" style={{ cursor: isSelf ? 'default' : 'pointer' }}>
                        <Avatar src={getAvatarUrl(m.avatarUrl)} name={m.displayName} size="md" isOnline={isOnline} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{m.displayName}{isSelf ? ' (ви)' : ''}</p>
                          <p className="text-xs truncate" style={{ color: isOnline ? 'var(--online)' : 'var(--text-muted)' }}>
                            {isOnline ? 'онлайн' : `був(ла) ${formatLastSeen(m.lastSeenAt)}`}
                          </p>
                        </div>
                      </button>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {m.role !== 'member' && (
                          <span className="text-xs px-1.5 py-0.5 rounded-md" style={{
                            background: m.role === 'owner' ? 'rgba(253,203,110,0.15)' : 'var(--accent-muted)',
                            color: m.role === 'owner' ? '#e67e22' : 'var(--accent)',
                          }}>
                            {m.role === 'owner' ? 'Власник' : 'Адмін'}
                          </span>
                        )}
                        {isAdmin && !isSelf && m.role !== 'owner' && (
                          <button onClick={() => handleRemoveMember(m.userId)} className="p-1 rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }}
                            onMouseEnter={e => { e.currentTarget.style.color = '#e74c3c'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {isOwner && confirmDelete && (
                  <div className="mx-3 mt-3 p-3 rounded-xl text-sm text-center" style={{ background: 'rgba(231,76,60,0.1)', color: '#e74c3c' }}>
                    Натисніть ще раз «Видалити» для підтвердження
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── EDIT VIEW ── */}
          {view === 'edit' && (
            <div className="px-6 py-4 flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Назва групи</label>
                <input value={name} onChange={e => setName(e.target.value)} className="input-field" placeholder="Назва групи" />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Опис</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} className="input-field resize-none" placeholder="Опис (необов'язково)" rows={4} />
              </div>
              <button onClick={handleSave} disabled={saving || !name.trim()} className="btn-primary py-3">
                {saving ? 'Збереження...' : 'Зберегти'}
              </button>
            </div>
          )}

          {/* ── ADD MEMBERS VIEW ── */}
          {view === 'add' && (
            <div className="px-4 py-3">
              <div className="relative mb-3">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none w-4 h-4" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input value={searchQ} onChange={e => handleSearch(e.target.value)} className="input-field pl-9" placeholder="Пошук..." autoFocus />
              </div>
              {searching && (
                <div className="flex justify-center py-6">
                  <div className="animate-spin w-5 h-5 border-2 rounded-full" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
                </div>
              )}
              {!searching && searchResults.map(u => (
                <div key={u.id} className="flex items-center gap-3 px-1 py-2 rounded-xl transition-colors"
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = ''; }}
                >
                  <Avatar src={getAvatarUrl(u.avatarUrl)} name={u.displayName} size="md" isOnline={u.isOnline} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{u.displayName}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {u.isOnline ? 'онлайн' : `був(ла) ${formatLastSeen(u.lastSeenAt)}`}
                    </p>
                  </div>
                  <button onClick={() => handleAddMember(u.id)} disabled={addingId === u.id}
                    className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                    style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}
                  >
                    {addingId === u.id
                      ? <div className="w-3.5 h-3.5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
                      : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    }
                  </button>
                </div>
              ))}
              {!searching && searchQ && searchResults.length === 0 && (
                <p className="text-center text-sm py-6" style={{ color: 'var(--text-muted)' }}>Нікого не знайдено</p>
              )}
              {!searchQ && (
                <p className="text-center text-sm py-6" style={{ color: 'var(--text-muted)' }}>Введіть ім'я або юзернейм</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionBtn({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 transition-colors"
      style={{ minWidth: 60 }}
    >
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center transition-colors"
        style={{ background: danger ? 'rgba(231,76,60,0.1)' : 'var(--accent-muted)', color: danger ? '#e74c3c' : 'var(--accent)' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.8'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
      >
        {icon}
      </div>
      <span className="text-xs font-medium" style={{ color: danger ? '#e74c3c' : 'var(--text-secondary)' }}>{label}</span>
    </button>
  );
}
