'use client';

import { useState, useEffect, useCallback } from 'react';
import { BookOpen } from 'lucide-react';
import { Story } from '@/lib/types';
import { getStories, deleteStory, getSettings, getCurrentUser, checkDbConnection } from '@/app/actions';
import StoryImport from '@/components/StoryImport';
import Library from '@/components/Library';
import Reader from '@/components/Reader';
import ChatBot from '@/components/ChatBot';
import UserMenu from '@/components/UserMenu';

export default function Home() {
  const [stories, setStories] = useState<Story[]>([]);
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [user, setUser] = useState<{name?: string | null, email?: string | null, image?: string | null} | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    getStories().then(setStories);

    // Apply saved theme
    getSettings().then(settings => {
        document.documentElement.setAttribute('data-theme', settings.theme);
    });

    getCurrentUser().then(setUser);
    
    // Debug DB connection
    checkDbConnection().then(res => {
        console.log('DB Check Result:', res);
    });
  }, []);

  const handleStoryImported = useCallback((story: Story) => {
    getStories().then(setStories);
  }, []);

  const handleOpenStory = useCallback((id: string) => {
    // We can rely on the `stories` state since it's kept up to date
    const s = stories.find((s) => s.id === id);
    if (s) setActiveStory(s);
  }, [stories]);

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const handleDeleteStory = useCallback((id: string) => {
    if (pendingDeleteId === id) {
      // Second click — actually delete
      deleteStory(id).then(() => {
        getStories().then(setStories);
      });
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
    setActiveStory(null);
    getStories().then(setStories);
    // Restore theme from settings
    getSettings().then(settings => {
        document.documentElement.setAttribute('data-theme', settings.theme);
    });
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
      <header className="app-header">
        <div className="header-content">
          <div className="logo">
            <BookOpen size={24} />
            <h1>StoryReader</h1>
          </div>
          <UserMenu user={user} />
        </div>
      </header>

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
              onStoriesChanged={() => getStories().then(setStories)}
            />
          </section>
        )}

        {stories.length === 0 && (
          <Library
            stories={[]}
            onOpenStory={handleOpenStory}
            onDeleteStory={handleDeleteStory}
            pendingDeleteId={pendingDeleteId}
            onStoriesChanged={() => getStories().then(setStories)}
          />
        )}

        <div style={{ height: '100px' }} />
      </main>

      <ChatBot />
    </>
  );
}
