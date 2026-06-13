import { useEffect } from 'react';
import { usePKOSStore } from './store/useStore';
import Sidebar from './components/Layout/Sidebar';
import TopBar from './components/Layout/TopBar';
import NoteList from './components/Notes/NoteList';
import NoteEditor from './components/Notes/NoteEditor';
import KnowledgeGraph from './components/Graph/KnowledgeGraph';
import SemanticSearch from './components/Search/SemanticSearch';
import AIChat from './components/Chat/AIChat';

export default function App() {
  const { activeView, fetchNotes, sidebarOpen } = usePKOSStore();

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  return (
    <div className="flex h-screen bg-animated overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div
        className="flex flex-col flex-1 overflow-hidden transition-all duration-300"
        style={{ marginLeft: sidebarOpen ? '0' : '0' }}
      >
        <TopBar />

        <main className="flex-1 overflow-hidden">
          {activeView === 'notes' && (
            <div className="flex h-full">
              <NoteList />
              <NoteEditor />
            </div>
          )}
          {activeView === 'graph' && <KnowledgeGraph />}
          {activeView === 'search' && <SemanticSearch />}
          {activeView === 'chat' && <AIChat />}
        </main>
      </div>
    </div>
  );
}
