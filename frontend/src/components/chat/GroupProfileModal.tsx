import { useState } from 'react';
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

export default function GroupProfileModal({ chat, currentUserId, onClose, onMemberClick }: GroupProfileModalProps) {
  const { onlineUsers, setChats, chats, setActiveChat } = useChatStore();
  const [tab, setTab] = useState<'info' | 'members' | 'add'>('info');
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(chat.name ?? '');
  const [description, setDescription] = useState(chat.description ?? '');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Add member search
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  const myRole = chat.members.find(m => m.userId === currentUserId)?.role;
  const isOwner = myRole === 'owner';
  const isAdmin = myRole === 'admin' || isOwner;

  const memberIds = new Set(chat.members.map(m => m.userId));

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await chatsApi.updateChat(chat.id, { name: name.trim(), description: description.trim() || undefined });
      setChats(chats.map(c => c.id === chat.id ? { ...c, name: name.trim(), description: description.trim() || undefined } : c));
      setEditing(false);
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
            userId: added.id,
            username: added.username,
            displayName: added.displayName,
            avatarUrl: added.avatarUrl,
            role: 'member',
            isOnline: added.isOnline,
            joinedAt: new Date().toISOString(),
            lastSeenAt: added.lastSeenAt,
          }],
        } : c));
        setSearchResults(prev => prev.filter(u => u.id !== userId));
      }
    } catch (err) { console.error(err); }
    finally { setAddingId(null); }
  };

  const avatarUrl = getAvatarUrl(chat.avatarUrl);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center fade-in"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onMouseDown={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-sm mx-4 rounded-2xl slide-up"
        style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-lg)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Header — no overflow:hidden so avatar can overlap */}
        <div className="relative flex-shrink-0 px-4 pt-3 pb-0" style={{ background: 'var(--bg-input)' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono tracking-widest" style={{ color: 'var(--text-muted)' }}>// ГРУПА</span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl transition-colors"
              style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {/* Avatar row — sits at bottom of header, hangs over content */}
          <div className="flex items-end justify-between" style={{ marginBottom: -32 }}>
            <div className="w-20 h-20 rounded-full overflow-hidden shadow-lg flex items-center justify-center flex-shrink-0 relative z-10" style={{ background: 'var(--accent)', border: '3px solid var(--bg-card)' }}>
              {avatarUrl
                ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                : <span className="text-white text-2xl font-bold">{(chat.name ?? 'G')[0].toUpperCase()}</span>
              }
            </div>
            {isAdmin && !editing && (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium mb-8 relative z-10"
                style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Редагувати
              </button>
            )}
            {editing && (
              <div className="flex gap-2 mb-8 relative z-10">
                <button
                  onClick={() => { setEditing(false); setName(chat.name ?? ''); setDescription(chat.description ?? ''); }}
                  className="px-3 py-1.5 rounded-xl text-sm font-medium"
                  style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}
                >
                  Скасувати
                </button>
                <button onClick={handleSave} disabled={saving || !name.trim()} className="btn-primary px-3 py-1.5 text-sm">
                  {saving ? '...' : 'Зберегти'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 pt-10 pb-2">
          {editing ? (
            <div className="flex flex-col gap-2 mb-4">
              <input value={name} onChange={e => setName(e.target.value)} className="input-field" placeholder="Назва групи" />
              <textarea value={description} onChange={e => setDescription(e.target.value)} className="input-field resize-none" placeholder="Опис (необов'язково)" rows={3} />
            </div>
          ) : (
            <>
              <h3 className="text-xl font-bold mb-0.5" style={{ color: 'var(--text-primary)' }}>{chat.name ?? 'Група'}</h3>
              {chat.description && <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>{chat.description}</p>}
              <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>{chat.members.length} учасників</p>
            </>
          )}

          {/* Tabs */}
          <div className="flex mb-3 border-b" style={{ borderColor: 'var(--border-real)' }}>
            {(['info', 'members', ...(isAdmin ? ['add'] : [])] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t as typeof tab)}
                className="flex-1 py-2 text-xs font-semibold uppercase tracking-wider transition-colors"
                style={{
                  color: tab === t ? 'var(--accent)' : 'var(--text-muted)',
                  borderBottom: `2px solid ${tab === t ? 'var(--accent)' : 'transparent'}`,
                }}
              >
                {t === 'info' ? 'Інфо' : t === 'members' ? 'Учасники' : 'Додати'}
              </button>
            ))}
          </div>

          {tab === 'info' && (
            <div className="space-y-1 mb-4">
              <InfoRow label="Тип" value="Група" />
              <InfoRow label="Учасників" value={String(chat.members.length)} />
              <InfoRow label="Онлайн" value={String(chat.members.filter(m => onlineUsers.has(m.userId) || m.isOnline).length)} />
            </div>
          )}

          {tab === 'members' && (
            <div className="space-y-0.5 mb-4">
              {chat.members.map(m => {
                const isOnline = onlineUsers.has(m.userId) || m.isOnline;
                const isSelf = m.userId === currentUserId;
                return (
                  <div key={m.userId} className="flex items-center gap-3 px-1 py-2 rounded-xl transition-colors"
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = ''; }}
                  >
                    <button onClick={() => !isSelf && onMemberClick(m.userId)} className="flex items-center gap-3 flex-1 min-w-0 text-left" style={{ cursor: isSelf ? 'default' : 'pointer' }}>
                      <Avatar src={getAvatarUrl(m.avatarUrl)} name={m.displayName} size="sm" isOnline={isOnline} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{m.displayName}{isSelf ? ' (ви)' : ''}</p>
                        <p className="text-xs truncate" style={{ color: isOnline ? 'var(--online)' : 'var(--text-muted)' }}>
                          {isOnline ? 'онлайн' : `був(ла) ${formatLastSeen(m.lastSeenAt)}`}
                        </p>
                      </div>
                    </button>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
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
            </div>
          )}

          {tab === 'add' && (
            <div className="mb-4">
              <div className="relative mb-3">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none w-4 h-4" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  value={searchQ}
                  onChange={e => handleSearch(e.target.value)}
                  className="input-field pl-9"
                  placeholder="Пошук користувачів..."
                  autoFocus
                />
              </div>
              {searching && (
                <div className="flex justify-center py-4">
                  <div className="animate-spin w-5 h-5 border-2 rounded-full" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
                </div>
              )}
              {!searching && searchResults.map(u => (
                <div key={u.id} className="flex items-center gap-3 px-1 py-2 rounded-xl transition-colors"
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = ''; }}
                >
                  <Avatar src={getAvatarUrl(u.avatarUrl)} name={u.displayName} size="sm" isOnline={u.isOnline} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{u.displayName}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>@{u.username}</p>
                  </div>
                  <button
                    onClick={() => handleAddMember(u.id)}
                    disabled={addingId === u.id}
                    className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors"
                    style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}
                  >
                    {addingId === u.id ? '...' : 'Додати'}
                  </button>
                </div>
              ))}
              {!searching && searchQ && searchResults.length === 0 && (
                <p className="text-center text-sm py-4" style={{ color: 'var(--text-muted)' }}>Нікого не знайдено</p>
              )}
            </div>
          )}
        </div>

        {/* Bottom actions */}
        <div className="px-6 py-3 flex-shrink-0 flex flex-col gap-2" style={{ borderTop: '1px solid var(--border-real)' }}>
          {!isOwner && (
            <button onClick={handleLeave} className="w-full py-2 rounded-xl text-sm font-medium transition-colors"
              style={{ color: '#e74c3c', background: 'rgba(231,76,60,0.07)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(231,76,60,0.14)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(231,76,60,0.07)'; }}
            >
              Вийти з групи
            </button>
          )}
          {isOwner && (
            <button onClick={handleDelete} disabled={deleting} className="w-full py-2 rounded-xl text-sm font-medium transition-colors"
              style={{ color: '#e74c3c', background: confirmDelete ? 'rgba(231,76,60,0.18)' : 'rgba(231,76,60,0.07)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(231,76,60,0.14)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = confirmDelete ? 'rgba(231,76,60,0.18)' : 'rgba(231,76,60,0.07)'; }}
            >
              {deleting ? 'Видалення...' : confirmDelete ? 'Підтвердити видалення' : 'Видалити групу'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1.5 px-1">
      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{value}</span>
    </div>
  );
}
