from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from app.core.security import decode_access_token
from app.services.pubsub import manager

router = APIRouter()


@router.websocket("/ws/handoffs")
async def handoffs_ws(websocket: WebSocket, token: str | None = Query(None)) -> None:
    # Auth via ?token=<jwt> query param -- dev-simple, documented in API_CONTRACT.md.
    if not token:
        await websocket.close(code=4401)
        return
    try:
        decode_access_token(token)
    except ValueError:
        await websocket.close(code=4401)
        return

    await websocket.accept()
    manager.register(websocket)
    try:
        while True:
            # Server only pushes events; client messages are ignored/drained (used as a
            # keepalive channel). The frontend still polls every 15s as a fallback per contract.
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        manager.unregister(websocket)
