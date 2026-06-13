import { useState } from 'react';
import { Search, FileText } from 'lucide-react';
import { usePKOSStore } from '../../store/useStore';
import NoteCard from './NoteCard';

export default function NoteList() {
  const { notes, notesLoading, activeNoteId, setActiveNoteId } = usePKOSStore();
  const [query, setQuery] = useState('');

  const filtered = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(query.toLowerCase()) ||
      n.preview?.toLowerCase().includes(query.toLowerCase()) ||
      n.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div className="w-72 flex-shrink-0 flex flex-col border-r border-white/[0.06] bg-void-900/40 overflow-hidden">
      {/* Search */}
      <div className="px-3 py-3 border-b border-white/[0.06]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter notes..."
            className="input-field pl-9 text-xs py-2"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {notesLoading && notes.length === 0 ? (
          <div className="space-y-2 p-1">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton h-20 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center px-4">
            <FileText className="w-10 h-10 text-slate-700 mb-3" />
            <p className="text-sm text-slate-500 font-medium">
              {query ? 'No matching notes' : 'No notes yet'}
            </p>
            <p className="text-xs text-slate-600 mt-1">
              {query ? 'Try a different filter' : 'Click "New Note" to get started'}
            </p>
          </div>
        ) : (
          filtered.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              isActive={activeNoteId === note.id}
              onClick={() => setActiveNoteId(note.id)}
            />
          ))
        )}
      </div>

      {/* Footer count */}
      <div className="px-3 py-2 border-t border-white/[0.06]">
        <p className="text-[10px] text-slate-600">
          {filtered.length} of {notes.length} note{notes.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}
