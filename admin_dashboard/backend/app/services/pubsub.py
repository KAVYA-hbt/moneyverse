"""WebSocket broadcast for /ws/handoffs.

WS is the PRIMARY delivery path for handoff queue updates. The frontend is still expected to
poll GET /api/handoffs every 15s as a fallback per the contract, in case the socket is closed
or unavailable -- this module only needs to handle the "happy path" push notifications.

Local dev runs on SQLite (single process, no cross-process pub/sub needed), so this is a plain
in-process asyncio broadcaster: `publish_event` fans a message out to every connected
WebSocket directly. When swapped to PostgreSQL for production (see app/core/config.py), this
would be replaced by Postgres LISTEN/NOTIFY (or a message queue) so events also propagate
across multiple backend processes/replicas -- the publish_event/manager interface below is
written so that swap only touches this file.
"""

from typing import Any


class ConnectionManager:
    def __init__(self) -> None:
        self._connections: set[Any] = set()

    def register(self, websocket) -> None:
        self._connections.add(websocket)

    def unregister(self, websocket) -> None:
        self._connections.discard(websocket)

    async def broadcast(self, message: dict) -> None:
        dead = []
        for ws in self._connections:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.unregister(ws)


manager = ConnectionManager()


async def start_listener() -> None:
    """No-op for the in-process broadcaster; kept so app/main.py's lifespan wiring doesn't
    need to change when this is swapped for a real Postgres LISTEN/NOTIFY listener."""
    return None


async def stop_listener() -> None:
    return None


async def publish_event(payload: dict) -> None:
    await manager.broadcast(payload)
