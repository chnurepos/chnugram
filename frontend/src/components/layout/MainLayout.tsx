import { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './Sidebar';
import ChatWindow from '../chat/ChatWindow';
import ProfileModal from './ProfileModal';
import { useChatStore } from '../../stores/chatStore';
import { chatsApi } from '../../services/api';

export default function MainLayout() {
  const { setChats, setLoadingChats, activeChatId } = useChatStore();
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    const loadChats = async () => {
      setLoadingChats(true);
      try {
        const response = await chatsApi.getChats();
        setChats(response.data.data ?? []);
      } catch (err) {
        console.error('Failed to load chats:', err);
      } finally {
        setLoadingChats(false);
      }
    };
    loadChats();
  }, [setChats, setLoadingChats]);

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: 'var(--bg-app)' }}>
      {/* Sidebar */}
      <div className={`w-full md:w-72 lg:w-80 flex-shrink-0 ${activeChatId ? 'hidden md:flex' : 'flex'} flex-col`}>
        <Sidebar onProfileClick={() => setShowProfile(true)} />
      </div>

      {/* Main content */}
      <div className={`flex-1 flex flex-col min-w-0 ${!activeChatId ? 'hidden md:flex' : 'flex'}`}>
        <Routes>
          <Route path="/" element={activeChatId ? <ChatWindow chatId={activeChatId} /> : <EmptyState />} />
          <Route path="/chat/:chatId" element={<ChatWindow chatId={activeChatId ?? ''} />} />
        </Routes>
      </div>

      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8" style={{ background: 'var(--bg-chat)' }}>
      <div className="relative mb-8">
        <div className="w-24 h-24 rounded-3xl flex items-center justify-center shadow-xl" style={{ background: 'var(--accent)' }}>
          <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full border-2" style={{ background: 'var(--online)', borderColor: 'var(--bg-chat)' }} />
      </div>
      <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>CHNUgram</h2>
      <p className="text-sm max-w-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        Оберіть чат зі списку або розпочніть нову розмову
      </p>
    </div>
  );
}
