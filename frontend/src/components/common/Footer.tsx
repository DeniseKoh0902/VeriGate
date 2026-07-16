const footerLinks = [
  { label: 'Privacy Policy', href: '#privacy' },
  { label: 'Terms of Service', href: '#terms' },
  { label: 'Support', href: '#support' },
];

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="flex flex-col items-center justify-between gap-2 px-6 py-4 text-xs text-slate-700 sm:flex-row">
        <p>© 2026 VeriGate. All rights reserved.</p>
        <nav className="flex items-center gap-5">
          {footerLinks.map((link) => (
            <a key={link.label} href={link.href} className="hover:text-slate-900">
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
