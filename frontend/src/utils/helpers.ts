import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import { uk } from 'date-fns/locale';

export function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  return format(date, 'HH:mm');
}

export function formatChatTime(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return format(date, 'HH:mm');
  if (isYesterday(date)) return 'Вчора';
  return format(date, 'dd.MM.yy');
}

export function formatLastSeen(dateStr?: string): string {
  if (!dateStr) return 'давно';
  const date = new Date(dateStr);
  return formatDistanceToNow(date, { addSuffix: true, locale: uk });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function getAvatarUrl(url?: string): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http')) return url;
  return `/${url}`;
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function getChatName(chat: { type: string; name?: string; members: Array<{ userId: string; displayName: string }> }, currentUserId: string): string {
  if (chat.type === 'group') return chat.name ?? 'Група';
  const other = chat.members.find(m => m.userId !== currentUserId);
  return other?.displayName ?? 'Unknown';
}

export function getChatAvatar(chat: { type: string; avatarUrl?: string; members: Array<{ userId: string; avatarUrl?: string }> }, currentUserId: string): string | undefined {
  if (chat.avatarUrl) return getAvatarUrl(chat.avatarUrl);
  if (chat.type === 'private') {
    const other = chat.members.find(m => m.userId !== currentUserId);
    return getAvatarUrl(other?.avatarUrl);
  }
  return undefined;
}

export function groupMessagesByDate(messages: Array<{ sentAt: string; id: string }>) {
  const groups: Record<string, typeof messages> = {};
  for (const msg of messages) {
    const date = new Date(msg.sentAt);
    let key: string;
    if (isToday(date)) key = 'Сьогодні';
    else if (isYesterday(date)) key = 'Вчора';
    else key = format(date, 'd MMMM yyyy', { locale: uk });

    if (!groups[key]) groups[key] = [];
    groups[key].push(msg);
  }
  return groups;
}
