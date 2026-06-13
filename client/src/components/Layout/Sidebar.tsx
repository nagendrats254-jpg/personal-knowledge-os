import { useState } from 'react';
import { FileText, Share2, Search, MessageSquare, Brain, ChevronLeft, ChevronRight, Plus, UploadCloud } from 'lucide-react';
import { usePKOSStore } from '../../store/useStore';
import toast from 'react-hot-toast';
import ImportModal from '../Notes/ImportModal';
import type { AppView } from '../../types';

const NAV_ITEMS: { view: AppView; icon: React.ElementType; label: string }[] = [
  { view: 'notes', icon: FileText, label: 'Notes' },
  { view: 'graph', icon: Share2, label: 'Knowledge Graph' },
  { view: 'search', icon: Search, label: 'Semantic Search' },
  { view: 'chat', icon: MessageSquare, label: 'AI Chat' },
];

export default function Sidebar() {
  const { activeView, setActiveView, sidebarOpen, setSidebarOpen, notes, createNote, setActiveNoteId, setIsEditing, fetchNotes } = usePKOSStore();
  const [importModalOpen, setImportModalOpen] = useState(false);

  const handleNewNote = async () => {
    try {
      const note = await createNote({ title: 'Untitled Note', content: '', tags: [] });
      setActiveView('notes');
      setActiveNoteId(note.id);
      setIsEditing(true);
      toast.success('New note created');
    } catch {
      toast.error('Failed to create note');
    }
  };

  return (
    <aside
      className={`flex flex-col flex-shrink-0 border-r border-white/[0.06] bg-void-900/80 backdrop-blur-xl
                  transition-all duration-300 overflow-hidden z-20
                  ${sidebarOpen ? 'w-60' : 'w-16'}`}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-white/[0.06]">
        {sidebarOpen && (
          <div className="flex items-center gap-2.5 animate-fade-in">
            <div className="w-8 h-8 rounded-lg bg-aurora-gradient flex items-center justify-center shadow-glow-violet">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="text-sm font-bold text-white tracking-tight">PKOS</span>
              <p className="text-[10px] text-slate-500 -mt-0.5">Knowledge OS</p>
            </div>
          </div>
        )}
        {!sidebarOpen && (
          <div className="w-8 h-8 mx-auto rounded-lg bg-aurora-gradient flex items-center justify-center shadow-glow-violet">
            <Brain className="w-4 h-4 text-white" />
          </div>
        )}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="btn-ghost p-1.5 ml-auto"
          title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {sidebarOpen
            ? <ChevronLeft className="w-4 h-4" />
            : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* New Note & Import Buttons */}
      <div className={`px-3 py-3 border-b border-white/[0.06] flex flex-col gap-2 ${!sidebarOpen ? 'items-center' : ''}`}>
        <button
          onClick={handleNewNote}
          className={`btn-primary w-full justify-center ${!sidebarOpen ? 'px-2 w-10 h-10' : ''}`}
          title="New Note"
        >
          <Plus className="w-4 h-4 flex-shrink-0" />
          {sidebarOpen && <span>New Note</span>}
        </button>
        <button
          onClick={() => setImportModalOpen(true)}
          className={`btn-secondary w-full justify-center ${!sidebarOpen ? 'px-2 w-10 h-10' : ''}`}
          title="Import"
        >
          <UploadCloud className="w-4 h-4 flex-shrink-0" />
          {sidebarOpen && <span>Import</span>}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-1">
        {sidebarOpen && <p className="section-title px-2 mb-2">Navigation</p>}
        {NAV_ITEMS.map(({ view, icon: Icon, label }) => (
          <button
            key={view}
            onClick={() => setActiveView(view)}
            className={`w-full text-left ${activeView === view ? 'nav-item-active' : 'nav-item'}
                        ${!sidebarOpen ? 'justify-center px-2' : ''}`}
            title={!sidebarOpen ? label : undefined}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {sidebarOpen && <span>{label}</span>}
          </button>
        ))}
      </nav>

      {/* Stats Footer */}
      {sidebarOpen && (
        <div className="px-4 py-3 border-t border-white/[0.06]">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-slate-500">
              {notes.length} note{notes.length !== 1 ? 's' : ''} in vault
            </span>
          </div>
        </div>
      )}

      <ImportModal 
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImportSuccess={(note) => {
          fetchNotes();
          setActiveView('notes');
          setActiveNoteId(note.id);
        }}
      />
    </aside>
  );
}
