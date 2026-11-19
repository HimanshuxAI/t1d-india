"""
Real-time WebSocket Server for CGM Data Streaming
Handles real-time glucose updates, alerts, and bidirectional communication.
"""

import asyncio
import json
import logging
import uuid
from typing import Dict, List, Optional, Set, Any, Callable
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum
from fastapi import WebSocket, WebSocketDisconnect, Depends, Query
from fastapi.websockets import WebSocketState
import asyncio
import jwt

logger = logging.getLogger(__name__)

class MessageType(str, Enum):
    # Client -> Server
    SUBSCRIBE = "subscribe"
    UNSUBSCRIBE = "unsubscribe"
    PING = "ping"
    AUTH = "auth"
    ACK = "ack"
    
    # Server -> Client
    GLUCOSE_UPDATE = "glucose_update"
    HYPO_ALERT = "hypo_alert"
    HYPER_ALERT = "hyper_alert"
    SIGNAL_LOSS = "signal_loss"
    DEVICE_STATUS = "device_status"
    TREND_UPDATE = "trend_update"
    PONG = "pong"
    AUTH_SUCCESS = "auth_success"
    AUTH_ERROR = "auth_error"
    SUBSCRIBED = "subscribed"
    UNSUBSCRIBED = "unsubscribed"
    ERROR = "error"
    HEARTBEAT = "heartbeat"

@dataclass
class WSMessage:
    type: MessageType
    payload: dict = field(default_factory=dict)
    request_id: Optional[str] = None
    timestamp: datetime = field(default_factory=datetime.utcnow)
    
    def to_json(self) -> str:
        return json.dumps({
            "type": self.type.value,
            "payload": self.payload,
            "request_id": self.request_id,
            "timestamp": self.timestamp.isoformat(),
        })
    
    @classmethod
    def from_json(cls, data: str) -> "WSMessage":
        obj = json.loads(data)
        return cls(
            type=MessageType(obj["type"]),
            payload=obj.get("payload", {}),
            request_id=obj.get("request_id"),
            timestamp=datetime.fromisoformat(obj["timestamp"]) if obj.get("timestamp") else datetime.utcnow(),
        )

@dataclass
class Subscription:
    client_id: str
    topics: Set[str] = field(default_factory=set)
    filters: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.utcnow)

@dataclass
class ConnectedClient:
    websocket: WebSocket
    client_id: str
    user_id: Optional[str] = None
    subscriptions: Dict[str, Subscription] = field(default_factory=dict)
    authenticated: bool = False
    connected_at: datetime = field(default_factory=datetime.utcnow)
    last_ping: datetime = field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = field(default_factory=dict)

class ConnectionManager:
    """Manages WebSocket connections, subscriptions, and message routing."""
    
    def __init__(self, 
                 heartbeat_interval: int = 30,
                 max_connections: int = 10000,
                 message_queue_size: int = 1000):
        self.clients: Dict[str, ConnectedClient] = {}
        self.topic_subscribers: Dict[str, Set[str]] = {}
        self.user_connections: Dict[str, Set[str]] = {}
        
        self.heartbeat_interval = heartbeat_interval
        self.max_connections = max_connections
        self.message_queue_size = message_queue_size
        
        self._heartbeat_task: Optional[asyncio.Task] = None
        self._cleanup_task: Optional[asyncio.Task] = None
        self._running = False
        
        # Event hooks
        self.on_connect: Optional[Callable[[ConnectedClient], None]] = None
        self.on_disconnect: Optional[Callable[[ConnectedClient], None]] = None
        self.on_message: Optional[Callable[[ConnectedClient, WSMessage], None]] = None
        self.on_subscribe: Optional[Callable[[str, str], None]] = None
        self.on_unsubscribe: Optional[Callable[[str, str], None]] = None
    
    async def connect(self, websocket: WebSocket, client_id: str = None) -> ConnectedClient:
        if len(self.clients) >= self.max_connections:
            await websocket.close(code=1013, reason="Server at capacity")
            raise ConnectionError("Server at capacity")
        
        if client_id is None:
            client_id = str(uuid.uuid4())
        
        await websocket.accept()
        
        client = ConnectedClient(
            websocket=websocket,
            client_id=client_id,
        )
        
        self.clients[client_id] = client
        
        # Start ping/pong for this connection
        asyncio.create_task(self._ping_loop(client))
        
        if self.on_connect:
            try:
                self.on_connect(client)
            except Exception as e:
                logger.error(f"on_connect hook error: {e}")
        
        logger.info(f"Client connected: {client_id} (total: {len(self.clients)})")
        return client
    
    async def disconnect(self, client_id: str, code: int = 1000, reason: str = ""):
        client = self.clients.get(client_id)
        if not client:
            return
        
        # Unsubscribe from all topics
        for topic in list(client.subscriptions.keys()):
            await self._unsubscribe_internal(client.client_id, topic)
        
        # Remove from user connections
        if client.user_id:
            self.user_connections.get(client.user_id, set()).discard(client_id)
        
        # Close websocket
        try:
            if client.websocket.client_state == WebSocketState.CONNECTED:
                await client.websocket.close(code=1000, reason="Server shutdown")
        except Exception:
            pass
        
        del self.clients[client_id]
        
        if self.on_disconnect:
            try:
                self.on_disconnect(client)
            except Exception as e:
                logger.error(f"on_disconnect hook error: {e}")
        
        logger.info(f"Client disconnected: {client_id} (total: {len(self.clients)})")
    
    async def send_personal_message(self, client_id: str, message: WSMessage) -> bool:
        client = self.clients.get(client_id)
        if not client or client.websocket.client_state != WebSocketState.CONNECTED:
            return False
        
        try:
            await client.websocket.send_text(message.to_json())
            return True
        except Exception as e:
            logger.error(f"Failed to send to {client_id}: {e}")
            await self.disconnect(client_id, code=1011, reason="Send failed")
            return False
    
    async def broadcast(self, message: WSMessage, topic: str = None, 
                        exclude: Set[str] = None) -> int:
        """Broadcast message to all clients or topic subscribers."""
        sent = 0
        
        if topic:
            subscribers = self.topic_subscribers.get(topic, set()).copy()
        else:
            subscribers = set(self.clients.keys())
        
        if exclude:
            subscribers -= exclude
        
        # Send concurrently
        tasks = []
        for client_id in subscribers:
            client = self.clients.get(client_id)
            if client and client.websocket.client_state == WebSocketState.CONNECTED:
                tasks.append(self._safe_send(client_id, message))
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        sent = sum(1 for r in results if r is True)
        
        return sent
    
    async def _safe_send(self, client_id: str, message: WSMessage) -> bool:
        try:
            await self.send_personal_message(client_id, message)
            return True
        except Exception:
            return False
    
    async def send_to_user(self, user_id: str, message: WSMessage) -> int:
        """Send message to all connections for a user."""
        sent = 0
        client_ids = self.user_connections.get(user_id, set()).copy()
        
        for client_id in client_ids:
            if await self.send_personal_message(client_id, message):
                sent += 1
        
        return sent
    
    async def subscribe(self, client_id: str, topic: str, 
                        filters: Dict[str, Any] = None) -> bool:
        client = self.clients.get(client_id)
        if not client:
            return False
        
        if topic not in client.subscriptions:
            client.subscriptions[topic] = Subscription(
                client_id=client_id,
                topics={topic},
                filters=filters or {}
            )
            
            if topic not in self.topic_subscribers:
                self.topic_subscribers[topic] = set()
            self.topic_subscribers[topic].add(client_id)
            
            if self.on_subscribe:
                try:
                    self.on_subscribe(client_id, topic)
                except Exception as e:
                    logger.error(f"on_subscribe hook error: {e}")
            
            logger.info(f"Client {client_id} subscribed to {topic}")
            return True
        
        return False
    
    async def unsubscribe(self, client_id: str, topic: str) -> bool:
        return await self._unsubscribe_internal(client_id, topic)
    
    async def _unsubscribe_internal(self, client_id: str, topic: str) -> bool:
        client = self.clients.get(client_id)
        if not client or topic not in client.subscriptions:
            return False
        
        del client.subscriptions[topic]
        
        if topic in self.topic_subscribers:
            self.topic_subscribers[topic].discard(client_id)
            if not self.topic_subscribers[topic]:
                del self.topic_subscribers[topic]
        
        if self.on_unsubscribe:
            try:
                self.on_unsubscribe(client_id, topic)
            except Exception as e:
                logger.error(f"on_unsubscribe hook error: {e}")
        
        logger.info(f"Client {client_id} unsubscribed from {topic}")
        return True
    
    def get_client(self, client_id: str) -> Optional[ConnectedClient]:
        return self.clients.get(client_id)
    
    def get_user_connections(self, user_id: str) -> List[str]:
        return list(self.user_connections.get(user_id, set()))
    
    def get_topic_subscribers(self, topic: str) -> List[str]:
        return list(self.topic_subscribers.get(topic, set()))
    
    def get_stats(self) -> dict:
        return {
            "total_connections": len(self.clients),
            "topics": {k: len(v) for k, v in self.topic_subscribers.items()},
            "users_online": len(self.user_connections),
        }
    
    async def start(self):
        """Start background tasks."""
        self._heartbeat_task = asyncio.create_task(self._heartbeat_loop())
        self._cleanup_task = asyncio.create_task(self._cleanup_loop())
    
    async def stop(self):
        for task in [self._heartbeat_task, self._cleanup_task]:
            if task:
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
        
        # Disconnect all clients
        for client_id in list(self.clients.keys()):
            await self.disconnect(client_id, code=1001, reason="Server shutting down")
    
    async def _ping_loop(self, client: ConnectedClient):
        """Send periodic pings to keep connection alive."""
        try:
            while True:
                await asyncio.sleep(30)
                if client.websocket.client_state != WebSocketState.CONNECTED:
                    break
                
                try:
                    await client.websocket.send_text(WSMessage(
                        type=MessageType.PING,
                        payload={"timestamp": datetime.utcnow().isoformat()}
                    ).to_json())
                except Exception:
                    break
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Ping loop error for {client.client_id}: {e}")
    
    async def _heartbeat_loop(self):
        """Send periodic heartbeats to all connected clients."""
        while True:
            try:
                await asyncio.sleep(30)
                
                message = WSMessage(
                    type=MessageType.HEARTBEAT,
                    payload={
                        "timestamp": datetime.utcnow().isoformat(),
                        "server_time": time.time(),
                    }
                )
                
                await self.broadcast(
                    WSMessage(type=MessageType.HEARTBEAT, payload={
                        "timestamp": datetime.utcnow().isoformat(),
                        "connections": len(self.clients),
                    })
                )
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Heartbeat loop error: {e}")
    
    async def _cleanup_loop(self):
        """Periodic cleanup of stale connections."""
        while True:
            try:
                await asyncio.sleep(60)
                
                now = datetime.utcnow()
                stale_clients = []
                
                for client_id, client in self.clients.items():
                    # Check if client hasn't responded to ping in 90 seconds
                    if (now - client.last_ping).total_seconds() > 90:
                        stale_clients.append(client.client_id)
                
                for client_id in stale_clients:
                    logger.warning(f"Removing stale client: {client_id}")
                    await self.disconnect(client_id, code=1001, reason="Ping timeout")
                    
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Cleanup loop error: {e}")

    async def handle_message(self, client_id: str, message: WSMessage):
        """Process incoming message from client."""
        client = self.clients.get(client_id)
        if not client:
            return
        
        client.last_ping = datetime.utcnow()
        
        try:
            if message.type == MessageType.PING:
                await self._send_pong(client)
            elif message.type == MessageType.AUTH:
                await self._handle_auth(client, message)
            elif message.type == MessageType.SUBSCRIBE:
                await self._handle_subscribe(client, message)
            elif message.type == MessageType.UNSUBSCRIBE:
                await self._handle_unsubscribe(client, message)
            elif message.type == MessageType.ACK:
                # Handle acknowledgment
                pass
            else:
                # Custom message handler
                if self.on_message:
                    try:
                        self.on_message(self.clients[client_id], message)
                    except Exception as e:
                        logger.error(f"Message handler error: {e}")
        except Exception as e:
            logger.error(f"Error handling message from {client_id}: {e}")
            await self._send_error(client, str(e))
    
    async def _send_pong(self, client: ConnectedClient):
        await self._send(client, WSMessage(
            type=MessageType.PONG,
            payload={"timestamp": datetime.utcnow().isoformat()}
        ))
    
    async def _handle_auth(self, client: ConnectedClient, message: WSMessage):
        token = message.payload.get("token")
        if not token:
            await self._send_error(client, "Missing token")
            return
        
        # Verify JWT token (implement your validation)
        try:
            # payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            # For demo, accept any token
            client.authenticated = True
            client.user_id = message.payload.get("user_id")
            client.metadata["auth_time"] = datetime.utcnow().isoformat()
            
            # Track user connections
            if client.user_id:
                if client.user_id not in self.user_connections:
                    self.user_connections[client.user_id] = set()
                self.user_connections[client.user_id].add(client.client_id)
            
            await self._send(client, WSMessage(
                type=MessageType.AUTH_SUCCESS,
                payload={"user_id": client.user_id}
            ))
            logger.info(f"Client {client.client_id} authenticated as user {client.user_id}")
        except Exception as e:
            await self._send_error(client, f"Authentication failed: {e}")
    
    async def _handle_subscribe(self, client, message: WSMessage):
        topic = message.payload.get("topic")
        filters = message.payload.get("filters", {})
        
        if not topic:
            await self._send_error(client, "Missing topic")
            return
        
        success = await self.subscribe(client.client_id, message.payload.get("topic", ""), 
                                       message.payload.get("filters", {}))
        
        await self._send(client, WSMessage(
            type=MessageType.SUBSCRIBED if success else MessageType.ERROR,
            payload={"topic": message.payload.get("topic"), "success": success},
            request_id=message.request_id,
        ))
    
    async def _handle_unsubscribe(self, client, message: WSMessage):
        topic = message.payload.get("topic")
        if not topic:
            await self._send_error(client, "Missing topic")
            return
        
        success = await self.unsubscribe(client.client_id, topic)
        
        await self._send(client, WSMessage(
            type=MessageType.UNSUBSCRIBED if success else MessageType.ERROR,
            payload={"topic": topic, "success": success},
            request_id=message.request_id,
        ))
    
    async def _send(self, client: ConnectedClient, message: WSMessage):
        if client.websocket.client_state == WebSocketState.CONNECTED:
            await client.websocket.send_text(message.to_json())
    
    async def _send_error(self, client: ConnectedClient, error: str, request_id: str = None):
        await self._send(client, WSMessage(
            type=MessageType.ERROR,
            payload={"error": error},
            request_id=request_id,
        ))


# FastAPI WebSocket endpoint
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, Query
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="T1D India WebSocket Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global connection manager
manager = ConnectionManager()

# JWT settings (configure properly in production)
JWT_SECRET = "your-secret-key"
JWT_ALGORITHM = "HS256"

async def get_current_user(token: str = Query(...)):
    """Validate JWT token and return user info."""
    try:
        payload = jwt.decode(token, "your-secret-key", algorithms=["HS256"])
        return payload
    except jwt.PyJWTError:
        return None

@app.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(None),
    client_id: str = Query(None)
):
    # Authenticate
    user = None
    if token:
        user = await get_current_user(token)
        if not user:
            await websocket.close(code=4001, reason="Invalid token")
            return
    
    # Connect
    client = await manager.connect(websocket, client_id)
    
    # Associate with user if authenticated
    if user:
        client = manager.clients.get(websocket.query_params.get("client_id"))
        if client:
            client.user_id = user.get("sub")
            client.authenticated = True
            if user.get("sub") not in manager.user_connections:
                manager.user_connections[user["sub"]] = set()
            manager.user_connections[user["sub"]].add(client.client_id)
    
    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = WSMessage.from_json(data)
                await manager.handle_message(client.client_id, message)
            except json.JSONDecodeError:
                await manager._send_error(manager.clients[client.client_id], "Invalid JSON")
            except Exception as e:
                logger.error(f"Message processing error: {e}")
    except WebSocketDisconnect:
        await manager.disconnect(client.client_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await manager.disconnect(client.client_id, code=1011, reason="Internal error")


# REST endpoints for managing connections
@app.get("/api/ws/stats")
async def get_ws_stats():
    return manager.get_stats()

@app.get("/api/ws/connections")
async def list_connections():
    return {
        "connections": [
            {
                "client_id": c.client_id,
                "user_id": c.user_id,
                "authenticated": c.authenticated,
                "connected_at": c.connected_at.isoformat(),
                "subscriptions": list(c.subscriptions.keys()),
            }
            for c in manager.clients.values()
        ]
    }

@app.post("/api/ws/broadcast")
async def broadcast_message(
    topic: str,
    message: dict,
    exclude: List[str] = None
):
    sent = await manager.broadcast(
        WSMessage(type=MessageType.GLUTCOSE_UPDATE, payload=message),
        topic=topic,
        exclude=set(exclude) if exclude else None
    )
    return {"sent": sent}

@app.post("/api/ws/user/{user_id}/notify")
async def notify_user(user_id: str, message: dict):
    sent = await manager.send_to_user(user_id, WSMessage(
        type=MessageType.GLUTCOSE_UPDATE,
        payload=message
    ))
    return {"sent": sent}


# Glucose data streaming
class GlucoseStreamer:
    """Streams glucose data to subscribed clients."""
    
    def __init__(self, manager: ConnectionManager):
        self.manager = manager
        self._running = False
        self._task: Optional[asyncio.Task] = None
    
    async def start(self):
        self._running = True
        self._task = asyncio.create_task(self._stream_loop())
    
    async def stop(self):
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
    
    async def _stream_loop(self):
        while True:
            try:
                # This would integrate with your CGM manager
                # For demo, we'll send mock data
                await asyncio.sleep(5)
                
                # In production, get real CGM data
                mock_reading = {
                    "glucose_mg_dl": 120,
                    "trend": 1,
                    "trend_arrow": "↑",
                    "timestamp": datetime.utcnow().isoformat(),
                    "source": "dexcom_ws",
                }
                
                await self.manager.broadcast(
                    WSMessage(
                        type=MessageType.GLUTCOSE_UPDATE,
                        payload=mock_reading
                    ),
                    topic="glucose"
                )
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Stream error: {e}")
                await asyncio.sleep(5)

# Startup/shutdown
@app.on_event("startup")
async def startup():
    await manager.start()
    # Start glucose streamer
    streamer = GlucoseStreamer(manager)
    await streamer.start()

@app.on_event("shutdown")
async def shutdown():
    await manager.stop()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)