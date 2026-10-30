import { AllocationAuditLog, AllocationStatus } from '../types/allocation';

/**
 * Creates an immutable audit log entry for allocation events
 */
export function createAuditLogEntry(params: {
  allocationId: string;
  candidateId: string;
  jobId: string;
  action: string;
  fromStatus?: AllocationStatus;
  toStatus: AllocationStatus;
  actor: 'SYSTEM_ALLOCATOR' | 'HR_ADMIN' | 'CANDIDATE';
  actorId?: string;
  reason: string;
  metadata?: Record<string, any>;
}): AllocationAuditLog {
  return {
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    allocationId: params.allocationId,
    candidateId: params.candidateId,
    jobId: params.jobId,
    action: params.action,
    fromStatus: params.fromStatus,
    toStatus: params.toStatus,
    actor: params.actor,
    actorId: params.actorId,
    reason: params.reason,
    metadata: params.metadata || {},
    timestamp: new Date().toISOString(),
  };
}

/**
 * Filters and sorts audit logs in chronological or reverse-chronological order
 */
export function queryAuditLogs(
  logs: AllocationAuditLog[],
  filter?: {
    candidateId?: string;
    jobId?: string;
    allocationId?: string;
    actor?: AllocationAuditLog['actor'];
  },
  descending: boolean = true
): AllocationAuditLog[] {
  let filtered = [...logs];

  if (filter?.candidateId) {
    filtered = filtered.filter((l) => l.candidateId === filter.candidateId);
  }
  if (filter?.jobId) {
    filtered = filtered.filter((l) => l.jobId === filter.jobId);
  }
  if (filter?.allocationId) {
    filtered = filtered.filter((l) => l.allocationId === filter.allocationId);
  }
  if (filter?.actor) {
    filtered = filtered.filter((l) => l.actor === filter.actor);
  }

  return filtered.sort((a, b) => {
    const diff = new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    return descending ? diff : -diff;
  });
}

