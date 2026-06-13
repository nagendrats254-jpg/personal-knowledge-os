import { useState, useEffect, useCallback } from 'react';
import MDEditor from '@uiw/react-md-editor';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Edit3, Eye, Save, Trash2, Tag, X, Plus, FileText } from 'lucide-react';
import { usePKOSStore } from '../../store/useStore';
import toast from 'react-hot-toast';

export default function NoteEditor() {
  const { activeNote, noteLoading, isEditing, setIsEditing, updateNote, deleteNote, activeNoteId } = usePKOSStore();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Sync form state when active note changes
  useEffect(() => {
    if (activeNote) {
      setTitle(activeNote.title);
      setContent(activeNote.content);
      setTags(activeNote.tags);
      setIsDirty(false);
    }
  }, [activeNote]);

  const handleSave = useCallback(async () => {
    if (!activeNoteId || !isDirty) return;
    setSaving(true);
    try {
      await updateNote(activeNoteId, { title, content, tags });
      setIsDirty(false);
      toast.success('Note saved');
    } catch {
      toast.error('Failed to save note');
    } finally {
      setSaving(false);
    }
  }, [activeNoteId, isDirty, title, content, tags, updateNote]);

  // Auto-save on Ctrl+S
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave]);

  const handleDelete = async () => {
    if (!activeNoteId || !confirm('Delete this note? This cannot be undone.')) return;
    try {
      await deleteNote(activeNoteId);
      toast.success('Note deleted');
    } catch {
      toast.error('Failed to delete note');
    }
  };

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      const newTags = [...tags, tag];
      setTags(newTags);
      setIsDirty(true);
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
    setIsDirty(true);
  };

  // Empty state
  if (!activeNoteId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
        <div className="w-20 h-20 rounded-2xl bg-aurora-500/10 border border-aurora-500/20 flex items-center justify-center animate-float">
          <FileText className="w-10 h-10 text-aurora-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white mb-1">Select a note to start</h2>
          <p className="text-sm text-slate-500">
            Choose a note from the list, or create a new one to begin writing.
          </p>
        </div>
        <div className="flex gap-2 text-xs text-slate-600">
          <kbd className="px-2 py-1 rounded bg-white/[0.05] border border-white/[0.08]">Ctrl+S</kbd>
          <span>to save</span>
        </div>
      </div>
    );
  }

  // Loading state
  if (noteLoading && !activeNote) {
    return (
      <div className="flex-1 p-6 space-y-4">
        <div className="skeleton h-10 w-2/3" />
        <div className="skeleton h-6 w-1/3" />
        <div className="skeleton h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Editor Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/[0.06] bg-void-900/30 flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditing(true)}
            className={`btn-ghost text-xs ${isEditing ? 'text-aurora-400' : ''}`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            Edit
          </button>
          <button
            onClick={() => setIsEditing(false)}
            className={`btn-ghost text-xs ${!isEditing ? 'text-aurora-400' : ''}`}
          >
            <Eye className="w-3.5 h-3.5" />
            Preview
          </button>
        </div>

        <div className="flex items-center gap-2">
          {isDirty && (
            <span className="text-xs text-amber-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              Unsaved
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={!isDirty || saving}
            className="btn-primary text-xs py-1.5 px-3"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button onClick={handleDelete} className="btn-danger text-xs py-1.5 px-3">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Title */}
      <div className="px-6 pt-5 pb-3 flex-shrink-0">
        <input
          type="text"
          value={title}
          onChange={(e) => { setTitle(e.target.value); setIsDirty(true); }}
          placeholder="Note title…"
          className="w-full bg-transparent text-2xl font-bold text-white placeholder:text-slate-600
                     focus:outline-none border-none resize-none"
        />
      </div>

      {/* Tags */}
      <div className="px-6 pb-3 flex-shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Tag className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
          {tags.map((tag) => (
            <span key={tag} className="tag-badge flex items-center gap-1">
              {tag}
              <button onClick={() => removeTag(tag)} className="hover:text-white transition-colors">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); }
              }}
              placeholder="Add tag…"
              className="bg-transparent text-xs text-slate-400 placeholder:text-slate-600
                         focus:outline-none w-20 focus:w-32 transition-all duration-200"
            />
            {tagInput && (
              <button onClick={addTag} className="text-aurora-400 hover:text-aurora-300">
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Editor / Preview */}
      <div className="flex-1 overflow-auto px-6 pb-6" data-color-mode="dark">
        {isEditing ? (
          <MDEditor
            value={content}
            onChange={(val) => { setContent(val ?? ''); setIsDirty(true); }}
            height="100%"
            preview="edit"
            visibleDragbar={false}
          />
        ) : (
          <div className="prose-pkos max-w-none">
            {content ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            ) : (
              <p className="text-slate-600 italic text-sm">
                No content yet. Click Edit to start writing…
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
