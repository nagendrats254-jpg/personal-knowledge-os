import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import helmet from 'helmet';
import morgan from 'morgan';
import { configureCors } from './middleware/cors';
import { errorHandler } from './middleware/errorHandler';
import notesRouter from './routes/notes';
import searchRouter from './routes/search';
import graphRouter from './routes/graph';
import aiRouter from './routes/ai';
import importRouter from './routes/import';
import { runMigrations } from './db/migrations';
import { loadAllEmbeddings, reembedMissingNotes } from './services/embeddings';

const app = express();
const PORT = process.env.PORT ?? 3001;

// ── Security & Logging ──────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: false, // Allow inline scripts for React SPA
  })
);
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── CORS ─────────────────────────────────────────────────────────────────────
app.use(configureCors());

// ── Body Parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/notes', notesRouter);
app.use('/api/search', searchRouter);
app.use('/api/graph', graphRouter);
app.use('/api/ai', aiRouter);
app.use('/api/import', importRouter);

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Serve React SPA (production) ──────────────────────────────────────────────
const clientPath = path.join(__dirname, 'public');
if (fs.existsSync(clientPath)) {
  app.use(express.static(clientPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientPath, 'index.html'));
  });
}

// ── Error Handler ─────────────────────────────────────────────────────────────
app.use(errorHandler);

// ── Bootstrap ─────────────────────────────────────────────────────────────────
async function bootstrap() {
  try {
    runMigrations();
    console.log('✅ Database migrations complete');
    loadAllEmbeddings();
    reembedMissingNotes().catch(err => console.error('Background re-embedding failed:', err));

    app.listen(PORT, () => {
      console.log(`🚀 PKOS Server running on port ${PORT}`);
      console.log(`📂 Database path: ${process.env.DB_PATH ?? './pkos.db'}`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

bootstrap();
