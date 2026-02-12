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
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (!process.env.AUTH_SECRET) {
        console.error('CRITICAL: AUTH_SECRET is missing. Sessions will be invalid.');
      }
      console.log('Session callback triggered (JWT):', { 
        sessionUser: session?.user, 
        tokenId: token?.id, 
        sessionToken: session?.sessionToken 
      });

      if (session.user && token.id) {
        session.user.id = token.id as string;
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
  trustHost: true,
});
