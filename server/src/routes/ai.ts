import { Router, Request, Response, NextFunction } from 'express';
import { GoogleGenAI } from '@google/genai';
import { generateEmbedding } from '../services/embeddings';
import { vectorStore } from '../services/vectorStore';
import { getDb } from '../db/client';

const router = Router();

function getGenAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');
  return new GoogleGenAI({ apiKey });
}

// POST /api/ai/chat — streaming AI chat with note context injection
router.post('/chat', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { message, history = [] } = req.body as {
      message: string;
      history?: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>;
    };

    if (!message?.trim()) {
      res.status(400).json({ error: { message: 'Message is required', code: 'VALIDATION_ERROR' } });
      return;
    }

    // ── Retrieve relevant note context ──────────────────────────────────────
    let contextBlock = '';
    if (vectorStore.size > 0) {
      const queryVector = await generateEmbedding(message.trim());
      const hits = vectorStore.search(queryVector, 3);

      if (hits.length > 0) {
        const db = getDb();
        const placeholders = hits.map(() => '?').join(', ');
        const rows = db
          .prepare(
            `SELECT title, content FROM notes WHERE id IN (${placeholders})`
          )
          .all(...hits.map((h) => h.noteId)) as unknown as Array<{ title: string; content: string }>;

        contextBlock = rows
          .map((r) => `## ${r.title}\n${r.content.slice(0, 1000)}`)
          .join('\n\n---\n\n');
      }
    }

    const systemInstruction = contextBlock
      ? `You are PKOS — an intelligent assistant for a Personal Knowledge Operating System.
You have access to the user's notes. Use the context below to answer questions about their knowledge base.
Be concise, insightful, and reference specific notes when relevant.

<KNOWLEDGE_CONTEXT>
${contextBlock}
</KNOWLEDGE_CONTEXT>`
      : `You are PKOS — an intelligent assistant for a Personal Knowledge Operating System.
Help the user think, write, and organize their knowledge. The knowledge base is currently empty — encourage them to create some notes!`;

    // ── Set up SSE streaming ────────────────────────────────────────────────
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering on Render

    const genai = getGenAI();

    const chatHistory = history.slice(-10); // Keep last 10 turns for context

    const streamResult = await genai.models.generateContentStream({
      model: 'gemini-3.5-flash',
      config: { systemInstruction },
      contents: [
        ...chatHistory,
        { role: 'user', parts: [{ text: message }] },
      ],
    });

    for await (const chunk of streamResult) {
      // chunk.text is a property (getter), not a method, in @google/genai
      const chunkText = typeof chunk.text === 'function'
        ? (chunk.text as unknown as () => string)()
        : (chunk.text as unknown as string | undefined);
      if (chunkText) {
        res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    // If headers already sent, end the stream with an error event
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: 'Stream error occurred' })}\n\n`);
      res.end();
    } else {
      next(err);
    }
  }
});

export default router;
