import Link from 'next/link';

export function Header() {
  return (
    <header
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: '20px',
        borderBottom: '1px solid #e5e7eb',
      }}
    >
      <div>
        <strong style={{ fontSize: '20px' }}>ISITHA GLOBAL</strong>
        <div className="muted" style={{ fontSize: '13px' }}>
          Staff Onboarding & Compliance
        </div>
      </div>

      <nav
        style={{
          display: 'flex',
          gap: '18px',
          alignItems: 'center',
        }}
      >
        <Link href="/">My Portal</Link>
        <Link href="/admin">HR Admin</Link>
      </nav>
    </header>
  );
}
