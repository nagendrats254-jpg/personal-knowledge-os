import { Router, Request, Response, NextFunction } from 'express';
import { getDb } from '../db/client';
import { embedNote, deleteEmbedding } from '../services/embeddings';
import { extractAndSaveLinks } from '../services/linkExtractor';

const router = Router();

interface NoteRow {
  id: string;
  title: string;
  content: string;
  tags: string;
  created_at: string;
  updated_at: string;
}

function parseNote(row: NoteRow) {
  return {
    ...row,
    tags: JSON.parse(row.tags) as string[],
  };
}

// GET /api/notes — list all notes (lightweight, no full content)
router.get('/', (_req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const rows = db
      .prepare(
        `SELECT id, title, tags, created_at, updated_at,
                substr(content, 1, 200) AS preview
         FROM notes ORDER BY updated_at DESC`
      )
      .all() as unknown as Array<NoteRow & { preview: string }>;

    res.json(
      rows.map((r) => ({
        id: r.id,
        title: r.title,
        tags: JSON.parse(r.tags) as string[],
        preview: r.preview,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }))
    );
  } catch (err) {
    next(err);
  }
});

// GET /api/notes/:id — get a single note with full content
router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const row = db
      .prepare('SELECT * FROM notes WHERE id = ?')
      .get(req.params.id) as unknown as NoteRow | undefined;

    if (!row) {
      res.status(404).json({ error: { message: 'Note not found', code: 'NOT_FOUND' } });
      return;
    }
    res.json(parseNote(row));
  } catch (err) {
    next(err);
  }
});

// POST /api/notes — create a new note
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, content = '', tags = [] } = req.body as {
      title: string;
      content?: string;
      tags?: string[];
    };

    if (!title?.trim()) {
      res.status(400).json({ error: { message: 'Title is required', code: 'VALIDATION_ERROR' } });
      return;
    }

    const id = crypto.randomUUID();
    const db = getDb();

    db.prepare(
      `INSERT INTO notes (id, title, content, tags) VALUES (?, ?, ?, ?)`
    ).run(id, title.trim(), content, JSON.stringify(tags));

    // Extract wikilinks and save graph edges
    extractAndSaveLinks(id, content);

    // Generate and save embedding (non-blocking — don't fail note creation)
    embedNote(id, title, content).catch((err) =>
      console.error(`⚠️  Embedding failed for note ${id}:`, err)
    );

    const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(id) as unknown as NoteRow;
    res.status(201).json(parseNote(note));
  } catch (err) {
    next(err);
  }
});

// PUT /api/notes/:id — update a note
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const existing = db
      .prepare('SELECT * FROM notes WHERE id = ?')
      .get(req.params.id) as unknown as NoteRow | undefined;

    if (!existing) {
      res.status(404).json({ error: { message: 'Note not found', code: 'NOT_FOUND' } });
      return;
    }

    const { title, content, tags } = req.body as {
      title?: string;
      content?: string;
      tags?: string[];
    };

    const newTitle = title?.trim() ?? existing.title;
    const newContent = content ?? existing.content;
    const newTags = tags ?? (JSON.parse(existing.tags) as string[]);

    db.prepare(
      `UPDATE notes
       SET title = ?, content = ?, tags = ?,
           updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
       WHERE id = ?`
    ).run(newTitle, newContent, JSON.stringify(newTags), req.params.id);

    // Re-extract wikilinks
    extractAndSaveLinks(req.params.id, newContent);

    // Re-embed asynchronously
    embedNote(req.params.id, newTitle, newContent).catch((err) =>
      console.error(`⚠️  Re-embedding failed for note ${req.params.id}:`, err)
    );

    const updated = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id) as unknown as NoteRow;
    res.json(parseNote(updated));
  } catch (err) {
    next(err);
  }
});

// DELETE /api/notes/:id — delete a note
router.delete('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const existing = db
      .prepare('SELECT id FROM notes WHERE id = ?')
      .get(req.params.id);

    if (!existing) {
      res.status(404).json({ error: { message: 'Note not found', code: 'NOT_FOUND' } });
      return;
    }

    // CASCADE on foreign keys handles embeddings + note_links cleanup
    db.prepare('DELETE FROM notes WHERE id = ?').run(req.params.id);
    deleteEmbedding(req.params.id);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
