import { useEffect, useState } from 'react';
import { FileText, EyeOff } from 'lucide-react';
import * as promptService from '@/services/prompt.service';
import type { PromptAttachment } from '@/types/prompt.types';

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface AttachmentPreviewProps {
  attachment: PromptAttachment;
}

// Fetches the attachment's bytes through an authenticated request (a plain
// <img src> can't carry the bearer token) and renders either an inline image
// thumbnail or a generic file chip. isRedacted attachments still render —
// their bytes exist for audit review — but are visually marked as withheld
// so it's obvious this file never reached the AI model. Shared by AI
// Workspace, Risk Alert Center, and Appeal Queue — anywhere a prompt's
// attachments need to be reviewable.
export function AttachmentPreview({ attachment }: AttachmentPreviewProps) {
  const [url, setUrl] = useState<string | null>(null);
  const isImage = attachment.mimeType.startsWith('image/');

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    promptService
      .getAttachmentUrl(attachment.id)
      .then((result) => {
        if (cancelled) {
          URL.revokeObjectURL(result);
          return;
        }
        objectUrl = result;
        setUrl(result);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachment.id]);

  const redactedTitle = 'Withheld from the AI model — sensitive content was detected in this file.';

  if (isImage) {
    return (
      <a
        href={url ?? undefined}
        target="_blank"
        rel="noreferrer"
        title={attachment.isRedacted ? redactedTitle : attachment.fileName}
        className="relative block h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
      >
        {url && (
          <img src={url} alt={attachment.fileName} className="h-full w-full object-cover" />
        )}
        {attachment.isRedacted && (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-red-900/70 text-white">
            <EyeOff size={16} />
            <span className="text-[9px] font-semibold uppercase tracking-wide">Withheld</span>
          </span>
        )}
      </a>
    );
  }

  return (
    <a
      href={url ?? undefined}
      target="_blank"
      rel="noreferrer"
      title={attachment.isRedacted ? redactedTitle : attachment.fileName}
      className="flex w-48 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-left hover:bg-slate-50"
    >
      <FileText size={16} className="shrink-0 text-slate-400" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium text-slate-700">
          {attachment.fileName}
        </span>
        <span
          className={
            attachment.isRedacted
              ? 'block text-[10px] font-medium text-red-600'
              : 'block text-[10px] text-slate-400'
          }
        >
          {attachment.isRedacted ? 'Withheld — not sent to AI' : formatFileSize(attachment.fileSize)}
        </span>
      </span>
    </a>
  );
}
