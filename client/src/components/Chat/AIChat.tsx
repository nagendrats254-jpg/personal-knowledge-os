import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Trash2 } from 'lucide-react';
import { streamChat, type ChatHistoryItem } from '../../api/pkosApi';
import type { ChatMessage } from '../../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const uid = () => crypto.randomUUID();

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: `Hello! I'm your **PKOS AI Assistant** 🧠

I have access to your entire knowledge base and can help you:
- **Answer questions** about your notes
- **Synthesize ideas** across multiple notes  
- **Find connections** between concepts
- **Help you write** and expand your thinking

What would you like to explore today?`,
  timestamp: new Date(),
};

export default function AIChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const buildHistory = (msgs: ChatMessage[]): ChatHistoryItem[] =>
    msgs
      .filter((m) => m.id !== 'welcome')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

  const handleSend = async () => {
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg: ChatMessage = {
      id: uid(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    const assistantMsg: ChatMessage = {
      id: uid(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput('');
    setStreaming(true);

    const history = buildHistory(messages);

    await streamChat(
      text,
      history,
      (token) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id ? { ...m, content: m.content + token } : m
          )
        );
      },
      () => setStreaming(false),
      (err) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id
              ? { ...m, content: `⚠️ Error: ${err}` }
              : m
          )
        );
        setStreaming(false);
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([WELCOME_MESSAGE]);
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto w-full">
      {/* Chat header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/[0.06] flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-aurora-gradient flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Gemini 3.5 Flash</p>
            <p className="text-[10px] text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Grounded in your notes
            </p>
          </div>
        </div>
        <button onClick={clearChat} className="btn-ghost text-xs" title="Clear conversation">
          <Trash2 className="w-3.5 h-3.5" />
          Clear
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 animate-fade-in ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {/* Avatar */}
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 self-start mt-0.5
                ${msg.role === 'assistant'
                  ? 'bg-aurora-500/20 border border-aurora-500/30'
                  : 'bg-pulse-500/20 border border-pulse-400/30'}`}
            >
              {msg.role === 'assistant'
                ? <Bot className="w-4 h-4 text-aurora-400" />
                : <User className="w-4 h-4 text-pulse-400" />}
            </div>

            {/* Bubble */}
            <div
              className={`max-w-[75%] rounded-xl px-4 py-3 text-sm
                ${msg.role === 'assistant'
                  ? 'glass-card text-slate-200'
                  : 'bg-aurora-500/20 border border-aurora-500/30 text-white'}`}
            >
              {msg.role === 'assistant' ? (
                msg.content ? (
                  <div className="prose-pkos text-sm">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-slate-500 py-1">
                    <span className="w-2 h-2 rounded-full bg-aurora-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-aurora-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-aurora-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                )
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="px-6 py-4 border-t border-white/[0.06] flex-shrink-0">
        <div className="flex items-end gap-3 glass-card p-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your notes… (Enter to send, Shift+Enter for newline)"
            rows={1}
            disabled={streaming}
            className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-600
                       focus:outline-none resize-none max-h-40 overflow-y-auto
                       disabled:opacity-50"
            style={{ minHeight: '24px' }}
            onInput={(e) => {
              const t = e.currentTarget;
              t.style.height = 'auto';
              t.style.height = `${Math.min(t.scrollHeight, 160)}px`;
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || streaming}
            className="btn-primary p-2 rounded-lg flex-shrink-0 self-end"
            title="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-slate-600 text-center mt-2">
          Powered by Gemini 3.5 Flash · Context from your top matching notes
        </p>
      </div>
    </div>
  );
}
