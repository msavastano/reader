import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '@/db';
import { users, accounts, sessions, verificationTokens } from '@/db/schema';
import authConfig from './auth.config';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  ...authConfig,
  callbacks: {
    async session({ session, user }) {
      console.log('Session callback triggered:', { 
        sessionUser: session?.user, 
        userId: user?.id,
        sessionToken: session?.sessionToken 
      });
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  events: {
    async signIn(message) { console.log('[EVENT] signIn', message); },
    async signOut(message) { console.log('[EVENT] signOut', message); },
    async createUser(message) { console.log('[EVENT] createUser', message); },
    async updateUser(message) { console.log('[EVENT] updateUser', message); },
    async linkAccount(message) { console.log('[EVENT] linkAccount', message); },
    async session(message) { console.log('[EVENT] session', message); },
  },
  debug: true,
});
