import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/cn';

interface MarkdownMessageProps {
  content: string;
  className?: string;
}

export function MarkdownMessage({ content, className }: MarkdownMessageProps) {
  return (
    <div className={cn('space-y-2 text-sm leading-relaxed', className)}>
      <ReactMarkdown
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-5">{children}</ol>,
          li: ({ children }) => <li>{children}</li>,
          h1: ({ children }) => <p className="mb-1 font-semibold">{children}</p>,
          h2: ({ children }) => <p className="mb-1 font-semibold">{children}</p>,
          h3: ({ children }) => <p className="mb-1 font-semibold">{children}</p>,
          hr: () => <hr className="my-3 border-slate-200" />,
          code: ({ children }) => (
            <code className="rounded bg-slate-200/70 px-1 py-0.5 font-mono text-xs">
              {children}
            </code>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 underline hover:text-blue-700"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
