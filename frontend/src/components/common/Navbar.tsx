import logoHeader from '@/assets/logoHeader.png';

export function Navbar() {
  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-2">
      <img src={logoHeader} alt="VeriGate" className="h-14 object-contain" />
      <a
        href="#help"
        className="text-sm text-slate-600 transition-colors hover:text-slate-900"
      >
        Help Center
      </a>
    </header>
  );
}
