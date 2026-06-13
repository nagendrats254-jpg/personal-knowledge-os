import { usePKOSStore } from '../../store/useStore';
import { FileText, Share2, Search, MessageSquare, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const VIEW_META: Record<string, { title: string; subtitle: string; Icon: React.ElementType }> = {
  notes: { title: 'Notes', subtitle: 'Your personal knowledge vault', Icon: FileText },
  graph: { title: 'Knowledge Graph', subtitle: 'Visualize connections between your ideas', Icon: Share2 },
  search: { title: 'Semantic Search', subtitle: 'Find notes by meaning, not just keywords', Icon: Search },
  chat: { title: 'AI Assistant', subtitle: 'Chat with your knowledge base', Icon: MessageSquare },
};

export default function TopBar() {
  const { activeView, fetchNotes, notesLoading } = usePKOSStore();
  const meta = VIEW_META[activeView];

  const handleRefresh = async () => {
    try {
      await fetchNotes();
      toast.success('Notes refreshed');
    } catch {
      toast.error('Failed to refresh');
    }
  };

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-void-900/60 backdrop-blur-sm flex-shrink-0">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-aurora-500/15 border border-aurora-500/20">
          <meta.Icon className="w-4 h-4 text-aurora-400" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-white leading-none">{meta.title}</h1>
          <p className="text-xs text-slate-500 mt-0.5">{meta.subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleRefresh}
          disabled={notesLoading}
          className="btn-ghost"
          title="Refresh notes"
        >
          <RefreshCw className={`w-4 h-4 ${notesLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </header>
  );
}
