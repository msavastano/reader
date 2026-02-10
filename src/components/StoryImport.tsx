'use client';

import { useState, useCallback, useEffect } from 'react';
import { Link2, BookOpen, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Story } from '@/lib/types';
import { saveStory, generateId } from '@/lib/storage';

interface StoryImportProps {
  onStoryImported: (story: Story) => void;
}

export default function StoryImport({ onStoryImported }: StoryImportProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const handleImport = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || loading) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });

      let data;
      try {
        data = await res.json();
      } catch {
        // Response was not JSON (e.g. generic HTML error page)
        throw new Error(`Server returned ${res.status} ${res.statusText}`);
      }

      if (!res.ok) {
        throw new Error(data.error || `Failed to import: ${res.status} ${res.statusText}`);
      }

      const story: Story = {
        id: generateId(),
        title: data.title,
        author: data.author,
        content: data.content,
        excerpt: data.excerpt,
        siteName: data.siteName,
        url: url.trim(),
        savedAt: Date.now(),
        wordCount: data.wordCount,
      };

      saveStory(story);
      setSuccess(`"${story.title}" imported successfully!`);
      setUrl('');
      onStoryImported(story);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import story');
    } finally {
      setLoading(false);
    }
  }, [url, loading, onStoryImported]);

  return (
    <div>
      <form className="import-form" onSubmit={handleImport}>
        <div className="import-input-wrapper">
          <Link2 size={18} className="import-input-icon" />
          <input
            type="url"
            className="import-input"
            placeholder="Paste a story URL from Clarkesworld, Lightspeed, Tor.com..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={loading}
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary import-btn"
          disabled={loading || !url.trim()}
        >
          {loading ? (
            <>
              <Loader2 size={18} className="spinning" style={{ animation: 'spin 0.7s linear infinite' }} />
              Importing...
            </>
          ) : (
            <>
              <BookOpen size={18} />
              Import Story
            </>
          )}
        </button>
      </form>

      {loading && (
        <div className="status-message status-loading">
          <div className="spinner" />
          Fetching and extracting story content...
        </div>
      )}

      {error && (
        <div className="status-message status-error">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {success && (
        <div className="status-message status-success">
          <CheckCircle2 size={16} />
          {success}
        </div>
      )}
    </div>
  );
}
