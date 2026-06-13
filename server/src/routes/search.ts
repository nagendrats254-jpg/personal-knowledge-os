import { Router, Request, Response, NextFunction } from 'express';
import { getDb } from '../db/client';
import { generateEmbedding } from '../services/embeddings';
import { vectorStore } from '../services/vectorStore';

const router = Router();

// POST /api/search — semantic search over notes
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { query, topK = 8 } = req.body as { query: string; topK?: number };

    if (!query?.trim()) {
      res.status(400).json({ error: { message: 'Query is required', code: 'VALIDATION_ERROR' } });
      return;
    }

    if (vectorStore.size === 0) {
      res.json({ results: [], message: 'No notes indexed yet. Create some notes first.' });
      return;
    }

    // Embed the search query
    const queryVector = await generateEmbedding(query.trim());

    // Find most similar notes
    const hits = vectorStore.search(queryVector, Math.min(topK, 20));

    if (hits.length === 0) {
      res.json({ results: [] });
      return;
    }

    // Fetch note metadata for results
    const db = getDb();
    const placeholders = hits.map(() => '?').join(', ');
    const noteIds = hits.map((h) => h.noteId);

    const rows = db
      .prepare(
        `SELECT id, title, tags, updated_at, substr(content, 1, 300) AS preview
         FROM notes WHERE id IN (${placeholders})`
      )
      .all(...noteIds) as unknown as Array<{
      id: string;
      title: string;
      tags: string;
      updated_at: string;
      preview: string;
    }>;

    // Map scores back and sort by similarity
    const scoreMap = new Map(hits.map((h) => [h.noteId, h.score]));
    const results = rows
      .map((r) => ({
        id: r.id,
        title: r.title,
        tags: JSON.parse(r.tags) as string[],
        preview: r.preview,
        updatedAt: r.updated_at,
        score: scoreMap.get(r.id) ?? 0,
      }))
      .sort((a, b) => b.score - a.score);

    res.json({ results });
  } catch (err) {
    next(err);
  }
});

export default router;
