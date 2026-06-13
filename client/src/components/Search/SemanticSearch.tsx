import { useState } from 'react';
import { Search, Sparkles, ArrowRight, Clock } from 'lucide-react';
import { searchApi } from '../../api/pkosApi';
import { usePKOSStore } from '../../store/useStore';
import type { SearchResult } from '../../types';
import toast from 'react-hot-toast';

export default function SemanticSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [message, setMessage] = useState('');
  const { setActiveNoteId, setActiveView } = usePKOSStore();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setSearching(true);
    setSearched(false);
    try {
      const data = await searchApi.semantic(query.trim());
      setResults(data.results);
      setMessage(data.message ?? '');
      setSearched(true);
    } catch {
      toast.error('Search failed. Make sure your API key is configured.');
    } finally {
      setSearching(false);
    }
  };

  const openNote = (id: string) => {
    setActiveNoteId(id);
    setActiveView('notes');
  };

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto px-6 py-8 w-full">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-aurora-500/15 border border-aurora-500/25 mb-4 animate-float">
          <Sparkles className="w-7 h-7 text-aurora-400" />
        </div>
        <h2 className="text-2xl font-bold text-white">Semantic Search</h2>
        <p className="text-slate-500 text-sm mt-2">
          Search by meaning — find notes related to your idea, not just matching words
        </p>
      </div>

      {/* Search form */}
      <form onSubmit={handleSearch} className="mb-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What are you looking for? e.g. 'ideas about productivity'…"
            className="input-field pl-12 pr-32 py-4 text-base rounded-xl"
            autoFocus
          />
          <button
            type="submit"
            disabled={searching || !query.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 btn-primary py-2"
          >
            {searching ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Searching…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Search <ArrowRight className="w-4 h-4" />
              </span>
            )}
          </button>
        </div>
      </form>

      {/* Results */}
      {message && (
        <p className="text-sm text-slate-500 text-center mb-4">{message}</p>
      )}

      {searched && results.length === 0 && !message && (
        <div className="text-center py-12">
          <Search className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No matching notes found</p>
          <p className="text-slate-600 text-sm mt-1">Try rephrasing your query</p>
        </div>
      )}

      <div className="space-y-3">
        {results.map((result, i) => (
          <button
            key={result.id}
            onClick={() => openNote(result.id)}
            className="w-full text-left glass-card-hover p-4 animate-fade-in group"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-white group-hover:text-aurora-300 transition-colors truncate">
                    {result.title}
                  </h3>
                  {/* Similarity score bar */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-aurora-gradient rounded-full transition-all duration-500"
                        style={{ width: `${Math.round(result.score * 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-500">
                      {Math.round(result.score * 100)}%
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {result.preview}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  {result.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="tag-badge text-[10px]">{tag}</span>
                  ))}
                  <span className="text-[10px] text-slate-600 flex items-center gap-1 ml-auto">
                    <Clock className="w-3 h-3" />
                    {new Date(result.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-aurora-400 flex-shrink-0 mt-0.5 transition-colors" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
