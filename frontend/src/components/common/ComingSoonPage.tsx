interface ComingSoonPageProps {
  title: string;
  description: string;
}

export function ComingSoonPage({ title, description }: ComingSoonPageProps) {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      <div className="mt-6 flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-300 text-sm text-slate-400">
        Coming soon.
      </div>
    </div>
  );
}
