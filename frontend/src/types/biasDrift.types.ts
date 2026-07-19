export type ScanTrigger = 'MANUAL' | 'SCHEDULED';

export interface AiToolUsageScan {
  id: string;
  aiToolId: string;
  windowStart: string;
  windowEnd: string;
  promptCount: number;
  blockRate: number;
  sensitiveDataMatchRate: number;
  isDriftFlagged: boolean;
  aiSummary: string | null;
  triggeredBy: ScanTrigger;
  scannedAt: string;
}
