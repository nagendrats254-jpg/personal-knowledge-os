/**
 * In-memory cosine similarity vector store.
 * On server start, all embeddings are loaded from SQLite into memory for fast search.
 * On note save/update/delete, the in-memory store is kept in sync.
 */

export interface VectorEntry {
  noteId: string;
  vector: number[];
}

class VectorStore {
  private entries: Map<string, number[]> = new Map();

  /** Load (or reload) a set of entries into memory */
  load(entries: VectorEntry[]): void {
    for (const e of entries) {
      this.entries.set(e.noteId, e.vector);
    }
  }

  /** Upsert a single vector */
  upsert(noteId: string, vector: number[]): void {
    this.entries.set(noteId, vector);
  }

  /** Remove a vector */
  delete(noteId: string): void {
    this.entries.delete(noteId);
  }

  /** Cosine similarity between two vectors */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
  }

  /** Find top-k most similar notes to query vector */
  search(queryVector: number[], topK = 5, excludeId?: string): Array<{ noteId: string; score: number }> {
    const results: Array<{ noteId: string; score: number }> = [];

    for (const [noteId, vector] of this.entries) {
      if (excludeId && noteId === excludeId) continue;
      const score = this.cosineSimilarity(queryVector, vector);
      results.push({ noteId, score });
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  get size(): number {
    return this.entries.size;
  }

  getAll(): VectorEntry[] {
    return Array.from(this.entries.entries()).map(([noteId, vector]) => ({ noteId, vector }));
  }

  public calculateSimilarity(a: number[], b: number[]): number {
    return this.cosineSimilarity(a, b);
  }
}

// Singleton
export const vectorStore = new VectorStore();
