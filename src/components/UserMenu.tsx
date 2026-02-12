'use client';

import { useSession } from 'next-auth/react';
import { login, logout } from '@/app/actions';
import { LogIn, LogOut, User } from 'lucide-react';
import { useState } from 'react';

// We need a SessionProvider in the root layout to use useSession
// But for now, let's just use the server actions and maybe pass session as prop?
// Or we can just have a simple button that toggles based on prop.
// Since UserMenu is used in page.tsx which is a client component, 
// we can pass the session user as a prop from the server component (layout or page wrapper).
// But page.tsx is "use client" so it can't fetch session easily without passing it down.
// 
// Actually, `auth()` can be called in Server Components. 
// `page.tsx` starts with "use client".
// We should probably lift the session fetching to a pattern where `page.tsx` receives it or fetches it?
// `auth()` only works on server.
// 
// Let's create a Server Component wrapper for `UserMenu` or pass it down?
// Or use `SessionProvider`?
// 
// For simplicity, let's make UserMenu accept a `user` prop.
// And we need to fetch user in a Server Component and pass it.
// But `page.tsx` is the main entry and it's client.
// We can wrap `page.tsx` contents in a client component and make `page.tsx` a server component?
// 
// Start with `UserMenu` accepting `user`.

interface UserMenuProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
}

export default function UserMenu({ user }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!user) {
    return (
      <form action={login}>
        <button 
          className="btn btn-primary btn-sm"
          type="submit"
        >
          <LogIn size={16} style={{ marginRight: 8 }} />
          Sign In
        </button>
      </form>
    );
  }

  return (
    <div className="user-menu" style={{ position: 'relative' }}>
      <button 
        className="btn btn-ghost btn-sm"
        onClick={() => setIsOpen(!isOpen)}
        style={{ display: 'flex', alignItems: 'center', gap: 8 }}
      >
        {user.image ? (
          <img 
            src={user.image} 
            alt={user.name || 'User'} 
            style={{ width: 24, height: 24, borderRadius: '50%' }}
          />
        ) : (
          <User size={20} />
        )}
        <span>{user.name?.split(' ')[0]}</span>
      </button>
      
      {isOpen && (
        <div 
          className="user-dropdown"
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 8,
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: 8,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            zIndex: 50,
            minWidth: 150
          }}
        >
           <div style={{ padding: '8px', borderBottom: '1px solid var(--border)', marginBottom: '8px' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{user.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{user.email}</div>
           </div>
           <button 
                className="btn btn-ghost btn-sm"
                style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--danger)' }}
                onClick={() => logout()}
            >
                <LogOut size={16} style={{ marginRight: 8 }} />
                Sign Out
            </button>
        </div>
      )}
      
      {isOpen && (
        <div 
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40 }}
            onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
