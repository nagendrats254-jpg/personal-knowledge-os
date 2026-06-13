import { create } from 'zustand';
import { notesApi } from '../api/pkosApi';
import type { Note, NoteListItem, AppView } from '../types';

interface PKOSState {
  // ── View ──────────────────────────────────────────────────────────────────
  activeView: AppView;
  setActiveView: (view: AppView) => void;

  // ── Notes List ────────────────────────────────────────────────────────────
  notes: NoteListItem[];
  notesLoading: boolean;
  fetchNotes: () => Promise<void>;

  // ── Active Note ───────────────────────────────────────────────────────────
  activeNoteId: string | null;
  activeNote: Note | null;
  noteLoading: boolean;
  setActiveNoteId: (id: string | null) => void;
  fetchNote: (id: string) => Promise<void>;

  // ── Note Mutations ────────────────────────────────────────────────────────
  createNote: (data: { title: string; content?: string; tags?: string[] }) => Promise<Note>;
  updateNote: (id: string, data: { title?: string; content?: string; tags?: string[] }) => Promise<Note>;
  deleteNote: (id: string) => Promise<void>;

  // ── Editor ────────────────────────────────────────────────────────────────
  isEditing: boolean;
  setIsEditing: (v: boolean) => void;

  // ── Sidebar ───────────────────────────────────────────────────────────────
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
}

export const usePKOSStore = create<PKOSState>((set, get) => ({
  // ── View ──────────────────────────────────────────────────────────────────
  activeView: 'notes',
  setActiveView: (view) => set({ activeView: view, activeNoteId: null, activeNote: null, isEditing: false }),

  // ── Notes List ────────────────────────────────────────────────────────────
  notes: [],
  notesLoading: false,
  fetchNotes: async () => {
    set({ notesLoading: true });
    try {
      const notes = await notesApi.list();
      set({ notes, notesLoading: false });
    } catch {
      set({ notesLoading: false });
    }
  },

  // ── Active Note ───────────────────────────────────────────────────────────
  activeNoteId: null,
  activeNote: null,
  noteLoading: false,
  setActiveNoteId: (id) => {
    set({ activeNoteId: id, isEditing: false });
    if (id) get().fetchNote(id);
    else set({ activeNote: null });
  },
  fetchNote: async (id) => {
    set({ noteLoading: true });
    try {
      const note = await notesApi.get(id);
      set({ activeNote: note, noteLoading: false });
    } catch {
      set({ noteLoading: false });
    }
  },

  // ── Note Mutations ────────────────────────────────────────────────────────
  createNote: async (data) => {
    const note = await notesApi.create(data);
    await get().fetchNotes();
    return note;
  },
  updateNote: async (id, data) => {
    const note = await notesApi.update(id, data);
    set({ activeNote: note });
    await get().fetchNotes();
    return note;
  },
  deleteNote: async (id) => {
    await notesApi.delete(id);
    set({ activeNoteId: null, activeNote: null });
    await get().fetchNotes();
  },

  // ── Editor ────────────────────────────────────────────────────────────────
  isEditing: false,
  setIsEditing: (v) => set({ isEditing: v }),

  // ── Sidebar ───────────────────────────────────────────────────────────────
  sidebarOpen: true,
  setSidebarOpen: (v) => set({ sidebarOpen: v }),
}));
