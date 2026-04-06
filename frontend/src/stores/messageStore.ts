import { create } from 'zustand';
import type { Message } from '../types';

interface MessageState {
  messages: Record<string, Message[]>; // chatId -> messages
  sendingMessageIds: Set<string>; // temp IDs of messages being sent
  hiddenMessageIds: Set<string>; // locally hidden (delete for me)
  isLoading: Record<string, boolean>;
  hasMore: Record<string, boolean>;
  replyTo: Message | null;
  forwardMessage: Message | null;

  setMessages: (chatId: string, messages: Message[], replace?: boolean) => void;
  addMessage: (message: Message) => void;
  addSendingMessage: (message: Message) => void;
  confirmSentMessage: (tempId: string, realMessage: Message) => void;
  updateMessage: (message: Message) => void;
  deleteMessage: (messageId: string) => void;
  deleteMessageForMe: (messageId: string) => void;
  markMessageRead: (messageId: string, userId: string) => void;
  addReaction: (messageId: string, userId: string, emoji: string) => void;
  removeReaction: (messageId: string, userId: string, emoji: string) => void;
  setLoading: (chatId: string, loading: boolean) => void;
  setHasMore: (chatId: string, hasMore: boolean) => void;
  setReplyTo: (message: Message | null) => void;
  setForwardMessage: (message: Message | null) => void;
  getMessages: (chatId: string) => Message[];
  clearChat: (chatId: string) => void;
  isSendingMessage: (messageId: string) => boolean;
}

export const useMessageStore = create<MessageState>((set, get) => ({
  messages: {},
  sendingMessageIds: new Set(),
  hiddenMessageIds: new Set(),
  isLoading: {},
  hasMore: {},
  replyTo: null,
  forwardMessage: null,

  addSendingMessage: (message) =>
    set((state) => {
      const chatMessages = state.messages[message.chatId] ?? [];
      const nextSending = new Set(state.sendingMessageIds);
      nextSending.add(message.id);
      return {
        messages: { ...state.messages, [message.chatId]: [...chatMessages, message] },
        sendingMessageIds: nextSending,
      };
    }),

  confirmSentMessage: (tempId, realMessage) =>
    set((state) => {
      const chatMessages = state.messages[realMessage.chatId] ?? [];
      const nextSending = new Set(state.sendingMessageIds);
      nextSending.delete(tempId);
      // Replace temp message with real one (or just remove temp if real already added via SignalR)
      const filtered = chatMessages.filter(m => m.id !== tempId);
      const hasReal = filtered.some(m => m.id === realMessage.id);
      return {
        messages: { ...state.messages, [realMessage.chatId]: hasReal ? filtered : [...filtered, realMessage] },
        sendingMessageIds: nextSending,
      };
    }),

  isSendingMessage: (messageId) => get().sendingMessageIds.has(messageId),

  setMessages: (chatId, messages, replace = false) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [chatId]: replace
          ? messages
          : [...messages, ...(state.messages[chatId] ?? [])].filter(
              (m, i, arr) => arr.findIndex(x => x.id === m.id) === i
            ).sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()),
      },
    })),

  addMessage: (message) =>
    set((state) => {
      const chatMessages = state.messages[message.chatId] ?? [];
      if (chatMessages.some(m => m.id === message.id)) return state;
      return {
        messages: {
          ...state.messages,
          [message.chatId]: [...chatMessages, message],
        },
      };
    }),

  updateMessage: (message) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [message.chatId]: (state.messages[message.chatId] ?? []).map(m =>
          m.id === message.id ? message : m
        ),
      },
    })),

  deleteMessage: (messageId) =>
    set((state) => {
      const updated: Record<string, Message[]> = {};
      for (const [chatId, msgs] of Object.entries(state.messages)) {
        updated[chatId] = msgs.map(m =>
          m.id === messageId ? { ...m, isDeleted: true, content: undefined } : m
        );
      }
      return { messages: updated };
    }),

  markMessageRead: (messageId, userId) =>
    set((state) => {
      const updated: Record<string, Message[]> = {};
      for (const [chatId, msgs] of Object.entries(state.messages)) {
        updated[chatId] = msgs.map(m =>
          m.id === messageId && !m.readBy.includes(userId)
            ? { ...m, readBy: [...m.readBy, userId] }
            : m
        );
      }
      return { messages: updated };
    }),

  addReaction: (messageId, userId, emoji) =>
    set((state) => {
      const updated: Record<string, Message[]> = {};
      for (const [chatId, msgs] of Object.entries(state.messages)) {
        updated[chatId] = msgs.map(m => {
          if (m.id !== messageId) return m;
          // Remove any existing reaction from this user, then add the new one
          const filtered = m.reactions.filter(r => r.userId !== userId);
          return { ...m, reactions: [...filtered, { userId, username: '', emoji }] };
        });
      }
      return { messages: updated };
    }),

  removeReaction: (messageId, userId, emoji) =>
    set((state) => {
      const updated: Record<string, Message[]> = {};
      for (const [chatId, msgs] of Object.entries(state.messages)) {
        updated[chatId] = msgs.map(m => {
          if (m.id !== messageId) return m;
          return { ...m, reactions: m.reactions.filter(r => !(r.userId === userId && r.emoji === emoji)) };
        });
      }
      return { messages: updated };
    }),

  setLoading: (chatId, loading) =>
    set((state) => ({ isLoading: { ...state.isLoading, [chatId]: loading } })),

  setHasMore: (chatId, hasMore) =>
    set((state) => ({ hasMore: { ...state.hasMore, [chatId]: hasMore } })),

  deleteMessageForMe: (messageId) =>
    set((state) => {
      const next = new Set(state.hiddenMessageIds);
      next.add(messageId);
      return { hiddenMessageIds: next };
    }),

  setReplyTo: (replyTo) => set({ replyTo }),
  setForwardMessage: (forwardMessage) => set({ forwardMessage }),

  getMessages: (chatId) => {
    const hidden = get().hiddenMessageIds;
    return (get().messages[chatId] ?? []).filter(m => !hidden.has(m.id));
  },

  clearChat: (chatId) =>
    set((state) => {
      const { [chatId]: _, ...rest } = state.messages;
      return { messages: rest };
    }),
}));
