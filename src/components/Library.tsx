'use client';

import { useState } from 'react';
import { Story } from '@/lib/types';
import { getProgress, updateStoryMeta, saveProgress } from '@/lib/storage';
import { BookOpen, Clock, Globe, Trash2, ExternalLink, Pencil, Check, X } from 'lucide-react';

interface LibraryProps {
  stories: Story[];
  onOpenStory: (id: string) => void;
  onDeleteStory: (id: string) => void;
  pendingDeleteId: string | null;
  onStoriesChanged?: () => void;
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

function estimateReadTime(wordCount: number): string {
  const mins = Math.ceil(wordCount / 250);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hours}h ${rem}m` : `${hours}h`;
}

export default function Library({ stories, onOpenStory, onDeleteStory, pendingDeleteId, onStoriesChanged }: LibraryProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAuthor, setEditAuthor] = useState('');
  const [editSiteName, setEditSiteName] = useState('');

  const startEditing = (story: Story) => {
    setEditingId(story.id);
    setEditTitle(story.title);
    setEditAuthor(story.author);
    setEditSiteName(story.siteName);
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const saveEditing = (id: string) => {
    updateStoryMeta(id, {
      title: editTitle.trim(),
      author: editAuthor.trim(),
      siteName: editSiteName.trim(),
    });
    setEditingId(null);
    onStoriesChanged?.();
  };

  if (stories.length === 0) {
    return (
      <div className="empty-library">
        <div className="empty-library-icon">📚</div>
        <h3>Your library is empty</h3>
        <p>Import a story from the URL bar above to get started</p>
      </div>
    );
  }

  return (
    <div className="library-grid">
      {stories.map((story) => {
        const progress = getProgress(story.id);
        const progressPct = progress
          ? Math.round((progress.currentPage / Math.max(progress.totalPages, 1)) * 100)
          : 0;
        const isEditing = editingId === story.id;

        return (
          <div
            key={story.id}
            className="story-card"
            onClick={() => !isEditing && onOpenStory(story.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && !isEditing && onOpenStory(story.id)}
          >
            {isEditing ? (
              /* ---- EDIT MODE ---- */
              <div className="story-card-edit" onClick={(e) => e.stopPropagation()}>
                <div className="edit-field">
                  <label className="edit-label">Title</label>
                  <input
                    className="edit-input"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEditing(story.id);
                      if (e.key === 'Escape') cancelEditing();
                    }}
                  />
                </div>
                <div className="edit-field">
                  <label className="edit-label">Author</label>
                  <input
                    className="edit-input"
                    value={editAuthor}
                    onChange={(e) => setEditAuthor(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEditing(story.id);
                      if (e.key === 'Escape') cancelEditing();
                    }}
                  />
                </div>
                <div className="edit-field">
                  <label className="edit-label">Magazine</label>
                  <input
                    className="edit-input"
                    value={editSiteName}
                    onChange={(e) => setEditSiteName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEditing(story.id);
                      if (e.key === 'Escape') cancelEditing();
                    }}
                  />
                </div>
                <div className="edit-actions">
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => saveEditing(story.id)}
                  >
                    <Check size={14} /> Save
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={cancelEditing}
                  >
                    <X size={14} /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* ---- VIEW MODE ---- */
              <>
                <div className="story-card-title">{story.title}</div>
                {story.author && (
                  <div className="story-card-author">by {story.author}</div>
                )}
                <div className="story-card-meta">
                  <span>
                    <Globe size={13} />
                    {story.siteName}
                  </span>
                  <span>
                    <Clock size={13} />
                    {estimateReadTime(story.wordCount)}
                  </span>
                  <span>
                    <BookOpen size={13} />
                    {story.wordCount.toLocaleString()} words
                  </span>
                  {story.isRead && (
                    <span style={{ color: 'var(--success)', fontWeight: 600 }}>
                      <Check size={13} />
                      Read
                    </span>
                  )}
                </div>

                <div className="progress-bar-container">
                  <div
                    className="progress-bar"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>

                <div className="story-card-actions">
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (story.isRead) {
                        // Reset progress if starting again
                        saveProgress({
                          storyId: story.id,
                          currentPage: 0,
                          totalPages: 1, // Will be updated by reader
                          lastReadAt: Date.now()
                        });
                      }
                      onOpenStory(story.id);
                    }}
                  >
                    {progressPct > 0 && progressPct < 100 ? 'Resume' : story.isRead ? 'Read Again' : 'Start Reading'}
                  </button>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      className="btn-icon"
                      title="Edit details"
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditing(story);
                      }}
                    >
                      <Pencil size={16} />
                    </button>
                    <a
                      href={story.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-icon"
                      title="Open original"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink size={16} />
                    </a>
                    <button
                      className="btn-icon btn-danger"
                      title={pendingDeleteId === story.id ? 'Click again to confirm' : 'Delete story'}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteStory(story.id);
                      }}
                      style={pendingDeleteId === story.id ? {
                        background: 'var(--danger)',
                        color: 'white',
                        borderRadius: '6px',
                        width: 'auto',
                        padding: '4px 10px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                      } : undefined}
                    >
                      {pendingDeleteId === story.id ? 'Delete?' : <Trash2 size={16} />}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
