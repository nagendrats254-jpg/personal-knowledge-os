import React, { useState, useRef } from 'react';
import { UploadCloud, Link as LinkIcon, X, Loader2 } from 'lucide-react';
import { importApi } from '../../api/pkosApi';
import type { Note } from '../../types';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (note: Note) => void;
}

export default function ImportModal({ isOpen, onClose, onImportSuccess }: ImportModalProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    try {
      const note = await importApi.file(file);
      onImportSuccess(note);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to upload file');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const note = await importApi.url(url.trim());
      onImportSuccess(note);
      setUrl('');
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to import URL');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden relative">
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6">
          <h2 className="text-xl font-semibold text-white mb-6">Omni-Import</h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-6">
            {/* File Upload Section */}
            <div>
              <p className="text-sm font-medium text-slate-300 mb-2">Upload File</p>
              <p className="text-xs text-slate-500 mb-3">Supported: PDF, Images (PNG/JPG), Audio (MP3/WAV)</p>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="application/pdf,image/*,audio/*"
                disabled={loading}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="w-full flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-slate-700 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                ) : (
                  <UploadCloud className="w-8 h-8 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                )}
                <span className="text-sm text-slate-400 font-medium group-hover:text-emerald-400 transition-colors">
                  {loading ? 'Processing with AI...' : 'Click or drag file to upload'}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-800" />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">OR</span>
              <div className="flex-1 h-px bg-slate-800" />
            </div>

            {/* URL Section */}
            <form onSubmit={handleUrlSubmit}>
              <p className="text-sm font-medium text-slate-300 mb-2">Import from Website</p>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/article"
                  disabled={loading}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 placeholder-slate-500 disabled:opacity-50"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading || !url.trim()}
                className="mt-3 w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 text-white font-medium py-2.5 rounded-lg transition-colors flex justify-center items-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Extract Article
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
