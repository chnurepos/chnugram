import { useState, useRef, useCallback, useEffect } from 'react';
import { messagesApi } from '../../services/api';
import { useMessageStore } from '../../stores/messageStore';
import { useAuthStore } from '../../stores/authStore';
import { useTyping } from '../../hooks/useTyping';
import EmojiPanel from './EmojiPanel';
import type { Message } from '../../types';

interface MessageInputProps {
  chatId: string;
}

const MAX_LENGTH = 4096;

export default function MessageInput({ chatId }: MessageInputProps) {
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [sendAnim, setSendAnim] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const { replyTo, setReplyTo, addSendingMessage, confirmSentMessage } = useMessageStore();
  const { user } = useAuthStore();
  const { onType, onBlur } = useTyping(chatId);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = useCallback(async () => {
    const trimmed = content.trim();
    if (!trimmed && files.length === 0) return;
    if (isSending) return;
    if (trimmed.length > MAX_LENGTH) return;

    setIsSending(true);
    setSendAnim(true);
    setContent('');
    setFiles([]);
    onBlur();
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    if (fileInputRef.current) fileInputRef.current.value = '';

    const tempId = `temp-${Date.now()}`;
    const tempMsg = {
      id: tempId,
      chatId,
      senderId: user?.id ?? '',
      senderUsername: user?.username ?? '',
      senderDisplayName: user?.displayName ?? '',
      senderAvatarUrl: user?.avatarUrl,
      replyToId: replyTo?.id,
      type: (files.length > 0 ? 'file' : 'text') as 'text' | 'file',
      content: trimmed || undefined,
      isEdited: false,
      isDeleted: false,
      sentAt: new Date().toISOString(),
      attachments: [],
      reactions: [],
      readBy: [],
    };
    addSendingMessage(tempMsg);
    const savedReplyTo = replyTo;
    setReplyTo(null);

    try {
      const response = await messagesApi.sendMessage(
        chatId,
        { content: trimmed || undefined, type: files.length > 0 ? 'file' : 'text', replyToId: savedReplyTo?.id },
        files.length > 0 ? files : undefined
      );
      confirmSentMessage(tempId, response.data.data!);
    } catch (err) {
      console.error('Failed to send message:', err);
      confirmSentMessage(tempId, { ...tempMsg, isDeleted: true });
    } finally {
      setIsSending(false);
    }
  }, [content, files, chatId, replyTo, isSending, user, setReplyTo, addSendingMessage, confirmSentMessage, onBlur]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    onType();
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(prev => [...prev, ...Array.from(e.target.files ?? [])]);
    e.target.value = '';
  };

  const handleEmojiSelect = (emoji: string) => {
    const ta = textareaRef.current;
    if (ta) {
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const next = content.slice(0, start) + emoji + content.slice(end);
      setContent(next);
      setTimeout(() => {
        ta.selectionStart = ta.selectionEnd = start + emoji.length;
        ta.focus();
      }, 0);
    } else {
      setContent(c => c + emoji);
    }
    onType();
  };

  useEffect(() => {
    if (!sendAnim) return;
    const t = setTimeout(() => setSendAnim(false), 600);
    return () => clearTimeout(t);
  }, [sendAnim]);

  const hasContent = content.trim() || files.length > 0;
  const isOverLimit = content.length > MAX_LENGTH;

  return (
    <div style={{ background: 'var(--bg-header)', borderTop: '1px solid var(--border-real)' }}>
      {/* Reply preview */}
      {replyTo && (
        <div className="px-4 pt-2">
          <ReplyPreview message={replyTo} onCancel={() => setReplyTo(null)} />
        </div>
      )}

      {/* File previews */}
      {files.length > 0 && (
        <div className="flex gap-2 px-4 pt-2 flex-wrap">
          {files.map((file, i) => (
            <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm" style={{ background: 'var(--accent-muted)', border: '1px solid var(--accent)' }}>
              <svg className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              <span className="max-w-[120px] truncate text-xs font-medium" style={{ color: 'var(--accent)' }}>{file.name}</span>
              <button onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))} style={{ color: 'var(--text-muted)' }}>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main input row */}
      <div className="flex items-end gap-2 px-3 py-2.5">
        {/* Attach button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors mb-0.5"
          style={{ color: 'var(--text-muted)', background: 'var(--bg-input)' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-muted)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'var(--bg-input)'; }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </button>
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange}
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar" />

        {/* Pill input */}
        <div
          className="flex-1 flex items-end rounded-3xl px-4 py-2 transition-all"
          style={{ background: 'var(--bg-input)', minHeight: '40px' }}
        >
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            onBlur={onBlur}
            placeholder="Написати повідомлення..."
            className="flex-1 bg-transparent resize-none outline-none text-sm leading-5 py-0.5"
            style={{ maxHeight: '120px', color: 'var(--text-primary)' } as React.CSSProperties}
            rows={1}
          />
          {content.length > 3800 && (
            <span className="text-xs flex-shrink-0 mb-0.5 ml-2 font-mono" style={{ color: isOverLimit ? '#e74c3c' : 'var(--text-muted)' }}>
              {MAX_LENGTH - content.length}
            </span>
          )}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1 mb-0.5 flex-shrink-0">
          {/* Emoji toggle */}
          <button
            onClick={() => setShowEmoji(v => !v)}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
            style={{
              color: showEmoji ? 'var(--accent)' : 'var(--text-muted)',
              background: showEmoji ? 'var(--accent-muted)' : 'var(--bg-input)',
            }}
            onMouseEnter={e => { if (!showEmoji) { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-muted)'; } }}
            onMouseLeave={e => { if (!showEmoji) { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'var(--bg-input)'; } }}
          >
            <svg className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          {/* Send */}
          <button
            onClick={handleSend}
            disabled={isSending || !hasContent || isOverLimit}
            className={`w-9 h-9 rounded-full flex items-center justify-center overflow-hidden relative transition-all ${sendAnim ? 'send-pulse' : ''}`}
            style={{
              background: hasContent ? 'var(--accent)' : 'var(--bg-input)',
              color: hasContent ? '#000' : 'var(--text-muted)',
              boxShadow: hasContent ? '0 2px 12px rgba(0,184,148,0.35)' : 'none',
            }}
            onMouseEnter={e => { if (hasContent) e.currentTarget.style.transform = 'scale(1.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; }}
          >
            {isSending
              ? <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              : <span className={`flex items-center justify-center ${sendAnim ? 'send-fly' : ''}`} style={{ display: 'flex' }}>
                  <svg className="w-4 h-4" style={{ transform: 'rotate(-40deg) translateX(1px)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </span>
            }
          </button>
        </div>
      </div>

      {showEmoji && (
        <EmojiPanel
          onEmojiSelect={handleEmojiSelect}
          onClose={() => setShowEmoji(false)}
        />
      )}
    </div>
  );
}

function ReplyPreview({ message, onCancel }: { message: Message; onCancel: () => void }) {
  return (
    <div
      className="flex items-center gap-2 mb-1 px-3 py-2 rounded-xl"
      style={{ background: 'var(--accent-muted)', borderLeft: '3px solid var(--accent)' }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>{message.senderDisplayName}</p>
        <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
          {message.content ?? (message.attachments.length > 0 ? '📎 Файл' : '')}
        </p>
      </div>
      <button onClick={onCancel} className="p-1 rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }}>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
