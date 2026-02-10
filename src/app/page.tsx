'use client';

import { useState, useEffect, useCallback } from 'react';
import { BookOpen } from 'lucide-react';
import { Story } from '@/lib/types';
import { getStories, deleteStory, getSettings } from '@/lib/storage';
import StoryImport from '@/components/StoryImport';
import Library from '@/components/Library';
import Reader from '@/components/Reader';
import ChatBot from '@/components/ChatBot';

export default function Home() {
  const [stories, setStories] = useState<Story[]>([]);
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setStories(getStories());

    // Apply saved theme
    const settings = getSettings();
    document.documentElement.setAttribute('data-theme', settings.theme);
  }, []);

  const handleStoryImported = useCallback((story: Story) => {
    setStories(getStories());
  }, []);

  const handleOpenStory = useCallback((id: string) => {
    const s = getStories().find((s) => s.id === id);
    if (s) setActiveStory(s);
  }, []);

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const handleDeleteStory = useCallback((id: string) => {
    if (pendingDeleteId === id) {
      // Second click — actually delete
      deleteStory(id);
      setStories(getStories());
      setPendingDeleteId(null);
    } else {
      // First click — mark as pending
      setPendingDeleteId(id);
      // Auto-reset after 3 seconds if not confirmed
      setTimeout(() => setPendingDeleteId((prev) => (prev === id ? null : prev)), 3000);
    }
  }, [pendingDeleteId]);

  const handleBack = useCallback(() => {
    setActiveStory(null);
    setStories(getStories());
    // Restore theme from settings
    const settings = getSettings();
    document.documentElement.setAttribute('data-theme', settings.theme);
  }, []);

  if (!mounted) {
    return null; // Prevent hydration mismatch
  }

  // If a story is active, show the reader
  if (activeStory) {
    return <Reader story={activeStory} onBack={handleBack} />;
  }

  return (
    <>
      <nav className="navbar">
        <div className="navbar-inner">
          <a href="/" className="navbar-brand">
            <BookOpen size={24} className="brand-icon" />
            StoryDrift
          </a>
        </div>
      </nav>

      <main className="app-container">
        <section className="hero">
          <h1 className="hero-title">Read stories,<br />not web pages</h1>
          <p className="hero-subtitle">
            Paste a URL from Clarkesworld, Lightspeed, Tor.com, or any online magazine.
            We&apos;ll extract the story and give you a beautiful reading experience.
          </p>

          <StoryImport onStoryImported={handleStoryImported} />
        </section>

        {stories.length > 0 && (
          <section>
            <div className="section-header">
              <h2 className="section-title">Your Library</h2>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                {stories.length} {stories.length === 1 ? 'story' : 'stories'}
              </span>
            </div>
            <Library
              stories={stories}
              onOpenStory={handleOpenStory}
              onDeleteStory={handleDeleteStory}
              pendingDeleteId={pendingDeleteId}
              onStoriesChanged={() => setStories(getStories())}
            />
          </section>
        )}

        {stories.length === 0 && (
          <Library
            stories={[]}
            onOpenStory={handleOpenStory}
            onDeleteStory={handleDeleteStory}
            pendingDeleteId={pendingDeleteId}
            onStoriesChanged={() => setStories(getStories())}
          />
        )}

        <div style={{ height: '100px' }} />
      </main>

      <ChatBot />
    </>
  );
}
