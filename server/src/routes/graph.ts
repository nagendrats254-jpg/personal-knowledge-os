import { Router, Request, Response, NextFunction } from 'express';
import { getDb } from '../db/client';
import { generateSemanticLinks } from '../services/linkExtractor';

const router = Router();

// GET /api/graph — return all nodes and edges for D3 force graph
router.get('/', (_req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();

    const noteRows = db
      .prepare(
        `SELECT id, title, tags,
                (SELECT COUNT(*) FROM note_links WHERE source_id = notes.id OR target_id = notes.id) AS link_count
         FROM notes ORDER BY updated_at DESC`
      )
      .all() as unknown as Array<{ id: string; title: string; tags: string; link_count: number }>;

    const linkRows = db
      .prepare('SELECT source_id, target_id FROM note_links')
      .all() as unknown as Array<{ source_id: string; target_id: string }>;

    const nodes = noteRows.map((r) => ({
      id: r.id,
      title: r.title,
      tags: JSON.parse(r.tags) as string[],
      linkCount: r.link_count,
    }));

    const edges = [
      ...linkRows.map((r) => ({
        source: r.source_id,
        target: r.target_id,
      })),
      ...generateSemanticLinks() // auto-links
    ];

    res.json({ nodes, edges });
  } catch (err) {
    next(err);
  }
});

export default router;
