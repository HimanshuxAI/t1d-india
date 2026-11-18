"""
CGM Vendor API Clients
Dexcom Share, Abbott Libre, Medtronic Guardian
"""

import asyncio
import aiohttp
import base64
import hashlib
import hmac
import time
import json
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from dataclasses import dataclass
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)


@dataclass
class CGMReading:
    """Standardized CGM reading."""
    timestamp: datetime
    glucose_mg_dL: int
    trend: Optional[int] = None       # -3 to +3
    trend_arrow: Optional[str] = None
    is_valid: bool = True
    source: str = "unknown"


class CGMClientBase(ABC):
    """Abstract base class for CGM API clients."""

    def __init__(self, client_id: str, client_secret: str, redirect_uri: str = ""):
        self.client_id = client_id
        self.client_secret = client_secret
        self.redirect_uri = redirect_uri
        self.access_token: Optional[str] = None
        self.refresh_token: Optional[str] = None
        self.token_expires_at: Optional[float] = None
        self.session: Optional[aiohttp.ClientSession] = None

    @abstractmethod
    async def authenticate(self, auth_code: str = None) -> bool:
        """Authenticate with the CGM API."""
        pass

    @abstractmethod
    async def get_latest_glucose(self) -> Optional[CGMReading]:
        """Get most recent glucose reading."""
        pass

    @abstractmethod
    async def get_glucose_history(
        self,
        start: datetime,
        end: datetime,
        max_count: int = 288
    ) -> List[CGMReading]:
        """Get glucose history for time range."""
        pass

    @abstractmethod
    async def refresh_access_token(self) -> bool:
        """Refresh expired access token."""
        pass

    async def _ensure_session(self):
        if self.session is None or self.session.closed:
            self.session = aiohttp.ClientSession()

    async def close(self):
        if self.session and not self.session.closed:
            await self.session.close()


class DexcomClient(CGMClientBase):
    """Dexcom Share API Client (G6/G7)."""

    BASE_URL = "https://api.dexcom.com/v2"
    AUTH_URL = "https://api.dexcom.com/v2/oauth2/token"

    def __init__(self, client_id: str, client_secret: str, redirect_uri: str, sandbox: bool = False):
        super().__init__(client_id, client_secret, redirect_uri)
        if sandbox:
            self.BASE_URL = "https://sandbox-api.dexcom.com/v2"
            self.AUTH_URL = "https://sandbox-api.dexcom.com/v2/oauth2/token"

    async def authenticate(self, auth_code: str) -> bool:
        """Exchange authorization code for tokens."""
        await self._ensure_session()

        data = {
            "grant_type": "authorization_code",
            "code": auth_code,
            "redirect_uri": self.redirect_uri,
            "client_id": self.client_id,
            "client_secret": self.client_secret,
        }

        async with self.session.post(self.AUTH_URL, data=data) as resp:
            if resp.status != 200:
                logger.error(f"Dexcom auth failed: {resp.status}")
                return False

            tokens = await resp.json()
            self.access_token = tokens["access_token"]
            self.refresh_token = tokens["refresh_token"]
            self.token_expires_at = time.time() + tokens["expires_in"] - 60  # 1 min buffer
            logger.info("Dexcom authentication successful")
            return True

    async def refresh_access_token(self) -> bool:
        """Refresh access token using refresh token."""
        if not self.refresh_token:
            return False

        await self._ensure_session()

        data = {
            "grant_type": "refresh_token",
            "refresh_token": self.refresh_token,
            "client_id": self.client_id,
            "client_secret": self.client_secret,
        }

        async with self.session.post(self.AUTH_URL, data=data) as resp:
            if resp.status != 200:
                logger.error(f"Dexcom token refresh failed: {resp.status}")
                return False

            tokens = await resp.json()
            self.access_token = tokens["access_token"]
            self.refresh_token = tokens["refresh_token"]
            self.token_expires_at = time.time() + tokens["expires_in"] - 60
            return True

    async def _ensure_valid_token(self):
        if not self.access_token or (self.token_expires_at and time.time() >= self.token_expires_at):
            await self.refresh_access_token()

    def _parse_dexcom_trend(self, trend: Optional[int]) -> tuple:
        """Parse Dexcom trend to standard format."""
        if trend is None:
            return None, None

        trend_arrows = {
            3: "↑↑", 2: "↑", 1: "↗",
            0: "→",
            -1: "↘", -2: "↓", -3: "↓↓"
        }
        return trend, trend_arrows.get(trend, "→")

    async def get_latest_glucose(self) -> Optional[CGMReading]:
        """Get latest glucose reading."""
        await self._ensure_valid_token()
        await self._ensure_session()

        headers = {"Authorization": f"Bearer {self.access_token}"}
        url = f"{self.BASE_URL}/users/self/egvs"

        # Get last 1 hour
        end = datetime.utcnow()
        start = end - timedelta(hours=1)

        params = {
            "startDate": start.strftime("%Y-%m-%dT%H:%M:%S"),
            "endDate": end.strftime("%Y-%m-%dT%H:%M:%S"),
        }

        async with self.session.get(url, headers=headers, params=params) as resp:
            if resp.status == 401:
                await self.refresh_access_token()
                return await self.get_latest_glucose()
            if resp.status != 200:
                logger.error(f"Dexcom latest glucose failed: {resp.status}")
                return None

            data = await resp.json()
            egvs = data.get("egvs", [])
            if not egvs:
                return None

            latest = egvs[-1]
            trend, trend_arrow = self._parse_dexcom_trend(latest.get("trend"))

            return CGMReading(
                timestamp=datetime.fromisoformat(latest["systemTime"].replace("Z", "+00:00")),
                glucose_mg_dL=latest["value"],
                trend=trend,
                trend_arrow=trend_arrow,
                source="dexcom_api",
            )

    async def get_glucose_history(
        self,
        start: datetime,
        end: datetime,
        max_count: int = 288
    ) -> List[CGMReading]:
        """Get glucose history."""
        await self._ensure_valid_token()
        await self._ensure_session()

        headers = {"Authorization": f"Bearer {self.access_token}"}
        url = f"{self.BASE_URL}/users/self/egvs"

        params = {
            "startDate": start.strftime("%Y-%m-%dT%H:%M:%S"),
            "endDate": end.strftime("%Y-%m-%dT%H:%M:%S"),
        }

        async with self.session.get(url, headers=headers, params=params) as resp:
            if resp.status == 401:
                await self.refresh_access_token()
                return await self.get_glucose_history(start, end, max_count)
            if resp.status != 200:
                logger.error(f"Dexcom history failed: {resp.status}")
                return []

            data = await resp.json()
            egvs = data.get("egvs", [])

            readings = []
            for egv in egvs[-max_count:]:
                trend, trend_arrow = self._parse_dexcom_trend(egv.get("trend"))
                readings.append(CGMReading(
                    timestamp=datetime.fromisoformat(egv["systemTime"].replace("Z", "+00:00")),
                    glucose_mg_dL=egv["value"],
                    trend=trend,
                    trend_arrow=trend_arrow,
                    source="dexcom_api",
                ))

            return readings


class LibreClient(CGMClientBase):
    """Abbott Libre API Client (Libre 2/3 via LibreView)."""

    BASE_URL = "https://api.libreview.io"
    AUTH_URL = "https://api.libreview.io/auth/login"

    def __init__(self, client_id: str, client_secret: str, redirect_uri: str = ""):
        super().__init__(client_id, client_secret, redirect_uri)
        self.account_id: Optional[str] = None

    async def authenticate(self, email: str, password: str) -> bool:
        """Authenticate with email/password (LibreView)."""
        await self._ensure_session()

        data = {
            "email": email,
            "password": password,
        }

        headers = {
            "Content-Type": "application/json",
            "product": "libre",
            "version": "4.7.0",
        }

        async with self.session.post(self.AUTH_URL, json=data, headers=headers) as resp:
            if resp.status != 200:
                logger.error(f"Libre auth failed: {resp.status}")
                return False

            data = await resp.json()
            auth_ticket = data.get("data", {}).get("authTicket", {})
            self.access_token = auth_ticket.get("token")
            self.token_expires_at = time.time() + 12 * 3600  # 12 hours
            self.account_id = data.get("data", {}).get("user", {}).get("id")

            logger.info("Libre authentication successful")
            return True

    async def refresh_access_token(self) -> bool:
        """Libre uses session tokens - re-authenticate."""
        # Would need stored credentials - not implemented for security
        return False

    async def _ensure_valid_token(self):
        if not self.access_token or (self.token_expires_at and time.time() >= self.token_expires_at):
            logger.warning("Libre token expired, re-authentication required")
            return False
        return True

    def _parse_libre_trend(self, trend: Optional[str]) -> tuple:
        """Parse Libre trend arrow."""
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
        """Get latest glucose reading."""
        if not await self._ensure_valid_token():
            return None

        await self._ensure_session()
        headers = {
            "Authorization": f"Bearer {self.access_token}",
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

            # Get latest connection
            conn = connections[0]
            glucose = conn.get("glucoseMeasurement", {})
            if not glucose:
                return None

            trend_val, trend_arrow = self._parse_libre_trend(glucose.get("trendArrow"))

            return CGMReading(
                timestamp=datetime.fromtimestamp(glucose["factoryTimestamp"] / 1000),
                glucose_mg_dL=glucose["valueInMgPerDl"],
                trend=trend_val,
                trend_arrow=trend_arrow,
                source="libre_api",
            )

    async def get_glucose_history(
        self,
        start: datetime,
        end: datetime,
        max_count: int = 288
    ) -> List[CGMReading]:
        """Get glucose history."""
        if not await self._ensure_valid_token():
            return []

        await self._ensure_session()
        headers = {
            "Authorization": f"Bearer {self.access_token}",
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
                trend_val, trend_arrow = self._parse_libre_trend(point.get("trendArrow"))
                readings.append(CGMReading(
                    timestamp=datetime.fromtimestamp(point["timestamp"] / 1000),
                    glucose_mg_dL=point["valueInMgPerDl"],
                    trend=trend_val,
                    trend_arrow=trend_arrow,
                    source="libre_api",
                ))

            return readings[-max_count:]


class MedtronicClient(CGMClientBase):
    """Medtronic Guardian API Client (via CareLink)."""

    BASE_URL = "https://api.medtronic.com"
    AUTH_URL = "https://api.medtronic.com/oauth2/token"

    def __init__(self, client_id: str, client_secret: str, redirect_uri: str):
        super().__init__(client_id, client_secret, redirect_uri)

    async def authenticate(self, auth_code: str) -> bool:
        """OAuth2 authorization code flow."""
        await self._ensure_session()

        data = {
            "grant_type": "authorization_code",
            "code": auth_code,
            "redirect_uri": self.redirect_uri,
            "client_id": self.client_id,
            "client_secret": self.client_secret,
        }

        async with self.session.post(self.AUTH_URL, data=data) as resp:
            if resp.status != 200:
                return False

            tokens = await resp.json()
            self.access_token = tokens["access_token"]
            self.refresh_token = tokens["refresh_token"]
            self.token_expires_at = time.time() + tokens["expires_in"] - 60
            return True

    async def refresh_access_token(self) -> bool:
        if not self.refresh_token:
            return False

        await self._ensure_session()
        data = {
            "grant_type": "refresh_token",
            "refresh_token": self.refresh_token,
            "client_id": self.client_id,
            "client_secret": self.client_secret,
        }

        async with self.session.post(self.AUTH_URL, data=data) as resp:
            if resp.status != 200:
                return False

            tokens = await resp.json()
            self.access_token = tokens["access_token"]
            self.refresh_token = tokens["refresh_token"]
            self.token_expires_at = time.time() + tokens["expires_in"] - 60
            return True

    async def _ensure_valid_token(self):
        if not self.access_token or (self.token_expires_at and time.time() >= self.token_expires_at):
            await self.refresh_access_token()

    def _parse_medtronic_trend(self, trend: Optional[str]) -> tuple:
        """Parse Medtronic trend."""
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

        headers = {"Authorization": f"Bearer {self.access_token}"}
        url = f"{self.BASE_URL}/v1/devices/cgm/readings/latest"

        async with self.session.get(url, headers=headers) as resp:
            if resp.status != 200:
                return None

            data = await resp.json()
            reading = data.get("reading", {})
            if not reading:
                return None

            trend_val, trend_arrow = self._parse_medtronic_trend(reading.get("trend"))

            return CGMReading(
                timestamp=datetime.fromisoformat(reading["timestamp"].replace("Z", "+00:00")),
                glucose_mg_dL=reading["glucoseMgDl"],
                trend=trend_val,
                trend_arrow=trend_arrow,
                source="medtronic_api",
            )

    async def get_glucose_history(
        self,
        start: datetime,
        end: datetime,
        max_count: int = 288
    ) -> List[CGMReading]:
        await self._ensure_valid_token()
        await self._ensure_session()

        headers = {"Authorization": f"Bearer {self.access_token}"}
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
                trend_val, trend_arrow = self._parse_medtronic_trend(r.get("trend"))
                readings.append(CGMReading(
                    timestamp=datetime.fromisoformat(r["timestamp"].replace("Z", "+00:00")),
                    glucose_mg_dL=r["glucoseMgDl"],
                    trend=trend_val,
                    trend_arrow=trend_arrow,
                    source="medtronic_api",
                ))

            return readings


class BluetoothCGMClient:
    """Local Bluetooth CGM client (Web Bluetooth API fallback)."""

    def __init__(self):
        self.device: Optional[Any] = None
        self.characteristic: Optional[Any] = None
        self.on_reading: Optional[callable] = None

    async def connect(self, device_name_filter: str = "Dexcom|Libre|Medtronic") -> bool:
        """Connect to CGM via Web Bluetooth."""
        try:
            # This runs in browser context - placeholder for actual implementation
            # In Python, would use bleak or similar for native Bluetooth
            logger.info("Bluetooth CGM connection - requires browser context")
            return False
        except Exception as e:
            logger.error(f"Bluetooth connection failed: {e}")
            return False

    async def start_notifications(self):
        """Start receiving glucose notifications."""
        pass

    async def disconnect(self):
        """Disconnect from device."""
        pass


class CGMManager:
    """Manages multiple CGM clients with fallback."""

    def __init__(self):
        self.clients: Dict[str, CGMClientBase] = {}
        self.primary: Optional[str] = None

    def add_client(self, name: str, client: CGMClientBase, primary: bool = False):
        self.clients[name] = client
        if primary or self.primary is None:
            self.primary = name

    async def get_latest_glucose(self) -> Optional[CGMReading]:
        """Try primary, then fallbacks."""
        if not self.primary:
            return None

        # Try primary
        client = self.clients[self.primary]
        reading = await client.get_latest_glucose()
        if reading:
            return reading

        # Try fallbacks
        for name, client in self.clients.items():
            if name == self.primary:
                continue
            reading = await client.get_latest_glucose()
            if reading:
                logger.warning(f"Using fallback CGM: {name}")
                return reading

        return None

    async def get_glucose_history(
        self,
        start: datetime,
        end: datetime,
    ) -> List[CGMReading]:
        """Get history from primary client."""
        if not self.primary:
            return []

        client = self.clients[self.primary]
        return await client.get_glucose_history(start, end)

    async def close_all(self):
        for client in self.clients.values():
            await client.close()


# Factory function
def create_cgm_client(
    vendor: str,
    client_id: str,
    client_secret: str,
    redirect_uri: str = "",
    **kwargs
) -> CGMClientBase:
    """Factory to create CGM client by vendor."""
    vendor = vendor.lower()

    if vendor == "dexcom":
        return DexcomClient(client_id, client_secret, redirect_uri, kwargs.get("sandbox", False))
    elif vendor == "libre":
        return LibreClient(client_id, client_secret, redirect_uri)
    elif vendor == "medtronic":
        return MedtronicClient(client_id, client_secret, redirect_uri)
    else:
        raise ValueError(f"Unknown CGM vendor: {vendor}")


if __name__ == "__main__":
    # Example usage
    import asyncio

    async def test_dexcom():
        # Would need real credentials
        client = DexcomClient("client_id", "client_secret", "http://localhost/callback", sandbox=True)
        # await client.authenticate("auth_code")
        # reading = await client.get_latest_glucose()
        # print(reading)

    asyncio.run(test_dexcom())