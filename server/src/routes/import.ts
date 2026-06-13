import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import * as cheerio from 'cheerio';
import { GoogleGenAI } from '@google/genai';
import { getDb } from '../db/client';
import { embedNote } from '../services/embeddings';
import { extractAndSaveLinks } from '../services/linkExtractor';

const router = Router();

// Multer memory storage (limit 20MB for Gemini inline data)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

function getGenAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');
  return new GoogleGenAI({ apiKey });
}

// POST /api/import/file
router.post('/file', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: { message: 'No file uploaded' } });
      return;
    }

    const { buffer, mimetype, originalname } = req.file;
    const base64Data = buffer.toString('base64');
    
    let prompt = `Extract the contents of this file (perform OCR, transcription, or text extraction as needed) and format it into a clean, well-structured Markdown document. Do not include any conversational filler, just the markdown document. Ensure it has a # Title at the top.`;

    const genai = getGenAI();
    const result = await genai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { data: base64Data, mimeType: mimetype } },
            { text: prompt }
          ]
        }
      ]
    });

    // Extract text safely using the getter property trick
    const chunkText = typeof result.text === 'function' 
      ? (result.text as unknown as () => string)() 
      : (result.text as unknown as string | undefined);

    const markdownText = chunkText?.trim() || `# Imported File: ${originalname}\n\nCould not extract content.`;
    
    // Create new note
    const id = crypto.randomUUID();
    const titleMatch = markdownText.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : originalname;
    // Add tag based on mimetype
    let tag = '#import';
    if (mimetype.startsWith('audio/')) tag = '#voice-note';
    else if (mimetype.startsWith('image/')) tag = '#image-ocr';
    else if (mimetype === 'application/pdf') tag = '#pdf-import';

    const finalContent = `${markdownText}\n\n${tag}`;

    const db = getDb();
    db.prepare('INSERT INTO notes (id, title, content, tags, updated_at) VALUES (?, ?, ?, ?, ?)').run(
      id, title, finalContent, JSON.stringify([tag.replace('#', '')]), new Date().toISOString()
    );

    extractAndSaveLinks(id, finalContent);

    // Run embedding sync so it's searchable immediately
    try {
      await embedNote(id, title, finalContent);
    } catch (e) {
      console.warn(`⚠️ Embedding failed for import ${id}:`, e);
    }

    res.status(201).json({ id, title, content: finalContent });
  } catch (err) {
    next(err);
  }
});

// POST /api/import/url
router.post('/url', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { url } = req.body;
    if (!url) {
      res.status(400).json({ error: { message: 'URL is required' } });
      return;
    }

    const response = await fetch(url, { headers: { 'User-Agent': 'PKOS Bot' } });
    if (!response.ok) {
      res.status(400).json({ error: { message: `Failed to fetch URL: ${response.status}` } });
      return;
    }
    const html = await response.text();

    // Clean HTML with cheerio
    const $ = cheerio.load(html);
    $('script, style, noscript, iframe, svg, img, nav, footer, header').remove();
    const cleanText = $('body').text().replace(/\\s+/g, ' ').trim();

    const genai = getGenAI();
    const result = await genai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `You are an expert content extractor. Extract the main article/content from the following raw website text and format it into a clean, well-structured Markdown document. Do not include conversational filler. Ensure it has a # Title at the top. Original URL: ${url}\n\nRAW TEXT:\n${cleanText.slice(0, 100000)}` // Slice to avoid exceeding token limits accidentally
    });

    const chunkText = typeof result.text === 'function' 
      ? (result.text as unknown as () => string)() 
      : (result.text as unknown as string | undefined);

    const markdownText = chunkText?.trim() || `# Imported Website\n\nCould not extract content from ${url}`;
    
    // Create new note
    const id = crypto.randomUUID();
    const titleMatch = markdownText.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : url;
    
    const finalContent = `${markdownText}\n\n[Source](${url}) #website-import`;

    const db = getDb();
    db.prepare('INSERT INTO notes (id, title, content, tags, updated_at) VALUES (?, ?, ?, ?, ?)').run(
      id, title, finalContent, JSON.stringify(['website-import']), new Date().toISOString()
    );

    extractAndSaveLinks(id, finalContent);

    try {
      await embedNote(id, title, finalContent);
    } catch (e) {
      console.warn(`⚠️ Embedding failed for import ${id}:`, e);
    }

    res.status(201).json({ id, title, content: finalContent });
  } catch (err) {
    next(err);
  }
});

export default router;
