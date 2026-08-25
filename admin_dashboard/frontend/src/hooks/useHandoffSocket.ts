import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getAuthToken } from '../api/client';
import type { WsMessage } from '../types/api';

// Primary live-update channel per API_CONTRACT.md. On any of
// case_created/case_claimed/case_updated we simply invalidate the relevant
// TanStack Query caches rather than hand-patching them — the 15s
// refetchInterval in useHandoffQueue/useHandoffCase is REQUIRED to keep
// running regardless (documented fallback), so both paths are intentionally
// active at once; this WS is a latency optimization on top of that floor,
// not a replacement for it.
export function useHandoffSocket() {
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    let cancelled = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

    function connect() {
      if (cancelled) return;
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const url = `${protocol}://${window.location.host}/ws/handoffs?token=${encodeURIComponent(
        token ?? '',
      )}`;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => setConnected(true);

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as WsMessage;
          if (
            msg.type === 'case_created' ||
            msg.type === 'case_claimed' ||
            msg.type === 'case_updated'
          ) {
            queryClient.invalidateQueries({ queryKey: ['handoffs'] });
            const caseId =
              msg.type === 'case_created' ? msg.case.id : msg.case_id;
            queryClient.invalidateQueries({
              queryKey: ['handoff-case', caseId],
            });
          } else if (msg.type === 'profiles_synced') {
            // Pushed by the game_sync background job (db or json_file mode) whenever it
            // actually creates/updates a player -- lets the dashboard/stat cards/profile list
            // reflect new gameplay data without waiting for their own staleTime to expire.
            queryClient.invalidateQueries({ queryKey: ['profiles'] });
            queryClient.invalidateQueries({ queryKey: ['profile-analytics'] });
          }
        } catch {
          // ignore malformed frames
        }
      };

      ws.onclose = () => {
        setConnected(false);
        if (!cancelled) {
          // socket unavailable/closed: rely on the 15s poll fallback until
          // we can reconnect
          reconnectTimer = setTimeout(connect, 5_000);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, [queryClient]);

  return { connected };
}
