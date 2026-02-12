export interface Story {
  id: string;
  title: string;
  author: string;
  content: string;
  excerpt: string;
  siteName: string;
  url: string;
  savedAt: number;
  wordCount: number;
  isRead?: boolean;
  progress?: ReadingProgress;
}

export interface ReadingProgress {
  storyId: string;
  currentPage: number;
  totalPages: number;
  lastReadAt: number;
  scrollPosition?: number;
}

export interface ReaderSettings {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  theme: ThemeName;
  marginSize: 'compact' | 'normal' | 'wide';
}

export type ThemeName = 'light' | 'dark' | 'sepia' | 'midnight';

export interface ThemeColors {
  bg: string;
  text: string;
  accent: string;
  surface: string;
  border: string;
  muted: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}
