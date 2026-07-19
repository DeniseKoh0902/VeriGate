import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Search, Sparkles, Check } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface AiModelOption {
  name: string;
  trustScore: number | null;
  recommended?: boolean;
}

interface ModelSelectorProps {
  models: AiModelOption[];
  selected: string;
  onSelect: (name: string) => void;
}

export function ModelSelector({ models, selected, onSelect }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedModel = models.find((model) => model.name === selected);
  const filtered = models.filter((model) =>
    model.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
    setQuery('');
  };

  const handleSelect = (name: string) => {
    onSelect(name);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        className="flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-400"
      >
        <span>{selectedModel?.name ?? selected}</span>
        {selectedModel && selectedModel.trustScore !== null && (
          <span className="text-xs font-normal text-slate-400">
            Trust {selectedModel.trustScore}
          </span>
        )}
        <ChevronDown size={14} className="text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 z-10 mb-2 w-72 rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 p-2">
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5">
              <Search size={14} className="shrink-0 text-slate-400" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search models…"
                className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto p-1">
            {filtered.length === 0 && (
              <p className="px-3 py-4 text-center text-sm text-slate-400">No models match.</p>
            )}
            {filtered.map((model) => (
              <button
                key={model.name}
                type="button"
                onClick={() => handleSelect(model.name)}
                className={cn(
                  'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50',
                  model.name === selected && 'bg-blue-50/60',
                )}
              >
                <span className="flex items-center gap-2">
                  <span className="font-medium text-slate-900">{model.name}</span>
                  {model.recommended && (
                    <span className="flex items-center gap-0.5 rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      <Sparkles size={9} />
                      Recommended
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-2 text-xs text-slate-400">
                  {model.trustScore !== null && `Trust ${model.trustScore}`}
                  {model.name === selected && <Check size={14} className="text-blue-600" />}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
