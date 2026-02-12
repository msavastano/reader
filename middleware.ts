import NextAuth from 'next-auth';
import authConfig from './src/auth.config';

export const { auth } = NextAuth(authConfig);

export default auth((req) => {
  // Check if the user is authenticated, otherwise redirect or handle as needed
  // For now, we'll just let the session be available
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
