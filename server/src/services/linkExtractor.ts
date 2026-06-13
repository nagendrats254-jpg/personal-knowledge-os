import { getDb } from '../db/client';

/**
 * Extracts [[wikilink]] references from note content and
 * upserts them as edges in the note_links table.
 */
export function extractAndSaveLinks(sourceId: string, content: string): void {
  const db = getDb();

  // Match all [[Note Title]] patterns
  const wikilinkRegex = /\[\[([^\]]+)\]\]/g;
  const referencedTitles: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = wikilinkRegex.exec(content)) !== null) {
    referencedTitles.push(match[1].trim());
  }

  // Remove old links from this source
  db.prepare('DELETE FROM note_links WHERE source_id = ?').run(sourceId);

  if (referencedTitles.length === 0) return;

  // Look up target note IDs by title
  const insertLink = db.prepare(`
    INSERT OR IGNORE INTO note_links (source_id, target_id)
    SELECT ?, id FROM notes WHERE title = ? AND id != ?
  `);

  try {
    db.exec('BEGIN IMMEDIATE');
    for (const title of referencedTitles) {
      insertLink.run(sourceId, title, sourceId);
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

/**
 * Returns a list of all [[title]] references in content that
 * don't yet have a matching note (for UI warnings).
 */
export function findBrokenLinks(content: string, allTitles: Set<string>): string[] {
  const wikilinkRegex = /\[\[([^\]]+)\]\]/g;
  const broken: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = wikilinkRegex.exec(content)) !== null) {
    const title = match[1].trim();
    if (!allTitles.has(title)) {
      broken.push(title);
    }
  }

  return [...new Set(broken)];
}

import { vectorStore } from './vectorStore';

/**
 * Automatically creates semantic edges between notes based on their embedding similarity.
 * Returns { source, target } pairs.
 */
export function generateSemanticLinks(threshold: number = 0.55): Array<{ source: string; target: string }> {
  const edges: Array<{ source: string; target: string }> = [];
  const entries = vectorStore.getAll();

  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const sim = vectorStore.calculateSimilarity(entries[i].vector, entries[j].vector);
      if (sim > threshold) {
        edges.push({ source: entries[i].noteId, target: entries[j].noteId });
      }
    }
  }

  return edges;
}
