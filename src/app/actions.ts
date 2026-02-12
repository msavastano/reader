'use server';

import { db } from '@/db';
import { stories, readingProgress, settings, chatHistory } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { auth, signIn, signOut } from '@/auth';
import { revalidatePath } from 'next/cache';
import { Story, ReadingProgress, ReaderSettings, ThemeName, ChatMessage } from '@/lib/types';
import * as schema from '@/db/schema';

// --- Helpers ---

async function getUserId() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }
  return session.user.id;
}

export async function login() {
  try {
    await signIn('google');
  } catch (error) {
    // Signin can return a response, or throw an error (e.g. redirect)
    // We need to rethrow it if it's a redirect, otherwise log it.
    if ((error as Error).message === 'NEXT_REDIRECT') {
        throw error;
    }
    console.error('Login error:', error);
    throw error;
  }
}

export async function logout() {
  await signOut();
}

export async function getCurrentUser() {
  const session = await auth();
  return session?.user || null;
}

// --- Stories ---

export async function getStories(): Promise<Story[]> {
  try {
    const userId = await getUserId();
    const dbStories = await db.query.stories.findMany({
      where: eq(stories.userId, userId),
      orderBy: [desc(stories.savedAt)],
    });

    const progressList = await db.query.readingProgress.findMany({
        where: eq(readingProgress.userId, userId),
    });

    const progressMap = new Map<string, typeof readingProgress.$inferSelect>();
    progressList.forEach((p: typeof readingProgress.$inferSelect) => progressMap.set(p.storyId, p));

    return dbStories.map((s: typeof stories.$inferSelect) => {
        const p = progressMap.get(s.id);
        
        return {
            id: s.id,
            title: s.title,
            author: s.author || '',
            content: s.content,
            excerpt: s.excerpt || '',
            siteName: s.siteName || '',
            url: s.url || '',
            savedAt: s.savedAt.getTime(),
            wordCount: s.wordCount || 0,
            isRead: s.isRead || false,
            progress: p ? {
                storyId: p.storyId,
                currentPage: p.currentPage,
                totalPages: p.totalPages,
                lastReadAt: p.lastReadAt.getTime(),
                scrollPosition: p.scrollPosition || 0,
            } : undefined
        };
    });
  } catch (error) {
    console.error('Failed to get stories:', error);
    return [];
  }
}

export async function saveStory(story: Story): Promise<void> {
  const userId = await getUserId();
  
  await db
    .insert(stories)
    .values({
      id: story.id,
      userId,
      title: story.title,
      author: story.author,
      content: story.content,
      excerpt: story.excerpt,
      siteName: story.siteName,
      url: story.url,
      savedAt: new Date(story.savedAt),
      wordCount: story.wordCount,
      isRead: story.isRead,
    })
    .onConflictDoUpdate({
      target: stories.id,
      set: {
        title: story.title,
        author: story.author,
        content: story.content,
        excerpt: story.excerpt,
        siteName: story.siteName,
        url: story.url,
        savedAt: new Date(story.savedAt),
        wordCount: story.wordCount,
        isRead: story.isRead,
      },
    });
  
  revalidatePath('/library');
}

export async function deleteStory(id: string): Promise<void> {
  const userId = await getUserId();
  await db.delete(stories).where(and(eq(stories.id, id), eq(stories.userId, userId)));
  revalidatePath('/library');
}

export async function markStoryAsRead(id: string, isRead: boolean): Promise<void> {
    const userId = await getUserId();
    await db
        .update(stories)
        .set({ isRead })
        .where(and(eq(stories.id, id), eq(stories.userId, userId)));
    revalidatePath('/library');
}
export async function updateStoryMeta(id: string, meta: { title: string; author: string; siteName: string }): Promise<void> {
    const userId = await getUserId();
    await db
        .update(stories)
        .set(meta)
        .where(and(eq(stories.id, id), eq(stories.userId, userId)));
    revalidatePath('/library');
}


// --- Reading Progress ---

export async function getProgress(storyId: string): Promise<ReadingProgress | undefined> {
  try {
    const userId = await getUserId();
    const progress = await db.query.readingProgress.findFirst({
      where: and(
        eq(readingProgress.userId, userId),
        eq(readingProgress.storyId, storyId)
      ),
    });

    if (!progress) return undefined;

    return {
      storyId: progress.storyId,
      currentPage: progress.currentPage,
      totalPages: progress.totalPages,
      lastReadAt: progress.lastReadAt.getTime(),
      scrollPosition: progress.scrollPosition || 0,
    };
  } catch (error) {
    return undefined;
  }
}

export async function saveProgress(progress: ReadingProgress): Promise<void> {
  const userId = await getUserId();

  await db
    .insert(readingProgress)
    .values({
      userId,
      storyId: progress.storyId,
      currentPage: progress.currentPage,
      totalPages: progress.totalPages,
      lastReadAt: new Date(progress.lastReadAt),
      scrollPosition: progress.scrollPosition,
    })
    .onConflictDoUpdate({
      target: [readingProgress.userId, readingProgress.storyId],
      set: {
        currentPage: progress.currentPage,
        totalPages: progress.totalPages,
        lastReadAt: new Date(progress.lastReadAt),
        scrollPosition: progress.scrollPosition,
      },
    });
}

// --- Settings ---

export async function getSettings(): Promise<ReaderSettings> {
  try {
    const userId = await getUserId();
    const setting = await db.query.settings.findFirst({
      where: eq(settings.userId, userId),
    });

    if (!setting) {
      return {
        fontFamily: 'Literata',
        fontSize: 19,
        lineHeight: 1.8,
        theme: 'dark',
        marginSize: 'normal',
      };
    }

    return {
      fontFamily: setting.fontFamily,
      fontSize: setting.fontSize,
      lineHeight: setting.lineHeight / 10,
      theme: setting.theme as ThemeName,
      marginSize: setting.marginSize as 'compact' | 'normal' | 'wide',
    };
  } catch (error) {
    return {
        fontFamily: 'Literata',
        fontSize: 19,
        lineHeight: 1.8,
        theme: 'dark',
        marginSize: 'normal',
      };
  }
}

export async function saveSettings(newSettings: ReaderSettings): Promise<void> {
  const userId = await getUserId();

  await db
    .insert(settings)
    .values({
      userId,
      fontFamily: newSettings.fontFamily,
      fontSize: newSettings.fontSize,
      lineHeight: Math.round(newSettings.lineHeight * 10),
      theme: newSettings.theme,
      marginSize: newSettings.marginSize,
    })
    .onConflictDoUpdate({
      target: settings.userId,
      set: {
        fontFamily: newSettings.fontFamily,
        fontSize: newSettings.fontSize,
        lineHeight: Math.round(newSettings.lineHeight * 10),
        theme: newSettings.theme,
        marginSize: newSettings.marginSize,
      },
    });
}

// --- Chat History ---

export async function getChatHistory(): Promise<ChatMessage[]> {
    try {
        const userId = await getUserId();
        const history = await db.query.chatHistory.findMany({
            where: eq(chatHistory.userId, userId),
            orderBy: [desc(chatHistory.timestamp)],
            limit: 50,
        });
        
        // Reverse to get chronological order for chat UI
        return history.reverse().map((h: typeof chatHistory.$inferSelect) => ({
            id: h.id,
            role: h.role as 'user' | 'assistant',
            content: h.content,
            timestamp: h.timestamp.getTime()
        }));
    } catch {
        return [];
    }
}

export async function saveChatHistory(messages: ChatMessage[]): Promise<void> {
    const userId = await getUserId();
    
    // Simplification: We'll just append new messages or clear and rewrite?
    // Chat complexity: usually we append. 
    // For this migration, let's assume we receive the FULL history each time (as per previous logic).
    // We should probably wipe and rewrite for simplicity in this MVP, or find diffs.
    // Given the previous `localStorage` implementation just overwrites the array, 
    // we'll implement a "wipe and write last 50" approach or similar, 
    // BUT doing a full delete-insert every keystroke is bad.
    
    // Better approach: changing the frontend to only send NEW messages.
    // However, to keep modifications minimal, let's just stick to saving the *latest* state.
    
    // Actually, `chat` usually grows. 
    // Let's implement `appendChatMessage` instead?
    // The previous implementation was: `localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(trimmed));`
    // It replaced the whole thing.
    
    // Let's rely on the client to call `saveStory` etc. 
    // For chat, we might need to be careful.
    
    // Let's overwrite for now to match behavior, but optimistically.
    // A full overwrite of 50 rows is "okay" for a single user MVP.
    
    await db.delete(chatHistory).where(eq(chatHistory.userId, userId));
    
    const messagesToSave = messages.slice(-50).map(m => ({
        id: m.id || crypto.randomUUID(),
        userId,
        role: m.role,
        content: m.content,
        timestamp: new Date(m.timestamp),
    }));
    
    if (messagesToSave.length > 0) {
        await db.insert(chatHistory).values(messagesToSave);
    }
}

export async function clearChatHistory(): Promise<void> {
    const userId = await getUserId();
    await db.delete(chatHistory).where(eq(chatHistory.userId, userId));
}
