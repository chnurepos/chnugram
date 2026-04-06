// Auth
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  displayName: string;
  password: string;
}

// User
export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  isVerified: boolean;
  lastSeenAt?: string;
  isOnline: boolean;
  createdAt: string;
}

// Chat
export type ChatType = 'private' | 'group';
export type MemberRole = 'owner' | 'admin' | 'member';

export interface ChatMember {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  role: MemberRole;
  isOnline: boolean;
  joinedAt: string;
  lastSeenAt?: string;
}

export interface Chat {
  id: string;
  type: ChatType;
  name?: string;
  description?: string;
  avatarUrl?: string;
  createdBy: string;
  createdAt: string;
  members: ChatMember[];
  lastMessage?: Message;
  unreadCount: number;
}

// Message
export type MessageType = 'text' | 'image' | 'file' | 'voice' | 'system';

export interface Attachment {
  id: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  width?: number;
  height?: number;
  durationMs?: number;
}

export interface Reaction {
  userId: string;
  username: string;
  emoji: string;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderUsername: string;
  senderDisplayName: string;
  senderAvatarUrl?: string;
  replyToId?: string;
  forwardedFrom?: string;
  type: MessageType;
  content?: string;
  isEdited: boolean;
  editedAt?: string;
  isDeleted: boolean;
  sentAt: string;
  attachments: Attachment[];
  reactions: Reaction[];
  readBy: string[];
}

// API Response
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// SignalR Events
export interface TypingEvent {
  chatId: string;
  userId: string;
  username: string;
  isTyping: boolean;
}

export interface OnlineStatusEvent {
  userId: string;
  isOnline: boolean;
  lastSeenAt?: string;
}
