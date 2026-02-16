'use client';

import { useState, useCallback, useEffect } from 'react';
import { Link2, BookOpen, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Story } from '@/lib/types';
import { saveStory } from '@/app/actions';
import { generateId } from '@/lib/utils'; // Keeping generateId for now, or move it to utils

interface StoryImportProps {
  onStoryImported: (story: Story) => void;
}

export default function StoryImport({ onStoryImported }: StoryImportProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Manual import state
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualAuthor, setManualAuthor] = useState('');
  const [manualContent, setManualContent] = useState('');

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
        throw new Error(`Server returned ${res.status} ${res.statusText}`);
      }

      if (!res.ok) {
        if (res.status === 403 || res.status === 422) {
             setError(data.error || "This site blocks automated access.");
             // Automatically show manual input on these specific errors
             setShowManualInput(true); 
             // Pre-fill URL if we can
             return; 
        }
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

      await saveStory(story);
      setSuccess(`"${story.title}" imported successfully!`);
      setUrl('');
      onStoryImported(story);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import story');
    } finally {
      setLoading(false);
    }
  }, [url, loading, onStoryImported]);

  const handleManualImport = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle.trim() || !manualContent.trim()) return;

    setLoading(true);
    setError(null);

    try {
        const wordCount = manualContent.split(/\s+/).filter(Boolean).length;
        const excerpt = manualContent.substring(0, 200) + '...';
        
        const story: Story = {
            id: generateId(),
            title: manualTitle.trim(),
            author: manualAuthor.trim() || 'Unknown Author',
            content: `<p>${manualContent.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br />')}</p>`, // Simple formatting
            excerpt: excerpt,
            siteName: 'Manual Import',
            url: url.trim() || '',
            savedAt: Date.now(),
            wordCount: wordCount,
        };

        await saveStory(story);
        setSuccess(`"${story.title}" imported successfully!`);
        
        // Reset fields
        setManualTitle('');
        setManualAuthor('');
        setManualContent('');
        setShowManualInput(false);
        setUrl('');
        
        onStoryImported(story);
    } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save manual story');
    } finally {
        setLoading(false);
    }

  }, [manualTitle, manualAuthor, manualContent, url, onStoryImported]);


  return (
    <div>
      {!showManualInput ? (
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
            <div style={{marginTop: '0.5rem', textAlign: 'center'}}>
                <button 
                    type="button" 
                    className="btn btn-link" 
                    style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}
                    onClick={() => setShowManualInput(true)}
                >
                    Or paste text manually
                </button>
            </div>
          </form>
      ) : (
          <form className="import-form manual-import-form" onSubmit={handleManualImport} style={{display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem'}}>
                  <h3 style={{margin: 0, fontSize: '1.1rem'}}>Manual Import</h3>
                  <button 
                    type="button" 
                    className="btn btn-ghost btn-sm"
                    onClick={() => setShowManualInput(false)}
                  >
                    Cancel
                  </button>
              </div>
              
              <div className="form-group">
                <input
                    type="text"
                    className="import-input"
                    placeholder="Story Title"
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                    required
                    style={{width: '100%'}}
                />
              </div>
              
              <div className="form-group">
                <input
                    type="text"
                    className="import-input"
                    placeholder="Author"
                    value={manualAuthor}
                    onChange={(e) => setManualAuthor(e.target.value)}
                    style={{width: '100%'}}
                />
              </div>

               <div className="form-group">
                <textarea
                    className="import-input"
                    placeholder="Paste story content here..."
                    value={manualContent}
                    onChange={(e) => setManualContent(e.target.value)}
                    required
                    style={{width: '100%', minHeight: '200px', fontFamily: 'inherit', resize: 'vertical'}}
                />
              </div>

               <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading || !manualTitle.trim() || !manualContent.trim()}
                  style={{alignSelf: 'flex-end'}}
                >
                  {loading ? 'Saving...' : 'Save Story'}
                </button>
          </form>
      )}

      {loading && !showManualInput && (
        <div className="status-message status-loading">
          <div className="spinner" />
          Fetching and extracting story content...
        </div>
      )}

      {error && (
        <div className="status-message status-error">
          <AlertCircle size={16} />
          {error}
           {!showManualInput && (
               <div style={{marginTop: '0.5rem'}}>
                   <button 
                    className="btn btn-sm btn-outline"
                    onClick={() => setShowManualInput(true)}
                   >
                       Try Manual Import
                   </button>
               </div>
           )}
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
