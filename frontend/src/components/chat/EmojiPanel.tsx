import { useState } from 'react';

interface EmojiPanelProps {
  onEmojiSelect: (emoji: string) => void;
  onClose: () => void;
}

const CATEGORIES = [
  {
    label: '😊',
    emojis: [
      '😀','😁','😂','🤣','😃','😄','😅','😆','😉','😊',
      '😋','😎','😍','🥰','😘','😗','😙','😚','🙂','🤗',
      '🤩','🤔','🤨','😐','😑','😶','🙄','😏','😣','😥',
      '😮','🤐','😯','😪','😫','🥱','😴','😌','😛','😜',
      '😝','🤤','😒','😓','😔','😕','🙃','🤑','😲','☹️',
      '🙁','😖','😞','😟','😤','😢','😭','😦','😧','😨',
      '😩','🤯','😬','😰','😱','🥵','🥶','😳','🤪','😵',
      '🥴','😠','😡','🤬','😷','🤒','🤕','🤢','🤧','🥳',
    ],
  },
  {
    label: '👋',
    emojis: [
      '👋','🤚','🖐','✋','🖖','👌','🤌','🤏','✌️','🤞',
      '🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍',
      '👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝',
      '🙏','✍️','💅','🤳','💪','🦾','🦵','🦶','👂','🦻',
      '👃','🧠','🫀','🫁','🦷','🦴','👀','👁','👅','👄',
    ],
  },
  {
    label: '🐶',
    emojis: [
      '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯',
      '🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐔','🐧',
      '🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄',
      '🐝','🐛','🦋','🐌','🐞','🐜','🦟','🦗','🦂','🐢',
      '🐍','🦎','🦖','🦕','🐙','🦑','🦐','🦞','🦀','🐡',
      '🐠','🐟','🐬','🐳','🐋','🦈','🐊','🐅','🐆','🦓',
    ],
  },
  {
    label: '🍕',
    emojis: [
      '🍎','🍊','🍋','🍇','🍓','🫐','🍈','🍉','🍑','🥭',
      '🍍','🥥','🥝','🍅','🥑','🍆','🥦','🥬','🥒','🌶',
      '🫑','🧄','🧅','🥔','🍠','🫘','🌽','🍞','🥐','🥨',
      '🧀','🥚','🍳','🧈','🥞','🧇','🥓','🌭','🍔','🍟',
      '🍕','🌮','🌯','🫔','🥙','🧆','🥚','🍿','🧂','🥫',
      '🍱','🍘','🍙','🍚','🍛','🍜','🍝','🍣','🍤','🍦',
    ],
  },
  {
    label: '⚽',
    emojis: [
      '⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🎱','🥏',
      '🎳','🏏','🏑','🏒','🥍','🏓','🏸','🥊','🥋','🎯',
      '⛳','🎣','🤿','🎽','🎿','🛷','🥌','🎠','🎡','🎢',
      '🎭','🎨','🎬','🎤','🎧','🎼','🎹','🥁','🎷','🎺',
      '🎸','🪕','🎻','🎲','♟','🎮','🕹','🧩','🧸','🪅',
    ],
  },
  {
    label: '❤️',
    emojis: [
      '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔',
      '❤️‍🔥','❤️‍🩹','💕','💞','💓','💗','💖','💘','💝','💟',
      '☮️','✝️','☪️','🕉','☸️','✡️','🔯','🕎','☯️','🛐',
      '⛎','♈','♉','♊','♋','♌','♍','♎','♏','♐',
      '✨','⭐','🌟','💫','⚡','🌈','🌊','🎆','🎇','🧨',
    ],
  },
];

export default function EmojiPanel({ onEmojiSelect, onClose }: EmojiPanelProps) {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onMouseDown={onClose}
      />
      {/* Panel */}
      <div
        className="fixed top-0 right-0 h-full z-50 flex flex-col slide-left"
        style={{ width: 320, background: 'var(--bg-sidebar)', boxShadow: '-4px 0 32px rgba(0,0,0,0.5)' }}
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ background: 'var(--bg-header)' }}>
          <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)', fontFamily: "'Space Mono', monospace", letterSpacing: '0.05em' }}>
            EMOJI
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = ''; }}
          >
            <svg style={{ width: 18, height: 18 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Category tabs */}
        <div className="flex border-b flex-shrink-0" style={{ borderColor: 'var(--border-real)' }}>
          {CATEGORIES.map((cat, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              className="flex-1 py-2.5 text-base transition-colors"
              style={{
                background: activeTab === i ? 'var(--accent-muted)' : 'transparent',
                borderBottom: activeTab === i ? '2px solid var(--accent)' : '2px solid transparent',
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Emoji grid */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="grid" style={{ gridTemplateColumns: 'repeat(8, 1fr)', gap: '2px' }}>
            {CATEGORIES[activeTab].emojis.map((emoji, i) => (
              <button
                key={i}
                onClick={() => onEmojiSelect(emoji)}
                className="flex items-center justify-center rounded-xl transition-colors"
                style={{ fontSize: 22, padding: '6px', aspectRatio: '1' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = ''; }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
