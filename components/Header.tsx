import Link from 'next/link';

export function Header() {
  return (
    <header className="site-header">
      <Link href="/" className="brand-lockup" aria-label="Isitha Global home">
        <img
          src="/isitha-global-logo.webp"
          alt="Isitha Global"
          className="brand-logo"
        />
        <div className="brand-copy">
          <strong>Staff Portal</strong>
          <span>Onboarding & Compliance</span>
        </div>
      </Link>

      <nav className="site-nav" aria-label="Portal navigation">
        <Link href="/">My Portal</Link>
        <Link href="/admin">HR Admin</Link>
        <Link href="/admin/managers">Manager Allocation</Link>
      </nav>
    </header>
  );
}
