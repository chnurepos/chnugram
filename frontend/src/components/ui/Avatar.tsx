import { getInitials } from '../../utils/helpers';

interface AvatarProps {
  src?: string;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isOnline?: boolean;
  className?: string;
}

const sizeClasses = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-sm',
  xl: 'w-20 h-20 text-xl',
};

const indicatorSizes = {
  xs: { size: '8px', border: '1.5px' },
  sm: { size: '9px', border: '1.5px' },
  md: { size: '11px', border: '2px' },
  lg: { size: '13px', border: '2px' },
  xl: { size: '15px', border: '2.5px' },
};

function getAvatarBg(name: string): string {
  const colors = ['#00b894','#00cec9','#6c5ce7','#e17055','#fd79a8','#fdcb6e','#0984e3','#55efc4'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export default function Avatar({ src, name, size = 'md', isOnline, className = '' }: AvatarProps) {
  const initials = getInitials(name);
  const bg = getAvatarBg(name);
  const ind = indicatorSizes[size];

  return (
    <div className={`relative flex-shrink-0 ${className}`}>
      {src ? (
        <img
          src={src}
          alt={name}
          className={`${sizeClasses[size]} rounded-full object-cover`}
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      ) : (
        <div
          className={`${sizeClasses[size]} rounded-full flex items-center justify-center text-white font-semibold`}
          style={{ background: bg }}
        >
          {initials}
        </div>
      )}
      {isOnline !== undefined && (
        <div
          className="absolute bottom-0 right-0 rounded-full"
          style={{
            width: ind.size,
            height: ind.size,
            background: isOnline ? 'var(--online)' : 'var(--text-muted)',
            border: `${ind.border} solid var(--bg-sidebar)`,
            boxShadow: isOnline ? '0 0 0 1px var(--online)' : 'none',
          }}
        />
      )}
    </div>
  );
}
