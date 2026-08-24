import { useQuery } from '@tanstack/react-query';
import { HandoffsApi, type HandoffQueueFilters } from '../api/endpoints';

// Handoff data must feel near-live: short staleTime plus a WS connection
// (see useHandoffSocket) that invalidates this query on server push, PLUS a
// 15s refetchInterval fallback per API_CONTRACT.md ("Frontend must fall back
// to polling ... this fallback is REQUIRED"). Both mechanisms run
// simultaneously by design — the poll is not merely a backup that only
// activates when the socket is down, it is always on, so a missed/duplicate
// WS message can never leave the queue stale for more than one poll cycle.
export function useHandoffQueue(filters: HandoffQueueFilters) {
  return useQuery({
    queryKey: ['handoffs', filters],
    queryFn: () => HandoffsApi.list(filters),
    staleTime: 5_000,
    refetchInterval: 15_000,
    placeholderData: (prev) => prev,
  });
}

export function useHandoffCase(caseId: string | undefined) {
  return useQuery({
    queryKey: ['handoff-case', caseId],
    queryFn: () => HandoffsApi.detail(caseId as string),
    enabled: !!caseId,
    staleTime: 5_000,
    refetchInterval: 15_000,
  });
}
