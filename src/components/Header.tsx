import { Image } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../lib/auth';

const links = [
  { to: '/', label: 'Compress' },
  { to: '/compress-jpg', label: 'JPG' },
  { to: '/compress-png', label: 'PNG' },
  { to: '/image-to-webp', label: 'WebP' },
  { to: '/resize-image', label: 'Resize' },
  { to: '/pricing', label: 'Pricing' },
];

export function Header() {
  const { user, plan, usage } = useAuth();
  const aiLeft = usage ? Math.max(0, usage.ai.limit - usage.ai.used) : null;

  return (
    <header className="border-b border-line px-4 py-5 sm:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <NavLink to="/" className="flex items-center gap-3 text-ink no-underline">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-linear-to-br from-cyan to-accent text-paper">
            <Image size={22} aria-hidden="true" />
          </span>
          <span>
            <span className="flex items-center gap-2">
              <span className="text-xl font-semibold tracking-tight">ImageShrink</span>
              <span className="rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-paper">
                {plan.id === 'free' ? 'FREE' : plan.name.toUpperCase()}
              </span>
            </span>
            <span className="block text-sm text-muted">Smart compression without uploading files</span>
          </span>
        </NavLink>
        <div className="flex flex-wrap items-center gap-2">
          <nav aria-label="Primary" className="flex flex-wrap gap-1">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-medium no-underline ${
                    isActive ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-panel hover:text-ink'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
          {aiLeft !== null && (
            <span className="rounded-full border border-line px-3 py-1 text-xs text-muted">
              {aiLeft} AI left today
            </span>
          )}
          {user ? (
            <Link to="/account" className="rounded-lg border border-line px-3 py-2 text-sm no-underline hover:text-ink">
              {user.email}
            </Link>
          ) : (
            <>
              <Link to="/login" className="rounded-lg px-3 py-2 text-sm text-muted no-underline hover:text-ink">
                Log in
              </Link>
              <Link to="/signup" className="optimize-btn rounded-lg px-3 py-2 text-sm font-semibold no-underline">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
