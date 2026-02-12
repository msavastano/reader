import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  uuid,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import type { AdapterAccount } from 'next-auth/adapters';

// --- Auth Tables (NextAuth) ---

export const users = pgTable('user', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  email: text('email').notNull(),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  image: text('image'),
});

export const accounts = pgTable(
  'account',
  {
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').$type<AdapterAccount['type']>().notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('providerAccountId').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  })
);

export const sessions = pgTable('session', {
  sessionToken: text('sessionToken').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
});

export const verificationTokens = pgTable(
  'verificationToken',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  (verificationToken) => ({
    compositePk: primaryKey({
      columns: [verificationToken.identifier, verificationToken.token],
    }),
  })
);

// --- App Tables ---

export const stories = pgTable('stories', {
  id: text('id').primaryKey(), // Original ID from scraper, or UUID
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  author: text('author'),
  content: text('content').notNull(),
  excerpt: text('excerpt'),
  siteName: text('site_name'),
  url: text('url'),
  savedAt: timestamp('saved_at').defaultNow().notNull(),
  wordCount: integer('word_count').default(0),
  isRead: boolean('is_read').default(false),
});

export const readingProgress = pgTable('reading_progress', {
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  storyId: text('story_id')
    .notNull()
    .references(() => stories.id, { onDelete: 'cascade' }),
  currentPage: integer('current_page').default(1).notNull(),
  totalPages: integer('total_pages').default(1).notNull(),
  lastReadAt: timestamp('last_read_at').defaultNow().notNull(),
  scrollPosition: integer('scroll_position').default(0),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.storyId] }),
}));

// --- Relations ---

export const storiesRelations = relations(stories, ({ one }) => ({
  user: one(users, {
    fields: [stories.userId],
    references: [users.id],
  }),
}));

export const readingProgressRelations = relations(readingProgress, ({ one }) => ({
  story: one(stories, {
    fields: [readingProgress.storyId],
    references: [stories.id],
  }),
  user: one(users, {
    fields: [readingProgress.userId],
    references: [users.id],
  }),
}));


export const settings = pgTable('settings', {
  userId: text('userId')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  fontFamily: text('font_family').default('Literata').notNull(),
  fontSize: integer('font_size').default(19).notNull(),
  lineHeight: integer('line_height').default(18).notNull(), // Stored as integer (e.g. 18 -> 1.8)
  theme: text('theme').default('dark').notNull(),
  marginSize: text('margin_size').default('normal').notNull(),
});

export const chatHistory = pgTable('chat_history', {
  id: text('id').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull(), // 'user' | 'assistant'
  content: text('content').notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});
