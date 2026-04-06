import * as signalR from '@microsoft/signalr';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';
import { useMessageStore } from '../stores/messageStore';
import type { Message, TypingEvent, OnlineStatusEvent, Chat } from '../types';

let connection: signalR.HubConnection | null = null;

export function createConnection(): signalR.HubConnection {
  const conn = new signalR.HubConnectionBuilder()
    .withUrl('/hubs/chat', {
      accessTokenFactory: () => useAuthStore.getState().accessToken ?? '',
      transport: signalR.HttpTransportType.WebSockets,
    })
    .withAutomaticReconnect([0, 1000, 2000, 5000, 10000])
    .configureLogging(signalR.LogLevel.Warning)
    .build();

  return conn;
}

export function getConnection(): signalR.HubConnection | null {
  return connection;
}

export async function startConnection(): Promise<void> {
  if (connection?.state === signalR.HubConnectionState.Connected) return;

  connection = createConnection();
  registerHandlers(connection);

  try {
    await connection.start();
    console.log('[SignalR] Connected');
  } catch (err) {
    console.error('[SignalR] Connection failed:', err);
    setTimeout(startConnection, 5000);
  }

  connection.onclose(async () => {
    console.log('[SignalR] Disconnected');
  });

  connection.onreconnected(() => {
    console.log('[SignalR] Reconnected');
    // Rejoin active chat
    const activeChatId = useChatStore.getState().activeChatId;
    if (activeChatId && connection) {
      connection.invoke('JoinChat', activeChatId).catch(console.error);
    }
  });
}

export async function stopConnection(): Promise<void> {
  if (connection) {
    await connection.stop();
    connection = null;
  }
}

export async function joinChat(chatId: string): Promise<void> {
  if (connection?.state === signalR.HubConnectionState.Connected) {
    await connection.invoke('JoinChat', chatId);
  }
}

export async function leaveChat(chatId: string): Promise<void> {
  if (connection?.state === signalR.HubConnectionState.Connected) {
    await connection.invoke('LeaveChat', chatId);
  }
}

export async function sendTyping(chatId: string): Promise<void> {
  if (connection?.state === signalR.HubConnectionState.Connected) {
    await connection.invoke('Typing', chatId);
  }
}

export async function sendStopTyping(chatId: string): Promise<void> {
  if (connection?.state === signalR.HubConnectionState.Connected) {
    await connection.invoke('StopTyping', chatId);
  }
}

function registerHandlers(conn: signalR.HubConnection): void {
  // New message received
  conn.on('NewMessage', (message: Message) => {
    useMessageStore.getState().addMessage(message);
    useChatStore.getState().updateLastMessage(message.chatId, message);
  });

  // Message edited
  conn.on('MessageEdited', (message: Message) => {
    useMessageStore.getState().updateMessage(message);
  });

  // Message deleted
  conn.on('MessageDeleted', (data: { messageId: string }) => {
    useMessageStore.getState().deleteMessage(data.messageId);
  });

  // Message read
  conn.on('MessageRead', (data: { messageId: string; userId: string; readAt: string }) => {
    useMessageStore.getState().markMessageRead(data.messageId, data.userId);
    useChatStore.getState().decrementUnread(data.messageId);
  });

  // User typing
  conn.on('UserTyping', (event: TypingEvent) => {
    useChatStore.getState().setTyping(event.chatId, event.userId, event.username, event.isTyping);
  });

  // User online/offline
  conn.on('UserOnline', (event: OnlineStatusEvent) => {
    useChatStore.getState().setUserOnline(event.userId, true);
  });

  conn.on('UserOffline', (event: OnlineStatusEvent) => {
    useChatStore.getState().setUserOnline(event.userId, false);
  });

  // Reaction added
  conn.on('ReactionAdded', (data: { messageId: string; userId: string; emoji: string }) => {
    useMessageStore.getState().addReaction(data.messageId, data.userId, data.emoji);
  });

  // Reaction removed
  conn.on('ReactionRemoved', (data: { messageId: string; userId: string; emoji: string }) => {
    useMessageStore.getState().removeReaction(data.messageId, data.userId, data.emoji);
  });

  // New chat
  conn.on('NewChat', (chat: Chat) => {
    useChatStore.getState().addChat(chat);
  });

  // Chat deleted
  conn.on('ChatDeleted', (chatId: string) => {
    useChatStore.getState().removeChat(chatId);
  });
}
