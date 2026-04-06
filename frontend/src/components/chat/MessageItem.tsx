import { useState, useRef, useEffect, useCallback } from 'react';
import { formatMessageTime, formatFileSize, getAvatarUrl, getChatName, getChatAvatar } from '../../utils/helpers';
import { messagesApi } from '../../services/api';
import { useMessageStore } from '../../stores/messageStore';
import { useChatStore } from '../../stores/chatStore';
import { useAuthStore } from '../../stores/authStore';
import Avatar from '../ui/Avatar';
import type { Message } from '../../types';

interface MessageItemProps {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
  showSenderName: boolean;
  currentUserId: string;
  isSending?: boolean;
  onAvatarClick?: (userId: string) => void;
  shouldMarkRead?: boolean;
  onObserve?: (messageId: string, el: Element | null) => void;
  replyToMessage?: Message | null;
}

export default function MessageItem({
  message, isOwn, showAvatar, showSenderName, currentUserId,
  isSending, onAvatarClick, shouldMarkRead, onObserve, replyToMessage
}: MessageItemProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content ?? '');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [heartPos, setHeartPos] = useState<{ x: number; y: number } | null>(null);
  const { setReplyTo, setForwardMessage } = useMessageStore();
  const bubbleRef = useRef<HTMLDivElement>(null);
  const itemRef = useRef<HTMLDivElement>(null);
  const lastTap = useRef(0);

  // Register for intersection observer (read receipts)
  useEffect(() => {
    if (shouldMarkRead && onObserve) {
      onObserve(message.id, itemRef.current);
    }
  }, [shouldMarkRead, onObserve, message.id]);

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    const handler = (e: MouseEvent) => {
      setContextMenu(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [contextMenu]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setHeartPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setTimeout(() => setHeartPos(null), 700);
    // Add heart reaction
    messagesApi.addReaction(message.id, '❤️').catch(() => {});
  }, [message.id]);

  // Mobile double-tap support
  const handleTouchEnd = useCallback(() => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      messagesApi.addReaction(message.id, '❤️').catch(() => {});
    }
    lastTap.current = now;
  }, [message.id]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const handleReaction = async (emoji: string) => {
    // Backend handles toggle+replace atomically — one call only
    await messagesApi.addReaction(message.id, emoji).catch(() => {});
  };

  const handleEdit = async () => {
    if (!editContent.trim()) return;
    await messagesApi.editMessage(message.id, editContent).catch(console.error);
    setIsEditing(false);
  };

  const reactionGroups = message.reactions.reduce<Record<string, { count: number; hasOwn: boolean }>>((acc, r) => {
    if (!acc[r.emoji]) acc[r.emoji] = { count: 0, hasOwn: false };
    acc[r.emoji].count++;
    if (r.userId === currentUserId) acc[r.emoji].hasOwn = true;
    return acc;
  }, {});

  // Deleted message — hide completely for "delete for me" (handled via isDeleted flag)
  if (message.isDeleted) {
    return null; // fully hidden — no "повідомлення видалено"
  }

  return (
    <>
      <div
        ref={itemRef}
        data-message-id={message.id}
        className={`flex items-end gap-1.5 mb-0.5 group msg-enter ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
      >
        {/* Avatar */}
        <div className="w-8 flex-shrink-0 mb-0.5">
          {showAvatar && !isOwn && (
            <button onClick={() => onAvatarClick?.(message.senderId)}>
              <Avatar src={getAvatarUrl(message.senderAvatarUrl)} name={message.senderDisplayName} size="sm" />
            </button>
          )}
        </div>

        {/* Bubble column */}
        <div className={`max-w-[72%] sm:max-w-sm lg:max-w-md flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
          {/* Sender name */}
          {showSenderName && !isOwn && (
            <button
              onClick={() => onAvatarClick?.(message.senderId)}
              className="text-xs font-semibold mb-1 ml-1 hover:underline"
              style={{ color: stringToColor(message.senderDisplayName) }}
            >
              {message.senderDisplayName}
            </button>
          )}

          {/* Reply preview */}
          {replyToMessage && (
            <div
              className={`text-xs mb-1 px-3 py-1.5 rounded-xl border-l-2 max-w-full ${isOwn ? 'border-white/40' : ''}`}
              style={{
                borderLeftColor: isOwn ? 'rgba(255,255,255,0.5)' : 'var(--accent)',
                background: isOwn ? 'rgba(255,255,255,0.15)' : 'var(--accent-muted)',
              }}
            >
              <p className="font-semibold truncate" style={{ color: isOwn ? 'rgba(255,255,255,0.9)' : 'var(--accent)' }}>
                {replyToMessage.senderDisplayName}
              </p>
              <p className="truncate opacity-80">
                {replyToMessage.content || (replyToMessage.attachments.length > 0 ? '📎 Файл' : '')}
              </p>
            </div>
          )}

          {/* Bubble */}
          <div className="relative" ref={bubbleRef}>
            <div
              className={`relative ${isOwn ? 'chat-bubble-own' : 'chat-bubble-other'}`}
              onContextMenu={handleContextMenu}
              onDoubleClick={handleDoubleClick}
              onTouchEnd={handleTouchEnd}
            >
              {/* Heart pop animation */}
              {heartPos && (
                <div
                  className="heart-pop absolute text-2xl pointer-events-none select-none z-20"
                  style={{ left: heartPos.x - 12, top: heartPos.y - 12 }}
                >
                  ❤️
                </div>
              )}

              {/* Attachments */}
              {message.attachments.map(att => (
                <AttachmentPreview key={att.id} attachment={att} isOwn={isOwn} />
              ))}

              {/* Text / Edit */}
              {isEditing ? (
                <div className="flex flex-col gap-2 min-w-[200px]">
                  <textarea
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    className="rounded-lg p-1.5 text-sm resize-none outline-none leading-5"
                    style={{ background: 'rgba(255,255,255,0.2)' }}
                    rows={2}
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEdit(); } if (e.key === 'Escape') setIsEditing(false); }}
                  />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setIsEditing(false)} className="text-xs opacity-70 hover:opacity-100 px-2 py-1">Скасувати</button>
                    <button onClick={handleEdit} className="text-xs font-semibold px-2 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.2)' }}>Зберегти</button>
                  </div>
                </div>
              ) : (
                message.content && (
                  <p className="text-sm leading-5 whitespace-pre-wrap break-words">{message.content}</p>
                )
              )}

              {/* Time & status */}
              <div className="flex items-center gap-1 mt-0.5 justify-end">
                {message.isEdited && <span className="text-xs opacity-50">ред.</span>}
                <span className="text-xs opacity-55">{formatMessageTime(message.sentAt)}</span>
                {isOwn && <ReadStatus message={message} currentUserId={currentUserId} isSending={isSending} />}
              </div>
            </div>
          </div>

          {/* Reactions */}
          {Object.entries(reactionGroups).length > 0 && (
            <div className={`flex gap-1 mt-1 flex-wrap ${isOwn ? 'justify-end' : 'justify-start'}`}>
              {Object.entries(reactionGroups).map(([emoji, { count, hasOwn }]) => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  className="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs transition-all hover:scale-105"
                  style={{
                    background: hasOwn ? 'var(--accent-muted)' : 'var(--bg-card)',
                    color: hasOwn ? 'var(--accent)' : 'var(--text-secondary)',
                  }}
                >
                  <span>{emoji}</span>
                  {count > 1 && <span className="font-medium">{count}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <MessageContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          message={message}
          isOwn={isOwn}
          currentUserId={currentUserId}
          onClose={() => setContextMenu(null)}
          onReply={() => { setReplyTo(message); setContextMenu(null); }}
          onEdit={() => { setIsEditing(true); setContextMenu(null); }}
          onDelete={() => { setShowDeleteModal(true); setContextMenu(null); }}
          onForward={() => { setShowForwardModal(true); setContextMenu(null); }}
          onReaction={(emoji) => { handleReaction(emoji); setContextMenu(null); }}
        />
      )}

      {/* Delete modal */}
      {showDeleteModal && (
        <DeleteModal
          messageId={message.id}
          isOwn={isOwn}
          onClose={() => setShowDeleteModal(false)}
        />
      )}

      {/* Forward modal */}
      {showForwardModal && (
        <ForwardModal
          message={message}
          onClose={() => setShowForwardModal(false)}
        />
      )}
    </>
  );
}

// ─── Context Menu ─────────────────────────────────────────────
const QUICK_EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '🔥', '👏', '🙏'];

function MessageContextMenu({ x, y, message, isOwn, currentUserId, onClose, onReply, onEdit, onDelete, onForward, onReaction }: {
  x: number; y: number; message: Message; isOwn: boolean; currentUserId: string;
  onClose: () => void; onReply: () => void; onEdit: () => void; onDelete: () => void;
  onForward: () => void; onReaction: (e: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Smart positioning — flip left/up if near viewport edge
  const MENU_W = 210;
  const MENU_H = 290;
  const left = x + MENU_W > window.innerWidth - 8 ? x - MENU_W : x;
  const top = y + MENU_H > window.innerHeight - 8 ? y - MENU_H : y;
  const style: React.CSSProperties = {
    position: 'fixed',
    zIndex: 100,
    left: Math.max(8, left),
    top: Math.max(8, top),
  };

  return (
    <div
      ref={ref}
      className="slide-up rounded-2xl py-1.5 min-w-[190px] select-none"
      style={{ ...style, background: 'var(--bg-card)', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)' }}
      onMouseDown={e => e.stopPropagation()}
    >
      {/* Quick reactions */}
      <div className="flex gap-1 px-3 py-2">
        {QUICK_EMOJIS.map(emoji => {
          const hasOwn = message.reactions.some(r => r.userId === currentUserId && r.emoji === emoji);
          return (
            <button
              key={emoji}
              onClick={() => onReaction(emoji)}
              className="text-xl transition-transform hover:scale-125 active:scale-110 relative"
            >
              {emoji}
              {hasOwn && (
                <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <MenuBtn icon="↩️" label="Відповісти" onClick={onReply} />
      <MenuBtn icon="↗️" label="Переслати" onClick={onForward} />
      {isOwn && <MenuBtn icon="✏️" label="Редагувати" onClick={onEdit} />}
      <div style={{ height: '1px', background: 'var(--border)', margin: '4px 12px' }} />
      <MenuBtn icon="🗑️" label="Видалити" onClick={onDelete} danger />
    </div>
  );
}

function MenuBtn({ icon, label, onClick, danger }: { icon: string; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-2 text-sm flex items-center gap-2.5 transition-colors"
      style={{ color: danger ? '#e74c3c' : 'var(--text-secondary)' }}
      onMouseEnter={e => { e.currentTarget.style.background = danger ? 'rgba(231,76,60,0.08)' : 'var(--bg-hover)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = ''; }}
    >
      <span className="text-base w-5 text-center">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

// ─── Delete Modal ────────────────────────────────────────────
function DeleteModal({ messageId, isOwn, onClose }: { messageId: string; isOwn: boolean; onClose: () => void }) {
  const { deleteMessage, deleteMessageForMe } = useMessageStore();

  const deleteForEveryone = async () => {
    await messagesApi.deleteMessage(messageId).catch(console.error);
    onClose();
  };

  const deleteForMeOnly = () => {
    deleteMessageForMe(messageId);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center fade-in"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onMouseDown={e => e.target === e.currentTarget && onClose()}
    >
      <div className="rounded-2xl p-6 w-80 slide-up" style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-lg)' }}
        onMouseDown={e => e.stopPropagation()}>
        <h3 className="text-base font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Видалити повідомлення?</h3>
        <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>Це дію не можна скасувати.</p>
        <div className="flex flex-col gap-2">
          <button
            onClick={deleteForMeOnly}
            className="w-full py-2.5 rounded-xl text-sm font-medium transition-colors"
            style={{ background: 'var(--bg-input)', color: 'var(--text-primary)' }}
          >
            Видалити тільки у мене
          </button>
          {isOwn && (
            <button
              onClick={deleteForEveryone}
              className="w-full py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={{ background: 'rgba(231,76,60,0.1)', color: '#e74c3c' }}
            >
              Видалити для всіх
            </button>
          )}
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm font-medium"
            style={{ color: 'var(--text-muted)' }}
          >
            Скасувати
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Forward Modal ───────────────────────────────────────────
function ForwardModal({ message, onClose }: { message: Message; onClose: () => void }) {
  const { chats } = useChatStore();
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState<string | null>(null);

  const filtered = chats.filter(c =>
    getChatName(c, user?.id ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const forward = async (chatId: string) => {
    setSending(chatId);
    await messagesApi.sendMessage(chatId, { content: message.content, type: 'text' }).catch(console.error);
    setSending(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center fade-in"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onMouseDown={e => e.target === e.currentTarget && onClose()}
    >
      <div className="rounded-2xl w-80 overflow-hidden slide-up" style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-lg)', maxHeight: '70vh' }}
        onMouseDown={e => e.stopPropagation()}>
        <div className="p-4">
          <h3 className="font-bold text-base mb-3" style={{ color: 'var(--text-primary)' }}>Переслати у чат</h3>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Пошук чату..."
            className="w-full px-3 py-2 rounded-xl text-sm outline-none"
            style={{ background: 'var(--bg-input)', color: 'var(--text-primary)' }}
          />
        </div>
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(70vh - 100px)' }}>
          {filtered.map(chat => {
            const name = getChatName(chat, user?.id ?? '');
            const avatar = getChatAvatar(chat, user?.id ?? '');
            return (
              <button
                key={chat.id}
                onClick={() => forward(chat.id)}
                disabled={sending === chat.id}
                className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                style={{ color: 'var(--text-primary)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = ''; }}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium overflow-hidden flex-shrink-0" style={{ background: 'var(--accent)' }}>
                  {avatar ? <img src={avatar} alt="" className="w-full h-full object-cover" /> : name[0]?.toUpperCase()}
                </div>
                <span className="text-sm font-medium flex-1 truncate">{name}</span>
                {sending === chat.id && (
                  <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Read Status ────────────────────────────────────────────
function ReadStatus({ message, currentUserId, isSending }: { message: Message; currentUserId: string; isSending?: boolean }) {
  const othersRead = message.readBy.filter(id => id !== currentUserId).length > 0;

  if (isSending) {
    return (
      <svg className="w-3.5 h-3.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <circle cx="12" cy="12" r="9" strokeWidth={2} />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 7v5l3 3" />
      </svg>
    );
  }
  if (othersRead) {
    return (
      <svg className="w-4 h-3" viewBox="0 0 20 14" fill="none" stroke="rgba(255,255,255,0.9)">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M1 7l4 4L13 1" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M7 7l4 4L19 1" />
      </svg>
    );
  }
  return (
    <svg className="w-3.5 h-3.5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}

// ─── Attachment ──────────────────────────────────────────────
function AttachmentPreview({ attachment, isOwn }: {
  attachment: { id: string; fileName: string; filePath: string; fileSize: number; mimeType: string };
  isOwn: boolean;
}) {
  const isImage = attachment.mimeType.startsWith('image/');
  const isVideo = attachment.mimeType.startsWith('video/');
  const url = attachment.filePath.startsWith('http') ? attachment.filePath : `/${attachment.filePath}`;

  if (isImage) {
    return (
      <div className="mb-2 rounded-xl overflow-hidden">
        <img src={url} alt={attachment.fileName} className="max-w-full max-h-64 object-contain rounded-xl" loading="lazy" />
      </div>
    );
  }
  if (isVideo) {
    return (
      <div className="mb-2 rounded-xl overflow-hidden">
        <video
          src={url}
          controls
          className="max-w-full max-h-64 rounded-xl"
          style={{ display: 'block' }}
          preload="metadata"
        />
      </div>
    );
  }
  return (
    <a href={url} download={attachment.fileName} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-2 mb-2 p-2.5 rounded-xl transition-colors"
      style={{ background: isOwn ? 'rgba(255,255,255,0.15)' : 'var(--bg-input)' }}>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: isOwn ? 'rgba(255,255,255,0.2)' : 'var(--accent-muted)' }}>
        <svg className="w-5 h-5" style={{ color: isOwn ? 'white' : 'var(--accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium truncate">{attachment.fileName}</p>
        <p className="text-xs opacity-60">{formatFileSize(attachment.fileSize)}</p>
      </div>
    </a>
  );
}

function stringToColor(str: string): string {
  const colors = ['#e74c3c','#8e44ad','#2980b9','#16a085','#27ae60','#e67e22','#795548','#546e7a'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}
