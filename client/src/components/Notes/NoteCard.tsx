import { Clock, Tag } from 'lucide-react';
import type { NoteListItem } from '../../types';

interface NoteCardProps {
  note: NoteListItem;
  isActive: boolean;
  onClick: () => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function NoteCard({ note, isActive, onClick }: NoteCardProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-all duration-200 group
        ${isActive
          ? 'bg-aurora-500/15 border-aurora-500/40 shadow-glow-violet/20'
          : 'bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.05] hover:border-white/[0.12]'
        }`}
    >
      <h3 className={`text-sm font-medium truncate mb-1 transition-colors
        ${isActive ? 'text-aurora-300' : 'text-slate-200 group-hover:text-white'}`}>
        {note.title}
      </h3>

      {note.preview && (
        <p className="text-xs text-slate-500 line-clamp-2 mb-2 leading-relaxed">
          {note.preview}
        </p>
      )}

      <div className="flex items-center justify-between gap-2">
        {note.tags.length > 0 ? (
          <div className="flex items-center gap-1 flex-wrap min-w-0">
            <Tag className="w-3 h-3 text-slate-600 flex-shrink-0" />
            {note.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="tag-badge text-[10px]">{tag}</span>
            ))}
            {note.tags.length > 2 && (
              <span className="text-[10px] text-slate-600">+{note.tags.length - 2}</span>
            )}
          </div>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-1 text-[10px] text-slate-600 flex-shrink-0">
          <Clock className="w-3 h-3" />
          {timeAgo(note.updatedAt)}
        </div>
      </div>
    </button>
  );
}
