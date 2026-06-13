import { GoogleGenAI } from '@google/genai';
import { getDb } from '../db/client';
import { vectorStore } from './vectorStore';

let _genai: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!_genai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    _genai = new GoogleGenAI({ apiKey });
  }
  return _genai;
}

/** Generate a 3072-dim embedding for a text string via Gemini */
export async function generateEmbedding(text: string): Promise<number[]> {
  const genai = getGenAI();
  const result = await genai.models.embedContent({
    model: 'gemini-embedding-001',
    contents: text,
  });
  const embedding = result.embeddings?.[0]?.values;
  if (!embedding || embedding.length === 0) {
    throw new Error('Empty embedding returned from Gemini API');
  }
  return embedding;
}

/** Save an embedding to SQLite and update the in-memory vector store */
export function saveEmbedding(noteId: string, vector: number[]): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO embeddings (note_id, vector, updated_at)
    VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    ON CONFLICT(note_id) DO UPDATE SET
      vector = excluded.vector,
      updated_at = excluded.updated_at
  `).run(noteId, JSON.stringify(vector));

  vectorStore.upsert(noteId, vector);
}

/** Delete an embedding from SQLite and vector store */
export function deleteEmbedding(noteId: string): void {
  const db = getDb();
  db.prepare('DELETE FROM embeddings WHERE note_id = ?').run(noteId);
  vectorStore.delete(noteId);
}

/** Load all embeddings from SQLite into the in-memory store (call at startup) */
export function loadAllEmbeddings(): void {
  const db = getDb();
  const rows = db.prepare('SELECT note_id, vector FROM embeddings').all() as unknown as Array<{
    note_id: string;
    vector: string;
  }>;

  vectorStore.load(
    rows.map((r) => ({
      noteId: r.note_id,
      vector: JSON.parse(r.vector) as number[],
    }))
  );

  console.log(`🧠 Loaded ${rows.length} embeddings into vector store`);
}

/** Generate embedding for a note's full text content and save it */
export async function embedNote(noteId: string, title: string, content: string): Promise<void> {
  const text = `${title}\n\n${content}`.slice(0, 8192); // Gemini embedding limit
  const vector = await generateEmbedding(text);
  saveEmbedding(noteId, vector);
}

/**
 * Re-embed all notes that don't have embeddings yet.
 * Called at startup to backfill any notes that failed embedding previously.
 * Runs asynchronously and doesn't block server startup.
 */
export async function reembedMissingNotes(): Promise<void> {
  const db = getDb();
  const missing = db.prepare(`
    SELECT n.id, n.title, n.content
    FROM notes n
    LEFT JOIN embeddings e ON e.note_id = n.id
    WHERE e.note_id IS NULL
  `).all() as unknown as Array<{ id: string; title: string; content: string }>;

  if (missing.length === 0) {
    console.log('✅ All notes have embeddings');
    return;
  }

  console.log(`🔄 Re-embedding ${missing.length} notes missing embeddings...`);

  let success = 0;
  let failed = 0;

  for (const note of missing) {
    try {
      await embedNote(note.id, note.title, note.content);
      success++;
      // Small delay to avoid rate limits
      await new Promise((r) => setTimeout(r, 500));
    } catch (err) {
      failed++;
      console.warn(`⚠️ Failed to embed "${note.title}":`, (err as Error).message);
    }
  }

  console.log(`✅ Re-embedding complete: ${success} success, ${failed} failed`);
}
