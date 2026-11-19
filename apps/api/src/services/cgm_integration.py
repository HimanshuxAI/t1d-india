"""
CGM Vendor Integrations
Dexcom Share, Abbott Libre, Medtronic Guardian - with OAuth, token refresh, and WebSocket support.
"""

import asyncio
import aiohttp
import base64
import hashlib
import hmac
import time
import json
import logging
from typing import Dict, List, Optional, Any, Callable
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from abc import ABC, abstractmethod
from enum import Enum
import asyncio
from contextlib import asynccontextmanager

logger = logging.getLogger(__name__)

class CGMVendor(str, Enum):
    DEXCOM = "dexcom"
    LIBRE = "libre"
    MEDTRONIC = "medtronic"

class CGMReading:
    def __init__(self, 
                 timestamp: datetime,
                 glucose_mg_dl: int,
                 trend: Optional[int] = None,
                 trend_arrow: Optional[str] = None,
                 is_valid: bool = True,
                 source: str = "unknown"):
        self.timestamp = timestamp
        self.glucose_mg_dl = glucose_mg_dl
        self.trend = trend
        self.trend_arrow = trend_arrow
        self.is_valid = is_valid
        self.source = source
    
    def to_dict(self):
        return {
            "timestamp": self.timestamp.isoformat(),
            "glucose_mg_dl": self.glucose_mg_dl,
            "trend": self.trend,
            "trend_arrow": self.trend_arrow,
            "is_valid": self.is_valid,
            "source": self.source,
        }

@dataclass
class CGMClientConfig:
    client_id: str
    client_secret: str
    redirect_uri: str = ""
    sandbox: bool = False
    scope: str = "read"

class TokenData:
    def __init__(self, access_token: str = "", refresh_token: str = "", 
                 expires_at: float = 0, scope: str = ""):
        self.access_token = access_token
        self.refresh_token = refresh_token
        self.expires_at = expires_at
        self.scope = scope
    
    def is_expired(self) -> bool:
        return time.time() >= self.expires_at - 60  # 60s buffer
    
    def to_dict(self):
        return {
            "access_token": self.access_token,
            "refresh_token": self.refresh_token,
            "expires_at": self.expires_at,
            "scope": self.scope,
        }
    
    @classmethod
    def from_dict(cls, data: dict):
        return cls(
            access_token=data.get("access_token", ""),
            refresh_token=data.get("refresh_token", ""),
            expires_at=data.get("expires_at", 0),
            scope=data.get("scope", ""),
        )

class CGMClientBase(ABC):
    def __init__(self, config: CGMClientConfig):
        self.config = config
        self.token = TokenData()
        self.session: Optional[aiohttp.ClientSession] = None
        self._callbacks: List[Callable[[CGMReading], None]] = []
        self._ws_task: Optional[asyncio.Task] = None
        self._running = False
    
    @abstractmethod
    async def authenticate(self, auth_code: str = None, **kwargs) -> bool:
        pass
    
    @abstractmethod
    async def refresh_token(self) -> bool:
        pass
    
    @abstractmethod
    async def get_latest_glucose(self) -> Optional[CGMReading]:
        pass
    
    @abstractmethod
    async def get_glucose_history(self, 
                                   start: datetime, 
                                   end: datetime,
                                   max_count: int = 288) -> List[CGMReading]:
        pass
    
    @abstractmethod
    async def connect_websocket(self) -> bool:
        pass
    
    @abstractmethod
    async def disconnect_websocket(self):
        pass
    
    def add_callback(self, callback: Callable[[CGMReading], None]):
        self._callbacks.append(callback)
    
    def remove_callback(self, callback: Callable[[CGMReading], None]):
        if callback in self._callbacks:
            self._callbacks.remove(callback)
    
    def _notify_callbacks(self, reading: CGMReading):
        for cb in self._callbacks:
            try:
                cb(reading)
            except Exception as e:
                logger.error(f"Callback error: {e}")
    
    async def _ensure_session(self):
        if self.session is None or self.session.closed:
            self.session = aiohttp.ClientSession()
    
    async def close(self):
        await self.disconnect_websocket()
        if self.session and not self.session.closed:
            await self.session.close()

class DexcomClient(CGMClientBase):
    """Dexcom Share API Client (G6/G7) with OAuth2 and WebSocket support."""
    
    BASE_URL = "https://api.dexcom.com/v2"
    AUTH_URL = "https://api.dexcom.com/v2/oauth2/token"
    WS_URL = "wss://api.dexcom.com/v2/websocket"
    
    def __init__(self, config: CGMClientConfig):
        super().__init__(config)
        if config.sandbox:
            self.BASE_URL = "https://sandbox-api.dexcom.com/v2"
            self.AUTH_URL = "https://sandbox-api.dexcom.com/v2/oauth2/token"
            self.WS_URL = "wss://sandbox-api.dexcom.com/v2/websocket"
    
    async def authenticate(self, auth_code: str = None, **kwargs) -> bool:
        await self._ensure_session()
        
        if auth_code:
            # Authorization code flow
            data = {
                "grant_type": "authorization_code",
                "code": auth_code,
                "redirect_uri": self.config.redirect_uri,
                "client_id": self.config.client_id,
                "client_secret": self.config.client_secret,
            }
        elif self.token.refresh_token:
            # Refresh token flow
            return await self.refresh_token()
        else:
            logger.error("No auth code or refresh token available")
            return False
        
        async with self.session.post(self.AUTH_URL, data=data) as resp:
            if resp.status != 200:
                error_text = await resp.text()
                logger.error(f"Dexcom auth failed: {resp.status} - {error_text}")
                return False
            
            tokens = await resp.json()
            self.token = TokenData(
                access_token=tokens["access_token"],
                refresh_token=tokens["refresh_token"],
                expires_at=time.time() + tokens["expires_in"],
                scope=tokens.get("scope", ""),
            )
            logger.info("Dexcom authentication successful")
            return True
    
    async def refresh_token(self) -> bool:
        if not self.token.refresh_token:
            return False
        
        await self._ensure_session()
        data = {
            "grant_type": "refresh_token",
            "refresh_token": self.token.refresh_token,
            "client_id": self.config.client_id,
            "client_secret": self.config.client_secret,
        }
        
        async with self.session.post(self.AUTH_URL, data=data) as resp:
            if resp.status != 200:
                logger.error(f"Dexcom token refresh failed: {resp.status}")
                return False
            
            tokens = await resp.json()
            self.token = TokenData(
                access_token=tokens["access_token"],
                refresh_token=tokens["refresh_token"],
                expires_at=time.time() + tokens["expires_in"],
                scope=tokens.get("scope", ""),
            )
            return True
    
    async def _ensure_valid_token(self):
        if self.token.is_expired():
            await self.refresh_token()
    
    def _parse_trend(self, trend: Optional[int]) -> tuple:
        if trend is None:
            return None, None
        trend_arrows = {
            3: "↑↑", 2: "↑", 1: "↗",
            0: "→",
            -1: "↘", -2: "↓", -3: "↓↓"
        }
        return trend, trend_arrows.get(trend, "→")
    
    async def get_latest_glucose(self) -> Optional[CGMReading]:
        await self._ensure_valid_token()
        await self._ensure_session()
        
        headers = {"Authorization": f"Bearer {self.token.access_token}"}
        url = f"{self.BASE_URL}/users/self/egvs"
        
        end = datetime.utcnow()
        start = end - timedelta(hours=1)
        
        params = {
            "startDate": start.strftime("%Y-%m-%dT%H:%M:%S"),
            "endDate": end.strftime("%Y-%m-%dT%H:%M:%S"),
        }
        
        async with self.session.get(url, headers=headers, params=params) as resp:
            if resp.status == 401:
                await self.refresh_token()
                return await self.get_latest_glucose()
            if resp.status != 200:
                logger.error(f"Dexcom latest glucose failed: {resp.status}")
                return None
            
            data = await resp.json()
            egvs = data.get("egvs", [])
            if not egvs:
                return None
            
            latest = egvs[-1]
            trend, trend_arrow = self._parse_trend(latest.get("trend"))
            
            return CGMReading(
                timestamp=datetime.fromisoformat(latest["systemTime"].replace("Z", "+00:00")),
                glucose_mg_dl=latest["value"],
                trend=trend,
                trend_arrow=trend_arrow,
                source="dexcom_api",
            )
    
    async def get_glucose_history(self, 
                                   start: datetime, 
                                   end: datetime,
                                   max_count: int = 288) -> List[CGMReading]:
        await self._ensure_valid_token()
        await self._ensure_session()
        
        headers = {"Authorization": f"Bearer {self.token.access_token}"}
        url = f"{self.BASE_URL}/users/self/egvs"
        
        params = {
            "startDate": start.strftime("%Y-%m-%dT%H:%M:%S"),
            "endDate": end.strftime("%Y-%m-%dT%H:%M:%S"),
        }
        
        async with self.session.get(url, headers=headers, params=params) as resp:
            if resp.status == 401:
                await self.refresh_token()
                return await self.get_glucose_history(start, end, max_count)
            if resp.status != 200:
                logger.error(f"Dexcom history failed: {resp.status}")
                return []
            
            data = await resp.json()
            egvs = data.get("egvs", [])
            
            readings = []
            for egv in egvs[-max_count:]:
                trend, trend_arrow = self._parse_trend(egv.get("trend"))
                readings.append(CGMReading(
                    timestamp=datetime.fromisoformat(egv["systemTime"].replace("Z", "+00:00")),
                    glucose_mg_dl=egv["value"],
                    trend=trend,
                    trend_arrow=trend_arrow,
                    source="dexcom_api",
                ))
            return readings
    
    async def connect_websocket(self) -> bool:
        """Connect to Dexcom WebSocket for real-time glucose updates."""
        if self._running:
            return True
        
        await self._ensure_valid_token()
        
        try:
            ws_url = f"{self.WS_URL}?access_token={self.token.access_token}"
            self._ws = await aiohttp.ClientSession().ws_connect(ws_url)
            self._running = True
            self._ws_task = asyncio.create_task(self._ws_listener())
            logger.info("Dexcom WebSocket connected")
            return True
        except Exception as e:
            logger.error(f"Dexcom WebSocket connection failed: {e}")
            return False
    
    async def _ws_listener(self):
        try:
            async for msg in self._ws:
                if msg.type == aiohttp.WSMsgType.TEXT:
                    data = json.loads(msg.data)
                    self._handle_ws_message(data)
                elif msg.type == aiohttp.WSMsgType.ERROR:
                    logger.error(f"WebSocket error: {self._ws.exception()}")
                    break
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"WebSocket listener error: {e}")
        finally:
            self._running = False
    
    def _handle_ws_message(self, data: dict):
        try:
            # Dexcom WebSocket message format
            egv = data.get("egv", data)
            trend, trend_arrow = self._parse_trend(egv.get("trend"))
            reading = CGMReading(
                timestamp=datetime.fromisoformat(egv["systemTime"].replace("Z", "+00:00")),
                glucose_mg_dl=egv["value"],
                trend=egv.get("trend"),
                trend_arrow=egv.get("trendArrow", ""),
                source="dexcom_ws",
            )
            self._notify_callbacks(reading)
        except Exception as e:
            logger.error(f"Error parsing WS message: {e}")
    
    async def disconnect_websocket(self):
        self._running = False
        if self._ws_task:
            self._ws_task.cancel()
            try:
                await self._ws_task
            except asyncio.CancelledError:
                pass
        if hasattr(self, '_ws') and self._ws:
            await self._ws.close()
        logger.info("Dexcom WebSocket disconnected")


class LibreClient(CGMClientBase):
    """Abbott Libre API Client (Libre 2/3 via LibreView)."""
    
    BASE_URL = "https://api.libreview.io"
    AUTH_URL = "https://api.libreview.io/auth/login"
    
    def __init__(self, config: CGMClientConfig):
        super().__init__(config)
        self.account_id: Optional[str] = None
        self._ws_connected = False
    
    async def authenticate(self, email: str = None, password: str = None, auth_code: str = None, **kwargs) -> bool:
        await self._ensure_session()
        
        if email and password:
            data = {"email": email, "password": password}
            headers = {
                "Content-Type": "application/json",
                "product": "libre",
                "version": "4.7.0",
            }
        elif auth_code:
            # OAuth flow not fully supported by Libre
            logger.error("Libre OAuth not fully supported")
            return False
        else:
            return False
        
        async with self.session.post(self.AUTH_URL, json=data, headers=headers) as resp:
            if resp.status != 200:
                logger.error(f"Libre auth failed: {resp.status}")
                return False
            
            data = await resp.json()
            auth_ticket = data.get("data", {}).get("authTicket", {})
            self.token = TokenData(
                access_token=auth_ticket.get("token"),
                expires_at=time.time() + 12 * 3600,  # 12 hours
            )
            self.account_id = data.get("data", {}).get("user", {}).get("id")
            logger.info("Libre authentication successful")
            return True
    
    async def refresh_token(self) -> bool:
        # Libre uses session tokens - re-authenticate
        logger.warning("Libre token expired, re-authentication required")
        return False
    
    async def _ensure_valid_token(self):
        if self.token.is_expired():
            logger.warning("Libre token expired, manual re-auth required")
            return False
        return True
    
    def _parse_trend(self, trend: Optional[str]) -> tuple:
        if not trend:
            return None, None
        trend_map = {
            "DoubleUp": (3, "↑↑"),
            "SingleUp": (2, "↑"),
            "FortyFiveUp": (1, "↗"),
            "Flat": (0, "→"),
            "FortyFiveDown": (-1, "↘"),
            "SingleDown": (-2, "↓"),
            "DoubleDown": (-3, "↓↓"),
        }
        return trend_map.get(trend, (0, "→"))
    
    async def get_latest_glucose(self) -> Optional[CGMReading]:
        if not await self._ensure_valid_token():
            return None
        
        await self._ensure_session()
        headers = {
            "Authorization": f"Bearer {self.token.access_token}",
            "product": "libre",
            "version": "4.7.0",
        }
        
        url = f"{self.BASE_URL}/llu/connections"
        async with self.session.get(url, headers=headers) as resp:
            if resp.status != 200:
                return None
            
            data = await resp.json()
            connections = data.get("data", [])
            if not connections:
                return None
            
            conn = connections[0]
            glucose = conn.get("glucoseMeasurement", {})
            if not glucose:
                return None
            
            trend_val, trend_arrow = self._parse_trend(glucose.get("trendArrow"))
            
            return CGMReading(
                timestamp=datetime.fromtimestamp(glucose["factoryTimestamp"] / 1000),
                glucose_mg_dl=glucose["valueInMgPerDl"],
                trend=trend_val,
                trend_arrow=trend_arrow,
                source="libre_api",
            )
    
    async def get_glucose_history(self, 
                                   start: datetime, 
                                   end: datetime,
                                   max_count: int = 288) -> List[CGMReading]:
        if not await self._ensure_valid_token():
            return []
        
        await self._ensure_session()
        headers = {
            "Authorization": f"Bearer {self.token.access_token}",
            "product": "libre",
            "version": "4.7.0",
        }
        
        url = f"{self.BASE_URL}/llu/connections/{self.account_id}/graph"
        params = {
            "start": int(start.timestamp() * 1000),
            "end": int(end.timestamp() * 1000),
        }
        
        async with self.session.get(url, headers=headers, params=params) as resp:
            if resp.status != 200:
                return []
            
            data = await resp.json()
            readings = []
            
            for point in data.get("data", {}).get("glucoseHistory", []):
                trend_val, trend_arrow = self._parse_trend(point.get("trendArrow"))
                readings.append(CGMReading(
                    timestamp=datetime.fromtimestamp(point["timestamp"] / 1000),
                    glucose_mg_dl=point["valueInMgPerDl"],
                    trend=trend_val,
                    trend_arrow=trend_arrow,
                    source="libre_api",
                ))
            return readings[-max_count:]
    
    async def connect_websocket(self) -> bool:
        # Libre doesn't have official WebSocket - use polling fallback
        logger.warning("Libre WebSocket not available, using polling")
        return False
    
    async def disconnect_websocket(self):
        pass


class MedtronicClient(CGMClientBase):
    """Medtronic Guardian API Client (via CareLink)."""
    
    BASE_URL = "https://api.medtronic.com"
    AUTH_URL = "https://api.medtronic.com/oauth2/token"
    
    def __init__(self, config: CGMClientConfig):
        super().__init__(config)
    
    async def authenticate(self, auth_code: str = None, **kwargs) -> bool:
        if not auth_code:
            return False
        
        await self._ensure_session()
        data = {
            "grant_type": "authorization_code",
            "code": auth_code,
            "redirect_uri": self.config.redirect_uri,
            "client_id": self.config.client_id,
            "client_secret": self.config.client_secret,
        }
        
        async with self.session.post(self.AUTH_URL, data=data) as resp:
            if resp.status != 200:
                return False
            
            tokens = await resp.json()
            self.token = TokenData(
                access_token=tokens["access_token"],
                refresh_token=tokens["refresh_token"],
                expires_at=time.time() + tokens["expires_in"] - 60,
            )
            return True
    
    async def refresh_token(self) -> bool:
        if not self.token.refresh_token:
            return False
        
        await self._ensure_session()
        data = {
            "grant_type": "refresh_token",
            "refresh_token": self.token.refresh_token,
            "client_id": self.config.client_id,
            "client_secret": self.config.client_secret,
        }
        
        async with self.session.post(self.AUTH_URL, data=data) as resp:
            if resp.status != 200:
                return False
            
            tokens = await resp.json()
            self.token = TokenData(
                access_token=tokens["access_token"],
                refresh_token=tokens["refresh_token"],
                expires_at=time.time() + tokens["expires_in"] - 60,
            )
            return True
    
    async def _ensure_valid_token(self):
        if self.token.is_expired():
            await self.refresh_token()
    
    def _parse_trend(self, trend: Optional[str]) -> tuple:
        if not trend:
            return None, None
        trend_map = {
            "RisingQuickly": (3, "↑↑"),
            "Rising": (2, "↑"),
            "Stable": (0, "→"),
            "Falling": (-2, "↓"),
            "FallingQuickly": (-3, "↓↓"),
        }
        return trend_map.get(trend, (0, "→"))
    
    async def get_latest_glucose(self) -> Optional[CGMReading]:
        await self._ensure_valid_token()
        await self._ensure_session()
        
        headers = {"Authorization": f"Bearer {self.token.access_token}"}
        url = f"{self.BASE_URL}/v1/devices/cgm/readings/latest"
        
        async with self.session.get(url, headers=headers) as resp:
            if resp.status != 200:
                return None
            
            data = await resp.json()
            reading = data.get("reading", {})
            if not reading:
                return None
            
            trend_val, trend_arrow = self._parse_trend(reading.get("trend"))
            
            return CGMReading(
                timestamp=datetime.fromisoformat(reading["timestamp"].replace("Z", "+00:00")),
                glucose_mg_dl=reading["glucoseMgDl"],
                trend=trend_val,
                trend_arrow=trend_arrow,
                source="medtronic_api",
            )
    
    async def get_glucose_history(self, 
                                   start: datetime, 
                                   end: datetime,
                                   max_count: int = 288) -> List[CGMReading]:
        await self._ensure_valid_token()
        await self._ensure_session()
        
        headers = {"Authorization": f"Bearer {self.token.access_token}"}
        url = f"{self.BASE_URL}/v1/devices/cgm/readings"
        params = {
            "startTime": start.isoformat(),
            "endTime": end.isoformat(),
            "maxCount": max_count,
        }
        
        async with self.session.get(url, headers=headers, params=params) as resp:
            if resp.status != 200:
                return []
            
            data = await resp.json()
            readings = []
            
            for r in data.get("readings", []):
                trend_val, trend_arrow = self._parse_trend(r.get("trend"))
                readings.append(CGMReading(
                    timestamp=datetime.fromisoformat(r["timestamp"].replace("Z", "+00:00")),
                    glucose_mg_dl=r["glucoseMgDl"],
                    trend=trend_val,
                    trend_arrow=trend_arrow,
                    source="medtronic_api",
                ))
            return readings
    
    async def connect_websocket(self) -> bool:
        return False  # Not supported yet
    
    async def disconnect_websocket(self):
        pass


class CGMManager:
    """Manages multiple CGM clients with automatic fallback and unified interface."""
    
    def __init__(self):
        self.clients: Dict[CGMVendor, CGMClientBase] = {}
        self.primary: Optional[CGMVendor] = None
        self._polling_task: Optional[asyncio.Task] = None
        self._polling_interval = 300  # 5 minutes
        self._running = False
        self._callbacks: List[Callable[[CGMReading], None]] = []
    
    def add_client(self, vendor: CGMVendor, client: CGMClientBase, primary: bool = False):
        self.clients[vendor] = client
        client.add_callback(self._on_reading)
        if primary or self.primary is None:
            self.primary = vendor
    
    def remove_client(self, vendor: CGMVendor):
        if vendor in self.clients:
            self.clients[vendor].remove_callback(self._on_reading)
            del self.clients[vendor]
            if self.primary == vendor:
                self.primary = next(iter(self.clients.keys()), None)
    
    def _on_reading(self, reading: CGMReading):
        for cb in self._callbacks:
            try:
                cb(reading)
            except Exception as e:
                logger.error(f"Manager callback error: {e}")
    
    def add_callback(self, callback: Callable[[CGMReading], None]):
        self._callbacks.append(callback)
    
    async def start(self):
        self._running = True
        # Connect primary WebSocket if available
        if self.primary and self.primary in self.clients:
            await self.clients[self.primary].connect_websocket()
        
        # Start polling fallback
        self._polling_task = asyncio.create_task(self._polling_loop())
    
    async def stop(self):
        self._running = False
        if self._polling_task:
            self._polling_task.cancel()
            try:
                await self._polling_task
            except asyncio.CancelledError:
                pass
        
        for client in self.clients.values():
            await client.disconnect_websocket()
            await client.close()
    
    async def _polling_loop(self):
        while self._running:
            try:
                await self._poll_all()
            except Exception as e:
                logger.error(f"Polling error: {e}")
            await asyncio.sleep(self._polling_interval)
    
    async def _poll_all(self):
        if not self.primary or self.primary not in self.clients:
            return
        
        client = self.clients[self.primary]
        try:
            reading = await client.get_latest_glucose()
            if reading:
                self._notify_callbacks(reading)
        except Exception as e:
            logger.error(f"Polling failed for {self.primary}: {e}")
            # Try fallback clients
            for vendor, client in self.clients.items():
                if vendor == self.primary:
                    continue
                try:
                    reading = await client.get_latest_glucose()
                    if reading:
                        logger.info(f"Fallback to {vendor} successful")
                        self.primary = vendor
                        self._notify_callbacks(reading)
                        break
                except Exception:
                    continue
    
    async def get_latest_glucose(self) -> Optional[CGMReading]:
        if not self.primary or self.primary not in self.clients:
            return None
        
        client = self.clients[self.primary]
        reading = await client.get_latest_glucose()
        if reading:
            return reading
        
        # Try fallbacks
        for vendor, client in self.clients.items():
            if vendor == self.primary:
                continue
            reading = await client.get_latest_glucose()
            if reading:
                self.primary = vendor
                return reading
        return None
    
    async def get_glucose_history(self, 
                                   start: datetime, 
                                   end: datetime,
                                   vendor: Optional[CGMVendor] = None) -> List[CGMReading]:
        target_vendor = vendor or self.primary
        if not target_vendor or target_vendor not in self.clients:
            return []
        
        client = self.clients[target_vendor]
        return await client.get_glucose_history(start, end)
    
    async def get_latest_glucose(self) -> Optional[CGMReading]:
        """Get latest glucose reading with automatic fallback."""
        if not self.primary or self.primary not in self.clients:
            return None
        
        # Try primary first
        client = self.clients[self.primary]
        reading = await client.get_latest_glucose()
        if reading:
            return reading
        
        # Try fallbacks
        for vendor, client in self.clients.items():
            if vendor == self.primary:
                continue
            reading = await client.get_latest_glucose()
            if reading:
                logger.warning(f"Fallback to {vendor} successful")
                self.primary = vendor
                return reading
        
        return None
    
    def get_client(self, vendor: CGMVendor) -> Optional[CGMClientBase]:
        return self.clients.get(vendor)


# Factory function
def create_cgm_client(vendor: CGMVendor, config: CGMClientConfig) -> CGMClientBase:
    if vendor == CGMVendor.DEXCOM:
        return DexcomClient(config)
    elif vendor == CGMVendor.LIBRE:
        return LibreClient(config)
    elif vendor == CGMVendor.MEDTRONIC:
        return MedtronicClient(config)
    else:
        raise ValueError(f"Unknown CGM vendor: {vendor}")


# Usage example
async def example_usage():
    # Configure clients
    dexcom_config = CGMClientConfig(
        client_id="your_dexcom_client_id",
        client_secret="your_dexcom_secret",
        redirect_uri="https://your-app.com/auth/callback",
        sandbox=True,
    )
    
    libre_config = CGMClientConfig(
        client_id="your_libre_client_id",
        client_secret="your_libre_secret",
    )
    
    # Create manager
    manager = CGMManager()
    manager.add_client(CGMVendor.DEXCOM, create_cgm_client(CGMVendor.DEXCOM, dexcom_config), primary=True)
    manager.add_client(CGMVendor.LIBRE, create_cgm_client(CGMVendor.LIBRE, libre_config))
    
    # Add callback for real-time updates
    def on_glucose(reading: CGMReading):
        print(f"Glucose: {reading.glucose_mg_dl} mg/dL, Trend: {reading.trend_arrow}")
    
    manager.add_callback(on_glucose)
    
    # Start monitoring
    await manager.start()
    
    # Get latest reading
    reading = await manager.get_latest_glucose()
    if reading:
        print(f"Current glucose: {reading.glucose_mg_dl} mg/dL")
    
    # Get history
    history = await manager.get_glucose_history(
        start=datetime.now() - timedelta(hours=24),
        end=datetime.now()
    )
    print(f"History: {len(history)} readings")
    
    # Keep running
    await asyncio.sleep(3600)  # Run for 1 hour
    
    await manager.stop()


if __name__ == "__main__":
    # Example: authenticate and test
    async def test_dexcom():
        config = CGMClientConfig(
            client_id="test_id",
            client_secret="test_secret",
            redirect_uri="http://localhost/callback",
            sandbox=True,
        )
        client = DexcomClient(config)
        # Would need real auth_code from OAuth flow
        # await client.authenticate(auth_code="real_auth_code")
        # reading = await client.get_latest_glucose()
        # print(reading)
    
    # asyncio.run(test_dexcom())
    pass