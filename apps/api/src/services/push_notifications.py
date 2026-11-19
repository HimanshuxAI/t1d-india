"""
Push Notification Service
Firebase Cloud Messaging (FCM) integration with support for APNs, Web Push, and local notifications.
Supports offline queuing, delivery tracking, and multi-platform targeting.
"""

import asyncio
import json
import logging
import time
import uuid
from typing import Dict, List, Optional, Set, Any, Callable
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set, Any, Callable
from datetime import datetime, timedelta
import asyncio
import logging
import json
import uuid
from typing import Dict, List, Optional, Set, Any, Callable
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class NotificationPriority(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    CRITICAL = "critical"

class NotificationChannel(str, Enum):
    FCM = "fcm"           # Android, Web
    APNS = "apns"         # iOS
    WEB_PUSH = "web_push" # Web Push API
    LOCAL = "local"       # In-app local notification
    SMS = "sms"           # SMS fallback
    EMAIL = "email"       # Email fallback

class NotificationStatus(str, Enum):
    PENDING = "pending"
    QUEUED = "queued"
    SENT = "sent"
    DELIVERED = "delivered"
    FAILED = "failed"
    EXPIRED = "expired"

@dataclass
class NotificationPayload:
    title: str
    body: str
    data: Dict[str, Any] = field(default_factory=dict)
    image_url: Optional[str] = None
    icon_url: Optional[str] = None
    sound: Optional[str] = "default"
    badge: Optional[int] = None
    click_action: Optional[str] = None
    category: Optional[str] = None
    thread_id: Optional[str] = None
    collapse_key: Optional[str] = None

@dataclass
class NotificationTarget:
    user_id: str
    device_tokens: Dict[NotificationChannel, List[str]] = field(default_factory=dict)
    channels: List[NotificationChannel] = field(default_factory=lambda: [
        NotificationChannel.FCM, NotificationChannel.APNS
    ])
    preferences: Dict[str, bool] = field(default_factory=lambda: {
        "push": True,
        "email": False,
        "sms": False,
    })
    timezone: str = "Asia/Kolkata"
    language: str = "en"

@dataclass
class Notification:
    id: str
    target: NotificationTarget
    payload: NotificationPayload
    priority: NotificationPriority = NotificationPriority.NORMAL
    channels: List[NotificationChannel] = field(default_factory=lambda: [
        NotificationChannel.FCM, NotificationChannel.APNS
    ])
    status: NotificationStatus = NotificationStatus.PENDING
    scheduled_at: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    failed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    retry_count: int = 0
    max_retries: int = 3
    ttl_seconds: int = 86400  # 24 hours
    created_at: datetime = field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def is_expired(self) -> bool:
        if self.scheduled_at and datetime.utcnow() > self.scheduled_at + timedelta(seconds=self.ttl_seconds):
            return True
        return False

@dataclass
class DeliveryReceipt:
    notification_id: str
    channel: NotificationChannel
    device_token: str
    status: NotificationStatus
    sent_at: datetime
    delivered_at: Optional[datetime] = None
    error: Optional[str] = None
    message_id: Optional[str] = None

class FCMProvider:
    """Firebase Cloud Messaging provider for Android and Web."""
    
    def __init__(self, service_account_path: str = None, project_id: str = None):
        self.project_id = project_id
        self.service_account_path = service_account_path
        self.access_token: Optional[str] = None
        self.token_expires_at: float = 0
        self._session = None
    
    async def _get_access_token(self) -> str:
        if self.access_token and time.time() < self.token_expires_at - 60:
            return self.access_token
        
        # In production, use google-auth library
        # For now, return mock
        self.access_token = "mock_fcm_token"
        self.token_expires_at = time.time() + 3600
        return self.access_token
    
    async def send(self, notification: Notification, tokens: List[str]) -> List[Dict]:
        """Send notification via FCM HTTP v1 API."""
        if not tokens:
            return []
        
        access_token = await self._get_access_token()
        
        results = []
        for token in tokens:
            try:
                # FCM v1 API payload
                message = {
                    "message": {
                        "token": notification.target.device_tokens.get(NotificationChannel.FCM, [])[0] if notification.target.device_tokens.get(NotificationChannel.FCM) else token,
                        "notification": {
                            "title": notification.payload.title,
                            "body": notification.payload.body,
                            "image": notification.payload.image_url,
                        },
                        "data": {k: str(v) for k, v in notification.payload.data.items()},
                        "android": {
                            "priority": "high" if notification.priority in [NotificationPriority.HIGH, NotificationPriority.CRITICAL] else "normal",
                            "notification": {
                                "sound": notification.payload.sound,
                                "icon": notification.payload.icon_url,
                                "click_action": notification.payload.click_action,
                            },
                        },
                        "apns": {
                            "payload": {
                                "aps": {
                                    "alert": {
                                        "title": notification.payload.title,
                                        "body": notification.payload.body,
                                    },
                                    "sound": notification.payload.sound,
                                    "badge": notification.payload.badge,
                                },
                            },
                        },
                        "webpush": {
                            "notification": {
                                "title": notification.payload.title,
                                "body": notification.payload.body,
                                "icon": notification.payload.icon_url,
                                "image": notification.payload.image_url,
                            },
                        },
                    }
                
                # Mock response
                results.append({
                    "token": token,
                    "status": "sent",
                    "message_id": f"fcm_{uuid.uuid4().hex[:16]}",
                })
            except Exception as e:
                logger.error(f"FCM send error for token: {e}")
                results.append({
                    "token": token,
                    "status": "failed",
                    "error": str(e),
                })
        
        return results


class APNSProvider:
    """Apple Push Notification Service provider for iOS."""
    
    def __init__(self, 
                 key_id: str = None,
                 team_id: str = None,
                 bundle_id: str = None,
                 private_key_path: str = None,
                 use_sandbox: bool = True):
        self.key_id = key_id
        self.team_id = team_id
        self.bundle_id = bundle_id
        self.private_key_path = private_key_path
        self.use_sandbox = use_sandbox
        self.auth_token: Optional[str] = None
        self.token_expires_at: float = 0
    
    async def _get_auth_token(self) -> str:
        if self.auth_token and time.time() < self.token_expires_at - 60:
            return self.auth_token
        
        # Generate JWT token for APNS
        # In production, use proper JWT with ES256
        self.auth_token = "mock_apns_token"
        self.token_expires_at = time.time() + 3600
        return self.auth_token
    
    async def send(self, notification: Notification, tokens: List[str]) -> List[Dict]:
        if not tokens:
            return []
        
        auth_token = await self._get_auth_token()
        
        results = []
        for token in tokens:
            try:
                # APNS payload
                payload = {
                    "aps": {
                        "alert": {
                            "title": notification.payload.title,
                            "body": notification.payload.body,
                        },
                        "sound": notification.payload.sound,
                        "badge": notification.payload.badge,
                        "category": notification.payload.category,
                        "thread-id": notification.payload.thread_id,
                    },
                }
                
                # Add custom data
                if notification.payload.data:
                    payload.update(notification.payload.data)
                
                # Mock response
                results.append({
                    "token": token,
                    "status": "sent",
                    "message_id": f"apns_{uuid.uuid4().hex[:16]}",
                })
            except Exception as e:
                logger.error(f"APNS send error: {e}")
                results.append({
                    "token": token,
                    "status": "failed",
                    "error": str(e),
                })
        
        return results


class WebPushProvider:
    """Web Push Protocol provider for browser notifications."""
    
    def __init__(self, vapid_public_key: str = None, vapid_private_key: str = None):
        self.vapid_public_key = vapid_public_key
        self.vapid_private_key = vapid_private_key
    
    async def send(self, notification: Notification, subscriptions: List[Dict]) -> List[Dict]:
        if not subscriptions:
            return []
        
        results = []
        for sub in subscriptions:
            try:
                # Web Push payload
                payload = {
                    "title": notification.payload.title,
                    "body": notification.payload.body,
                    "icon": notification.payload.icon_url,
                    "image": notification.payload.image_url,
                    "data": notification.payload.data,
                    "actions": [],
                }
                
                # In production, use pywebpush library
                # Mock response
                results.append({
                    "endpoint": sub.get("endpoint", ""),
                    "status": "sent",
                    "message_id": f"webpush_{uuid.uuid4().hex[:16]}",
                })
            except Exception as e:
                logger.error(f"Web Push send error: {e}")
                results.append({
                    "endpoint": sub.get("endpoint", ""),
                    "status": "failed",
                    "error": str(e),
                })
        
        return results


class LocalNotificationProvider:
    """In-app local notifications for foreground/background delivery."""
    
    def __init__(self):
        self.local_notifications: Dict[str, List[Notification]] = {}
    
    async def send(self, notification: Notification) -> Dict:
        """Store notification for in-app delivery."""
        user_id = notification.target.user_id
        if user_id not in self.local_notifications:
            self.local_notifications[user_id] = []
        
        self.local_notifications[user_id].append(notification)
        
        # Keep only last 100 notifications per user
        if len(self.local_notifications[user_id]) > 100:
            self.local_notifications[user_id] = self.local_notifications[user_id][-100:]
        
        return {
            "status": "stored",
            "notification_id": notification.id,
        }
    
    def get_pending(self, user_id: str, since: datetime = None) -> List[Notification]:
        notifications = self.local_notifications.get(user_id, [])
        if since:
            notifications = [n for n in notifications if n.created_at > since]
        return notifications
    
    def mark_read(self, user_id: str, notification_id: str) -> bool:
        notifications = self.local_notifications.get(user_id, [])
        for i, n in enumerate(notifications):
            if n.id == notification_id:
                notifications.pop(i)
                return True
        return False


class PushNotificationService:
    """Main push notification service coordinating all providers."""
    
    def __init__(self):
        self.fcm = FCMProvider()
        self.apns = APNSProvider()
        self.web_push = WebPushProvider()
        self.local = LocalNotificationProvider()
        
        self.device_registry: Dict[str, NotificationTarget] = {}
        self.notification_queue: asyncio.Queue = asyncio.Queue()
        self.scheduled_notifications: Dict[str, Notification] = {}
        self.delivery_history: List[DeliveryReceipt] = []
        
        self._running = False
        self._worker_task: Optional[asyncio.Task] = None
        self._scheduler_task: Optional[asyncio.Task] = None
        self._retry_task: Optional[asyncio.Task] = None
        
        # Callbacks
        self.on_delivery: Optional[Callable[[DeliveryReceipt], None]] = None
        self.on_failure: Optional[Callable[[Notification, str], None]] = None
    
    async def start(self):
        self._running = True
        self._worker_task = asyncio.create_task(self._process_queue())
        self._scheduler_task = asyncio.create_task(self._scheduler_loop())
        self._retry_task = asyncio.create_task(self._retry_loop())
        logger.info("Push notification service started")
    
    async def stop(self):
        self._running = False
        for task in [self._worker_task, self._scheduler_task, self._retry_task]:
            if task:
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
        logger.info("Push notification service stopped")
    
    def register_device(self, user_id: str, channel: NotificationChannel, token: str):
        """Register a device token for a user."""
        if user_id not in self.device_registry:
            self.device_registry[user_id] = NotificationTarget(user_id=user_id)
        
        target = self.device_registry[user_id]
        if channel not in target.device_tokens:
            target.device_tokens[channel] = []
        
        if token not in target.device_tokens[channel]:
            target.device_tokens[channel].append(token)
    
    def unregister_device(self, user_id: str, channel: NotificationChannel, token: str):
        """Unregister a device token."""
        if user_id in self.device_registry:
            target = self.device_registry[user_id]
            if channel in target.device_tokens:
                if token in target.device_tokens[channel]:
                    target.device_tokens[channel].remove(token)
    
    def set_user_preferences(self, user_id: str, preferences: Dict[str, bool]):
        if user_id in self.device_registry:
            self.device_registry[user_id].preferences.update(preferences)
    
    async def send(self, notification: Notification) -> str:
        """Queue notification for delivery."""
        notification.id = notification.id or str(uuid.uuid4())
        notification.created_at = datetime.utcnow()
        notification.status = NotificationStatus.QUEUED
        
        await self.notification_queue.put(notification)
        return notification.id
    
    async def send_immediate(self, 
                             user_id: str,
                             title: str,
                             body: str,
                             data: Dict = None,
                             priority: NotificationPriority = NotificationPriority.NORMAL,
                             channels: List[NotificationChannel] = None) -> str:
        """Convenience method for immediate notifications."""
        if user_id not in self.device_registry:
            raise ValueError(f"User {user_id} not registered")
        
        target = self.device_registry[user_id]
        payload = NotificationPayload(
            title=title,
            body=body,
            data=data or {},
        )
        
        notification = Notification(
            target=target,
            payload=payload,
            priority=priority,
            channels=channels or [NotificationChannel.FCM, NotificationChannel.APNS, NotificationChannel.LOCAL],
        )
        
        return await self.send(notification)
    
    async def schedule(self, notification: Notification, send_at: datetime) -> str:
        """Schedule notification for future delivery."""
        notification.id = notification.id or str(uuid.uuid4())
        notification.scheduled_at = send_at
        notification.status = NotificationStatus.PENDING
        
        self.scheduled_notifications[notification.id] = notification
        return notification.id
    
    async def cancel_scheduled(self, notification_id: str) -> bool:
        if notification_id in self.scheduled_notifications:
            del self.scheduled_notifications[notification_id]
            return True
        return False
    
    async def get_delivery_status(self, notification_id: str) -> Optional[NotificationStatus]:
        # Check queue, scheduled, and history
        for receipt in self.delivery_history:
            if receipt.notification_id == notification_id:
                return receipt.status
        return None
    
    async def get_user_notifications(self, user_id: str, limit: int = 50) -> List[Notification]:
        return self.local.get_pending(user_id)[-limit:]
    
    async def mark_read(self, user_id: str, notification_id: str) -> bool:
        return self.local.mark_read(user_id, notification_id)
    
    # ============================================
    # INTERNAL WORKERS
    # ============================================
    
    async def _process_queue(self):
        while self._running:
            try:
                notification = await asyncio.wait_for(
                    self.notification_queue.get(), timeout=1.0
                )
                
                if notification.is_expired():
                    notification.status = NotificationStatus.EXPIRED
                    continue
                
                await self._deliver_notification(notification)
                
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                logger.error(f"Queue processing error: {e}")
                await asyncio.sleep(1)
    
    async def _deliver_notification(self, notification: Notification):
        notification.status = NotificationStatus.SENT
        notification.sent_at = datetime.utcnow()
        
        delivery_tasks = []
        
        # Determine which channels to use
        channels = notification.channels
        if not channels:
            target = notification.target
            channels = [
                ch for ch in target.channels
                if ch in target.device_tokens and target.device_tokens[ch]
            ]
        
        # Deliver to each channel
        for channel in channels:
            if channel == NotificationChannel.FCM:
                tokens = notification.target.device_tokens.get(NotificationChannel.FCM, [])
                if tokens:
                    asyncio.create_task(self._deliver_fcm(notification, tokens))
            elif channel == NotificationChannel.APNS:
                tokens = notification.target.device_tokens.get(NotificationChannel.APNS, [])
                if tokens:
                    asyncio.create_task(self._deliver_apns(notification, tokens))
            elif channel == NotificationChannel.WEB_PUSH:
                subs = notification.target.device_tokens.get(NotificationChannel.WEB_PUSH, [])
                if subs:
                    asyncio.create_task(self._deliver_webpush(notification, subs))
            elif channel == NotificationChannel.LOCAL:
                asyncio.create_task(self._deliver_local(notification))
        
        notification.status = NotificationStatus.DELIVERED
        notification.delivered_at = datetime.utcnow()
    
    async def _deliver_fcm(self, notification: Notification, tokens: List[str]):
        try:
            results = await self.fcm.send(notification, tokens)
            
            for result in results:
                receipt = DeliveryReceipt(
                    notification_id=notification.id,
                    channel=NotificationChannel.FCM,
                    device_token=result.get("token", ""),
                    status=NotificationStatus.DELIVERED if result["status"] == "sent" else NotificationStatus.FAILED,
                    sent_at=datetime.utcnow(),
                    delivered_at=datetime.utcnow() if result["status"] == "sent" else None,
                    error=result.get("error"),
                    message_id=result.get("message_id"),
                )
                self.delivery_history.append(receipt)
                
                if self.on_delivery:
                    self.on_delivery(receipt)
                    
        except Exception as e:
            logger.error(f"FCM delivery error: {e}")
            await self._handle_delivery_failure(notification, NotificationChannel.FCM, str(e))
    
    async def _deliver_apns(self, notification: Notification, tokens: List[str]):
        try:
            results = await self.apns.send(notification, tokens)
            
            for result in results:
                receipt = DeliveryReceipt(
                    notification_id=notification.id,
                    channel=NotificationChannel.APNS,
                    device_token=result.get("token", ""),
                    status=NotificationStatus.DELIVERED if result["status"] == "sent" else NotificationStatus.FAILED,
                    sent_at=datetime.utcnow(),
                    delivered_at=datetime.utcnow() if result["status"] == "sent" else None,
                    error=result.get("error"),
                    message_id=result.get("message_id"),
                )
                self.delivery_history.append(receipt)
                
                if self.on_delivery:
                    self.on_delivery(receipt)
                    
        except Exception as e:
            logger.error(f"APNS delivery error: {e}")
            await self._handle_delivery_failure(notification, NotificationChannel.APNS, str(e))
    
    async def _deliver_webpush(self, notification: Notification, subscriptions: List[Dict]):
        try:
            results = await self.web_push.send(notification, subscriptions)
            
            for result in results:
                receipt = DeliveryReceipt(
                    notification_id=notification.id,
                    channel=NotificationChannel.WEB_PUSH,
                    device_token=result.get("endpoint", ""),
                    status=NotificationStatus.DELIVERED if result["status"] == "sent" else NotificationStatus.FAILED,
                    sent_at=datetime.utcnow(),
                    delivered_at=datetime.utcnow() if result["status"] == "sent" else None,
                    error=result.get("error"),
                    message_id=result.get("message_id"),
                )
                self.delivery_history.append(receipt)
                
                if self.on_delivery:
                    self.on_delivery(receipt)
                    
        except Exception as e:
            logger.error(f"Web Push delivery error: {e}")
            await self._handle_delivery_failure(notification, NotificationChannel.WEB_PUSH, str(e))
    
    async def _deliver_local(self, notification: Notification):
        try:
            result = await self.local.send(notification)
            receipt = DeliveryReceipt(
                notification_id=notification.id,
                channel=NotificationChannel.LOCAL,
                device_token="local",
                status=NotificationStatus.DELIVERED,
                sent_at=datetime.utcnow(),
                delivered_at=datetime.utcnow(),
                message_id=result.get("notification_id"),
            )
            self.delivery_history.append(receipt)
            
            if self.on_delivery:
                self.on_delivery(receipt)
        except Exception as e:
            logger.error(f"Local delivery error: {e}")
    
    async def _handle_delivery_failure(self, notification: Notification, channel: NotificationChannel, error: str):
        notification.retry_count += 1
        
        if notification.retry_count >= notification.max_retries:
            notification.status = NotificationStatus.FAILED
            notification.failed_at = datetime.utcnow()
            notification.error_message = f"Max retries exceeded: {error}"
            
            if self.on_failure:
                self.on_failure(notification, error)
        else:
            # Re-queue with exponential backoff
            delay = min(2 ** notification.retry_count * 60, 3600)  # Max 1 hour
            notification.scheduled_at = datetime.utcnow() + timedelta(seconds=delay)
            notification.status = NotificationStatus.PENDING
            self.scheduled_notifications[notification.id] = notification
    
    async def _scheduler_loop(self):
        while self._running:
            try:
                now = datetime.utcnow()
                
                # Check scheduled notifications
                to_send = []
                for nid, notification in list(self.scheduled_notifications.items()):
                    if notification.scheduled_at and notification.scheduled_at <= now:
                        to_send.append(nid)
                
                for nid in to_send:
                    notification = self.scheduled_notifications.pop(nid)
                    await self.notification_queue.put(notification)
                
            except Exception as e:
                logger.error(f"Scheduler error: {e}")
            
            await asyncio.sleep(10)
    
    async def _retry_loop(self):
        while self._running:
            try:
                # Check for failed notifications that can be retried
                for notification in list(self.scheduled_notifications.values()):
                    if (notification.status == NotificationStatus.FAILED and 
                        notification.retry_count < notification.max_retries):
                        # Re-queue for retry
                        notification.status = NotificationStatus.PENDING
                        await self.notification_queue.put(notification)
                
            except Exception as e:
                logger.error(f"Retry loop error: {e}")
            
            await asyncio.sleep(60)
    
    async def get_delivery_history(self, 
                                    user_id: str = None, 
                                    notification_id: str = None,
                                    limit: int = 100) -> List[DeliveryReceipt]:
        history = self.delivery_history
        
        if user_id:
            # Filter by user (would need user_id in receipt)
            pass
        if notification_id:
            history = [r for r in history if r.notification_id == notification_id]
        
        return history[-limit:]


# FastAPI integration
from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel

push_service = PushNotificationService()

app = FastAPI(title="T1D India Push Notification Service")

class SendNotificationRequest(BaseModel):
    user_id: str
    title: str
    body: str
    data: Dict[str, Any] = {}
    priority: NotificationPriority = NotificationPriority.NORMAL
    channels: Optional[List[NotificationChannel]] = None
    scheduled_at: Optional[datetime] = None

class RegisterDeviceRequest(BaseModel):
    user_id: str
    channel: NotificationChannel
    token: str

class PreferencesRequest(BaseModel):
    preferences: Dict[str, bool]

@app.on_event("startup")
async def startup():
    await push_service.start()

@app.on_event("shutdown")
async def shutdown():
    await push_service.stop()

@app.post("/api/push/register", response_model=dict)
async def register_device(request: RegisterDeviceRequest):
    push_service.register_device(request.user_id, request.channel, request.token)
    return {"success": True}

@app.delete("/api/push/unregister", response_model=dict)
async def unregister_device(request: RegisterDeviceRequest):
    push_service.unregister_device(request.user_id, request.channel, request.token)
    return {"success": True}

@app.post("/api/push/preferences/{user_id}", response_model=dict)
async def set_preferences(user_id: str, request: PreferencesRequest):
    push_service.set_user_preferences(user_id, request.preferences)
    return {"success": True}

@app.post("/api/push/send", response_model=dict)
async def send_notification(request: SendNotificationRequest, background_tasks: BackgroundTasks):
    if request.user_id not in push_service.device_registry:
        raise HTTPException(status_code=404, detail="User not registered for push notifications")
    
    target = push_service.device_registry[request.user_id]
    
    # Check preferences
    if not target.preferences.get("push", True):
        raise HTTPException(status_code=400, detail="User has disabled push notifications")
    
    payload = NotificationPayload(
        title=request.title,
        body=request.body,
        data=request.data,
    )
    
    notification = Notification(
        target=target,
        payload=payload,
        priority=request.priority,
        channels=request.channels or [NotificationChannel.FCM, NotificationChannel.APNS, NotificationChannel.LOCAL],
    )
    
    if request.scheduled_at and request.scheduled_at > datetime.utcnow():
        notification_id = await push_service.schedule(notification, request.scheduled_at)
        return {"notification_id": notification_id, "status": "scheduled", "scheduled_at": request.scheduled_at.isoformat()}
    else:
        notification_id = await push_service.send(notification)
        return {"notification_id": notification_id, "status": "queued"}

@app.post("/api/push/send-immediate", response_model=dict)
async def send_immediate(
    user_id: str,
    title: str,
    body: str,
    data: Dict = None,
    priority: NotificationPriority = NotificationPriority.NORMAL,
    channels: List[NotificationChannel] = None,
    background_tasks: BackgroundTasks = None
):
    """Convenience endpoint for immediate notifications."""
    if user_id not in push_service.device_registry:
        raise HTTPException(status_code=404, detail="User not registered")
    
    target = push_service.device_registry[user_id]
    
    payload = NotificationPayload(title=title, body=body, data=data or {})
    notification = Notification(
        target=target,
        payload=payload,
        priority=priority,
        channels=channels or [NotificationChannel.FCM, NotificationChannel.APNS, NotificationChannel.LOCAL],
    )
    
    notification_id = await push_service.send(notification)
    return {"notification_id": notification_id, "status": "queued"}

@app.get("/api/push/history/{user_id}", response_model=List[dict])
async def get_history(user_id: str, limit: int = 50):
    history = await push_service.get_delivery_history(user_id=user_id, limit=limit)
    return [
        {
            "notification_id": r.notification_id,
            "channel": r.channel.value,
            "status": r.status.value,
            "sent_at": r.sent_at.isoformat(),
            "delivered_at": r.delivered_at.isoformat() if r.delivered_at else None,
            "error": r.error,
            "message_id": r.message_id,
        }
        for r in history
    ]

@app.get("/api/push/notifications/{user_id}", response_model=List[dict])
async def get_user_notifications(user_id: str, limit: int = 50):
    notifications = await push_service.get_user_notifications(user_id, limit)
    return [
        {
            "id": n.id,
            "title": n.payload.title,
            "body": n.payload.body,
            "data": n.payload.data,
            "priority": n.priority.value,
            "status": n.status.value,
            "created_at": n.created_at.isoformat(),
        }
        for n in notifications
    ]

@app.post("/api/push/notifications/{user_id}/{notification_id}/read", response_model=dict)
async def mark_read(user_id: str, notification_id: str):
    success = await push_service.mark_read(user_id, notification_id)
    return {"success": success}

@app.get("/api/push/status/{notification_id}", response_model=dict)
async def get_status(notification_id: str):
    status = await push_service.get_delivery_status(notification_id)
    if status is None:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"notification_id": notification_id, "status": status.value}


@app.on_event("startup")
async def startup():
    await push_service.start()

@app.on_event("shutdown")
async def shutdown():
    await push_service.stop()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)