import axios from 'axios';
import type { Note, NoteListItem, SearchResult, GraphData } from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000,
});

// ── Notes ────────────────────────────────────────────────────────────────────
export const notesApi = {
  list: () => api.get<NoteListItem[]>('/notes').then((r) => r.data),
  get: (id: string) => api.get<Note>(`/notes/${id}`).then((r) => r.data),
  create: (data: { title: string; content?: string; tags?: string[] }) =>
    api.post<Note>('/notes', data).then((r) => r.data),
  update: (id: string, data: { title?: string; content?: string; tags?: string[] }) =>
    api.put<Note>(`/notes/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/notes/${id}`),
};

// ── Search ────────────────────────────────────────────────────────────────────
export const searchApi = {
  semantic: (query: string, topK = 8) =>
    api
      .post<{ results: SearchResult[]; message?: string }>('/search', { query, topK })
      .then((r) => r.data),
};

// ── Graph ─────────────────────────────────────────────────────────────────────
export const graphApi = {
  get: () => api.get<GraphData>('/graph').then((r) => r.data),
};

// ── Import ────────────────────────────────────────────────────────────────────
export const importApi = {
  file: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<Note>('/import/file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(r => r.data);
  },
  url: (url: string) => 
    api.post<Note>('/import/url', { url }).then(r => r.data)
};

// ── AI Chat (SSE streaming) ───────────────────────────────────────────────────
export interface ChatHistoryItem {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

export async function streamChat(
  message: string,
  history: ChatHistoryItem[],
  onToken: (token: string) => void,
  onDone: () => void,
  onError: (err: string) => void
): Promise<void> {
  try {
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history }),
    });

    if (!response.ok) {
      const data = await response.json();
      onError(data?.error?.message ?? 'Chat request failed');
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      onError('No response body');
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') {
            onDone();
            return;
          }
          try {
            const parsed = JSON.parse(payload) as { text?: string; error?: string };
            if (parsed.error) {
              onError(parsed.error);
              return;
            }
            if (parsed.text) {
              onToken(parsed.text);
            }
          } catch {
            // Ignore malformed SSE lines
          }
        }
      }
    }
    onDone();
  } catch (err) {
    onError(err instanceof Error ? err.message : 'Network error');
  }
}
