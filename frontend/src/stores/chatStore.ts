import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Chat, Message } from '../types';

interface TypingUser {
  userId: string;
  username: string;
}

interface ChatState {
  chats: Chat[];
  activeChatId: string | null;
  typingUsers: Record<string, TypingUser[]>; // chatId -> typing users
  onlineUsers: Set<string>;
  isLoadingChats: boolean;

  setChats: (chats: Chat[]) => void;
  addChat: (chat: Chat) => void;
  removeChat: (chatId: string) => void;
  updateChat: (chat: Chat) => void;
  setActiveChat: (chatId: string | null) => void;
  updateLastMessage: (chatId: string, message: Message) => void;
  decrementUnread: (messageId: string) => void;
  setTyping: (chatId: string, userId: string, username: string, isTyping: boolean) => void;
  setUserOnline: (userId: string, isOnline: boolean) => void;
  setLoadingChats: (loading: boolean) => void;
  incrementUnread: (chatId: string) => void;
  markChatRead: (chatId: string) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
  chats: [],
  activeChatId: null,
  typingUsers: {},
  onlineUsers: new Set(),
  isLoadingChats: false,

  setChats: (chats) => set({ chats }),

  addChat: (chat) =>
    set((state) => ({
      chats: state.chats.some(c => c.id === chat.id)
        ? state.chats
        : [chat, ...state.chats],
    })),

  removeChat: (chatId) =>
    set((state) => ({
      chats: state.chats.filter(c => c.id !== chatId),
      activeChatId: state.activeChatId === chatId ? null : state.activeChatId,
    })),

  updateChat: (chat) =>
    set((state) => ({
      chats: state.chats.map(c => c.id === chat.id ? chat : c),
    })),

  setActiveChat: (chatId) => set({ activeChatId: chatId }),

  updateLastMessage: (chatId, message) =>
    set((state) => ({
      chats: state.chats.map(c => {
        if (c.id !== chatId) return c;
        const isActiveChat = state.activeChatId === chatId;
        return {
          ...c,
          lastMessage: message,
          unreadCount: isActiveChat ? 0 : c.unreadCount + 1,
        };
      }).sort((a, b) => {
        const aTime = a.lastMessage?.sentAt ?? a.createdAt;
        const bTime = b.lastMessage?.sentAt ?? b.createdAt;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      }),
    })),

  decrementUnread: (_messageId) => {
    // Handled by markChatRead
  },

  incrementUnread: (chatId) =>
    set((state) => ({
      chats: state.chats.map(c =>
        c.id === chatId ? { ...c, unreadCount: c.unreadCount + 1 } : c
      ),
    })),

  markChatRead: (chatId) =>
    set((state) => ({
      chats: state.chats.map(c =>
        c.id === chatId ? { ...c, unreadCount: 0 } : c
      ),
    })),

  setTyping: (chatId, userId, username, isTyping) =>
    set((state) => {
      const current = state.typingUsers[chatId] ?? [];
      let updated: TypingUser[];
      if (isTyping) {
        if (current.some(u => u.userId === userId)) {
          updated = current;
        } else {
          updated = [...current, { userId, username }];
        }
      } else {
        updated = current.filter(u => u.userId !== userId);
      }
      return {
        typingUsers: { ...state.typingUsers, [chatId]: updated },
      };
    }),

  setUserOnline: (userId, isOnline) =>
    set((state) => {
      const next = new Set(state.onlineUsers);
      if (isOnline) next.add(userId);
      else next.delete(userId);
      return { onlineUsers: next };
    }),

  setLoadingChats: (isLoadingChats) => set({ isLoadingChats }),
    }),
    {
      name: 'chnugram-chat',
      partialize: (state) => ({ activeChatId: state.activeChatId }),
    }
  )
);
