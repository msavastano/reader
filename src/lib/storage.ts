import { Story, ReadingProgress, ReaderSettings, ThemeName } from './types';

const STORIES_KEY = 'storyreader_stories';
const PROGRESS_KEY = 'storyreader_progress';
const SETTINGS_KEY = 'storyreader_settings';
const CHAT_HISTORY_KEY = 'storyreader_chat';

export const DEFAULT_SETTINGS: ReaderSettings = {
  fontFamily: 'Literata',
  fontSize: 19,
  lineHeight: 1.8,
  theme: 'dark' as ThemeName,
  marginSize: 'normal',
};

// --- Stories ---

export function getStories(): Story[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(STORIES_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function getStory(id: string): Story | undefined {
  return getStories().find((s) => s.id === id);
}

export function saveStory(story: Story): void {
  const stories = getStories();
  const idx = stories.findIndex((s) => s.id === story.id);
  if (idx >= 0) {
    stories[idx] = story;
  } else {
    stories.unshift(story);
  }
  localStorage.setItem(STORIES_KEY, JSON.stringify(stories));
}

export function deleteStory(id: string): void {
  const stories = getStories().filter((s) => s.id !== id);
  localStorage.setItem(STORIES_KEY, JSON.stringify(stories));
  deleteProgress(id);
}

export function updateStoryMeta(id: string, meta: { title: string; author: string; siteName: string }): void {
  const stories = getStories();
  const idx = stories.findIndex((s) => s.id === id);
  if (idx >= 0) {
    stories[idx] = { ...stories[idx], ...meta };
    localStorage.setItem(STORIES_KEY, JSON.stringify(stories));
  }
}

export function markStoryAsRead(id: string, isRead: boolean): void {
  const stories = getStories();
  const idx = stories.findIndex((s) => s.id === id);
  if (idx >= 0) {
    stories[idx].isRead = isRead;
    localStorage.setItem(STORIES_KEY, JSON.stringify(stories));
  }
}

// --- Reading Progress ---

export function getProgress(storyId: string): ReadingProgress | undefined {
  if (typeof window === 'undefined') return undefined;
  const raw = localStorage.getItem(PROGRESS_KEY);
  const all: ReadingProgress[] = raw ? JSON.parse(raw) : [];
  return all.find((p) => p.storyId === storyId);
}

export function saveProgress(progress: ReadingProgress): void {
  const raw = localStorage.getItem(PROGRESS_KEY);
  const all: ReadingProgress[] = raw ? JSON.parse(raw) : [];
  const idx = all.findIndex((p) => p.storyId === progress.storyId);
  if (idx >= 0) {
    all[idx] = progress;
  } else {
    all.push(progress);
  }
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(all));
}

function deleteProgress(storyId: string): void {
  const raw = localStorage.getItem(PROGRESS_KEY);
  const all: ReadingProgress[] = raw ? JSON.parse(raw) : [];
  const filtered = all.filter((p) => p.storyId !== storyId);
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(filtered));
}

// --- Reader Settings ---

export function getSettings(): ReaderSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  const raw = localStorage.getItem(SETTINGS_KEY);
  return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
}

export function saveSettings(settings: ReaderSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// --- Chat History ---

export function getChatHistory(): { role: string; content: string }[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(CHAT_HISTORY_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function saveChatHistory(messages: { role: string; content: string }[]): void {
  // Keep only last 50 messages
  const trimmed = messages.slice(-50);
  localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(trimmed));
}

export function clearChatHistory(): void {
  localStorage.removeItem(CHAT_HISTORY_KEY);
}

// --- Utility ---

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}
