import Link from 'next/link';
export function Header(){return <div className="top"><Link className="brand" href="/">ISITHA GLOBAL</Link><div className="nav"><Link href="/">My Onboarding</Link><Link href="/#training">My Training</Link><Link href="/admin">HR Admin</Link></div></div>}
