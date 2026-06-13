import { getDb } from './client';

export function runMigrations(): void {
  const db = getDb();

  db.exec(`
    -- Notes table: core content store
    CREATE TABLE IF NOT EXISTS notes (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      content     TEXT NOT NULL DEFAULT '',
      tags        TEXT NOT NULL DEFAULT '[]',  -- JSON array of strings
      created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );

    -- Embeddings table: vector per note for semantic search
    CREATE TABLE IF NOT EXISTS embeddings (
      note_id     TEXT PRIMARY KEY REFERENCES notes(id) ON DELETE CASCADE,
      vector      TEXT NOT NULL,  -- JSON array of floats (768-dim)
      updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );

    -- Note links table: edges for the knowledge graph
    CREATE TABLE IF NOT EXISTS note_links (
      source_id   TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
      target_id   TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
      PRIMARY KEY (source_id, target_id)
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_note_links_source ON note_links(source_id);
    CREATE INDEX IF NOT EXISTS idx_note_links_target ON note_links(target_id);
  `);
}
