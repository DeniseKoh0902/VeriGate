import { Logo } from '@/components/common/Logo';

export function Navbar() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Logo size="sm" />
        <a
          href="#help"
          className="text-sm text-slate-600 transition-colors hover:text-slate-900"
        >
          Help Center
        </a>
      </div>
    </header>
  );
}
