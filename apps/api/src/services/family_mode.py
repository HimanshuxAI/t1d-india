"""
Family/Caregiver Mode
Shared alerts, emergency escalation, and remote monitoring for T1D family members.
"""

import asyncio
import logging
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
import uuid
from typing import Dict, List, Optional, Set, Any, Callable
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum
from fastapi import HTTPException
from pydantic import BaseModel, Field, EmailStr
import asyncio
import logging

logger = logging.getLogger(__name__)

class RelationshipType(str, Enum):
    PARENT = "parent"
    CHILD = "child"
    SPOUSE = "spouse"
    SIBLING = "sibling"
    GRANDPARENT = "grandparent"
    CAREGIVER = "caregiver"
    DOCTOR = "doctor"
    NURSE = "nurse"
    OTHER = "other"

class AlertSeverity(str, Enum):
    INFO = "info"
    WARNING = "warning"
    URGENT = "urgent"
    EMERGENCY = "emergency"

class AlertType(str, Enum):
    HYPOGLYCEMIA = "hypoglycemia"
    SEVERE_HYPOGLYCEMIA = "severe_hypoglycemia"
    HYPERGLYCEMIA = "hyperglycemia"
    RAPID_DROP = "rapid_drop"
    RAPID_RISE = "rapid_rise"
    SIGNAL_LOSS = "signal_loss"
    MISSED_INSULIN = "missed_insulin"
    MISSED_MEAL = "missed_meal"
    LOW_BATTERY = "low_battery"
    DEVICE_ERROR = "device_error"
    MISSED_CHECKIN = "missed_checkin"

class EscalationLevel(int, Enum):
    LEVEL_0 = 0  # Patient only
    LEVEL_1 = 1  # Primary caregiver
    LEVEL_2 = 2  # Secondary caregiver
    LEVEL_3 = 3  # Emergency contacts
    LEVEL_4 = 4  # Emergency services

@dataclass
class FamilyMember:
    id: str
    user_id: str
    name: str
    email: str
    phone: Optional[str] = None
    relationship: RelationshipType = RelationshipType.CAREGIVER
    permissions: Set[str] = field(default_factory=set)
    notification_preferences: Dict[str, bool] = field(default_factory=lambda: {
        "push": True,
        "email": True,
        "sms": True,
        "call": False,
    })
    escalation_level: EscalationLevel = EscalationLevel.LEVEL_1
    is_primary: bool = False
    is_emergency_contact: bool = False
    timezone: str = "Asia/Kolkata"
    language: str = "en"
    created_at: datetime = field(default_factory=datetime.utcnow)
    last_active: Optional[datetime] = None

@dataclass
class FamilyGroup:
    id: str
    name: str
    patient_id: str
    members: Dict[str, FamilyMember] = field(default_factory=dict)
    settings: Dict[str, Any] = field(default_factory=lambda: {
        "auto_escalate": True,
        "escalation_timeout_min": 15,
        "require_acknowledgment": True,
        "share_glucose": True,
        "share_insulin": True,
        "share_meals": True,
        "share_activity": True,
        "emergency_services_enabled": True,
        "emergency_number": "108",  # India emergency
    })
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)

@dataclass
class FamilyAlert:
    id: str
    family_id: str
    patient_id: str
    alert_type: AlertType
    severity: AlertSeverity
    message: str
    data: Dict[str, Any] = field(default_factory=dict)
    escalation_level: EscalationLevel = EscalationLevel.LEVEL_0
    acknowledged: bool = False
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    escalated: bool = False
    escalated_at: Optional[datetime] = None
    resolved: bool = False
    resolved_at: Optional[datetime] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    acknowledged_by_name: Optional[str] = None

@dataclass
class CheckIn:
    id: str
    patient_id: str
    family_id: str
    expected_at: datetime
    completed_at: Optional[datetime] = None
    glucose_value: Optional[int] = None
    notes: Optional[str] = None
    reminder_sent: bool = False
    escalated: bool = False

class FamilyModeService:
    """Manages family groups, alerts, escalations, and caregiver notifications."""
    
    def __init__(self):
        self.families: Dict[str, FamilyGroup] = {}
        self.patient_to_family: Dict[str, str] = {}
        self.alerts: Dict[str, FamilyAlert] = {}
        self.check_ins: Dict[str, CheckIn] = {}
        self.notification_callbacks: List[Callable] = []
        self.escalation_tasks: Dict[str, asyncio.Task] = {}
        self._running = False
        self._monitor_task: Optional[asyncio.Task] = None
    
    async def start(self):
        self._running = True
        self._monitor_task = asyncio.create_task(self._monitor_loop())
        logger.info("Family mode service started")
    
    async def stop(self):
        self._running = False
        for task in self.escalation_tasks.values():
            task.cancel()
        if self._monitor_task:
            self._monitor_task.cancel()
            try:
                await self._monitor_task
            except asyncio.CancelledError:
                pass
        logger.info("Family mode service stopped")
    
    def add_notification_callback(self, callback: Callable):
        self.notification_callbacks.append(callback)
    
    # ============================================
    # FAMILY MANAGEMENT
    # ============================================
    
    async def create_family(self, patient_id: str, name: str = None) -> FamilyGroup:
        family = FamilyGroup(
            id=str(uuid.uuid4()),
            name=name or f"Family of {patient_id}",
            patient_id=patient_id,
        )
        self.families[family.id] = family
        self.patient_to_family[patient_id] = family.id
        logger.info(f"Created family {family.id} for patient {patient_id}")
        return family
    
    async def add_member(self, family_id: str, member: FamilyMember) -> FamilyMember:
        family = self.families.get(family_id)
        if not family:
            raise ValueError(f"Family {family_id} not found")
        
        family.members[member.id] = member
        family.updated_at = datetime.utcnow()
        logger.info(f"Added member {member.id} to family {family_id}")
        return member
    
    async def invite_member(self, family_id: str, email: str, 
                            relationship: RelationshipType,
                            permissions: Set[str] = None,
                            escalation_level: EscalationLevel = EscalationLevel.LEVEL_1) -> FamilyMember:
        family = self.families.get(family_id)
        if not family:
            raise ValueError(f"Family {family_id} not found")
        
        member = FamilyMember(
            id=str(uuid.uuid4()),
            user_id="",  # Will be set when they accept
            name="",  # Will be set when they accept
            email=email,
            relationship=relationship,
            permissions=permissions or {"view_glucose", "view_alerts", "view_insulin"},
            escalation_level=escalation_level,
        )
        
        family.members[member.id] = member
        family.updated_at = datetime.utcnow()
        
        # Send invitation email
        await self._send_invitation_email(member, family)
        
        logger.info(f"Invited {email} to family {family_id}")
        return member
    
    async def accept_invitation(self, family_id: str, member_id: str, 
                                user_id: str, name: str) -> FamilyMember:
        family = self.families.get(family_id)
        if not family:
            raise ValueError(f"Family {family_id} not found")
        
        member = family.members.get(member_id)
        if not member:
            raise ValueError(f"Member {member_id} not found")
        
        member.user_id = user_id
        member.name = name
        member.last_active = datetime.utcnow()
        family.updated_at = datetime.utcnow()
        
        logger.info(f"Member {member_id} accepted invitation to family {family_id}")
        return member
    
    async def remove_member(self, family_id: str, member_id: str) -> bool:
        family = self.families.get(family_id)
        if not family or member_id not in family.members:
            return False
        
        del family.members[member_id]
        family.updated_at = datetime.utcnow()
        return True
    
    async def update_member_permissions(self, family_id: str, member_id: str,
                                         permissions: Set[str],
                                         escalation_level: EscalationLevel = None) -> bool:
        family = self.families.get(family_id)
        if not family or member_id not in family.members:
            return False
        
        member = family.members[member_id]
        member.permissions = permissions
        if escalation_level:
            member.escalation_level = escalation_level
        family.updated_at = datetime.utcnow()
        return True
    
    # ============================================
    # ALERT MANAGEMENT
    # ============================================
    
    async def create_alert(self, 
                           patient_id: str,
                           alert_type: AlertType,
                           severity: AlertSeverity,
                           message: str,
                           data: Dict[str, Any] = None) -> FamilyAlert:
        
        family_id = self.patient_to_family.get(patient_id)
        if not family_id:
            raise ValueError(f"No family found for patient {patient_id}")
        
        family = self.families[family_id]
        
        # Determine initial escalation level based on severity
        escalation_map = {
            AlertSeverity.INFO: EscalationLevel.LEVEL_0,
            AlertSeverity.WARNING: EscalationLevel.LEVEL_1,
            AlertSeverity.URGENT: EscalationLevel.LEVEL_2,
            AlertSeverity.EMERGENCY: EscalationLevel.LEVEL_3,
        }
        
        alert = FamilyAlert(
            id=str(uuid.uuid4()),
            family_id=family_id,
            patient_id=patient_id,
            alert_type=alert_type,
            severity=severity,
            message=message,
            data=data or {},
            escalation_level=escalation_map.get(severity, EscalationLevel.LEVEL_0),
        )
        
        self.alerts[alert.id] = alert
        
        # Send initial notifications
        await self._notify_family(family, alert)
        
        # Start escalation timer if needed
        if alert.escalation_level > EscalationLevel.LEVEL_0:
            await self._start_escalation_timer(alert)
        
        logger.info(f"Created alert {alert.id} for patient {patient_id}: {alert_type.value}")
        return alert
    
    async def acknowledge_alert(self, alert_id: str, user_id: str, name: str) -> bool:
        alert = self.alerts.get(alert_id)
        if not alert:
            return False
        
        if alert.acknowledged:
            return False
        
        alert.acknowledged = True
        alert.acknowledged_by = user_id
        alert.acknowledged_at = datetime.utcnow()
        alert.acknowledged_by_name = name
        
        # Cancel escalation timer
        if alert.id in self.escalation_tasks:
            self.escalation_tasks[alert.id].cancel()
            del self.escalation_tasks[alert.id]
        
        # Notify family that alert was acknowledged
        family = self.families.get(alert.family_id)
        if family:
            await self._notify_acknowledgment(family, alert, name)
        
        logger.info(f"Alert {alert_id} acknowledged by {name}")
        return True
    
    async def resolve_alert(self, alert_id: str, user_id: str) -> bool:
        alert = self.alerts.get(alert_id)
        if not alert:
            return False
        
        alert.resolved = True
        alert.resolved_at = datetime.utcnow()
        
        # Cancel any pending escalation
        if alert.id in self.escalation_tasks:
            self.escalation_tasks[alert.id].cancel()
            del self.escalation_tasks[alert.id]
        
        logger.info(f"Alert {alert_id} resolved by {user_id}")
        return True
    
    async def _notify_family(self, family: FamilyGroup, alert: FamilyAlert):
        """Send alert notifications to family members based on permissions and escalation level."""
        eligible_members = []
        
        for member in family.members.values():
            if not member.user_id:
                continue  # Not yet accepted
            
            # Check if member should receive this alert
            if not self._should_notify(member, alert):
                continue
            
            eligible_members.append(member)
        
        # Send notifications
        for member in eligible_members:
            await self._send_notification(member, alert)
    
    def _should_notify(self, member: FamilyMember, alert: FamilyAlert) -> bool:
        # Check permissions
        if "view_alerts" not in member.permissions:
            return False
        
        # Check escalation level
        if member.escalation_level.value < alert.escalation_level.value:
            return False
        
        # Check notification preferences
        return True
    
    async def _send_notification(self, member: FamilyMember, alert: FamilyAlert):
        for callback in self.notification_callbacks:
            try:
                await callback(member, alert)
            except Exception as e:
                logger.error(f"Notification callback error: {e}")
        
        # Log notification
        logger.info(f"Sent {alert.severity.value} alert to {member.name} ({member.id})")
    
    async def _notify_acknowledgment(self, family: FamilyGroup, alert: FamilyAlert, acknowledged_by: str):
        """Notify family that alert was acknowledged."""
        for member in family.members.values():
            if member.user_id and "view_alerts" in member.permissions:
                for callback in self.notification_callbacks:
                    try:
                        await callback(member, {
                            "type": "acknowledgment",
                            "alert_id": alert.id,
                            "acknowledged_by": acknowledged_by,
                            "message": f"{acknowledged_by} acknowledged the alert: {alert.message}",
                        })
                    except Exception:
                        pass
    
    async def _start_escalation_timer(self, alert: FamilyAlert):
        """Start escalation timer for unacknowledged alerts."""
        family = self.families.get(alert.family_id)
        if not family:
            return
        
        timeout_min = family.settings.get("escalation_timeout_min", 15)
        
        async def escalate():
            try:
                await asyncio.sleep(timeout_min * 60)
                
                # Check if still unacknowledged
                alert = self.alerts.get(alert.id)
                if not alert or alert.acknowledged or alert.resolved:
                    return
                
                # Escalate
                await self._escalate_alert(alert)
            except asyncio.CancelledError:
                pass
            except Exception as e:
                logger.error(f"Escalation error: {e}")
        
        task = asyncio.create_task(escalate())
        self.escalation_tasks[alert.id] = task
    
    async def _escalate_alert(self, alert: FamilyAlert):
        """Escalate alert to next level."""
        if alert.escalated or alert.acknowledged or alert.resolved:
            return
        
        alert.escalated = True
        alert.escalated_at = datetime.utcnow()
        alert.escalation_level = EscalationLevel(min(alert.escalation_level.value + 1, 4))
        
        family = self.families.get(alert.family_id)
        if not family:
            return
        
        # Notify at new escalation level
        await self._notify_family(family, alert)
        
        # Schedule next escalation if not at max
        if alert.escalation_level < EscalationLevel.LEVEL_4:
            timeout_min = family.settings.get("escalation_timeout_min", 15)
            
            async def escalate_further():
                try:
                    await asyncio.sleep(timeout_min * 60)
                    alert = self.alerts.get(alert.id)
                    if alert and not alert.acknowledged and not alert.resolved:
                        await self._escalate_alert(alert)
                except asyncio.CancelledError:
                    pass
            
            task = asyncio.create_task(escalate_further())
            self.escalation_tasks[alert.id] = task
        else:
            # Level 4 - emergency services
            if family.settings.get("emergency_services_enabled"):
                await self._contact_emergency_services(alert, family)
    
    async def _contact_emergency_services(self, alert: FamilyAlert, family: FamilyGroup):
        """Contact emergency services (Level 4 escalation)."""
        logger.critical(f"EMERGENCY ESCALATION: Alert {alert.id} for patient {alert.patient_id}")
        
        # In production, integrate with emergency services API
        # For now, notify all emergency contacts
        for member in family.members.values():
            if member.is_emergency_contact:
                for callback in self.notification_callbacks:
                    try:
                        await callback(member, {
                            "type": "emergency_escalation",
                            "alert": alert,
                            "message": f"EMERGENCY: {alert.message}. Patient {family.patient_id} needs immediate help!",
                        })
                    except Exception:
                        pass
    
    # ============================================
    # CHECK-IN SYSTEM
    # ============================================
    
    async def schedule_checkin(self, patient_id: str, expected_at: datetime,
                                family_id: str = None) -> CheckIn:
        if not family_id:
            family_id = self.patient_to_family.get(patient_id)
            if not family_id:
                raise ValueError(f"No family for patient {patient_id}")
        
        checkin = CheckIn(
            id=str(uuid.uuid4()),
            patient_id=patient_id,
            family_id=family_id,
            expected_at=expected_at,
        )
        
        self.check_ins[checkin.id] = checkin
        logger.info(f"Scheduled check-in {checkin.id} for patient {patient_id} at {expected_at}")
        return checkin
    
    async def complete_checkin(self, checkin_id: str, glucose_value: int = None,
                                notes: str = None) -> bool:
        checkin = self.check_ins.get(checkin_id)
        if not checkin:
            return False
        
        checkin.completed_at = datetime.utcnow()
        checkin.glucose_value = glucose_value
        checkin.notes = notes
        
        # Cancel any pending reminder/escalation
        logger.info(f"Check-in {checkin_id} completed by patient {checkin.patient_id}")
        return True
    
    async def _monitor_loop(self):
        """Background monitoring for check-ins, missed alerts, etc."""
        while True:
            try:
                await self._check_missed_checkins()
                await self._check_stale_alerts()
                await self._check_device_status()
            except Exception as e:
                logger.error(f"Monitor loop error: {e}")
            
            await asyncio.sleep(60)  # Check every minute
    
    async def _check_missed_checkins(self):
        now = datetime.utcnow()
        
        for checkin in list(self.check_ins.values()):
            if checkin.completed_at:
                continue
            
            if checkin.expected_at < now - timedelta(minutes=30):
                # Missed check-in
                if not checkin.escalated:
                    checkin.escalated = True
                    await self._handle_missed_checkin(checkin)
    
    async def _handle_missed_checkin(self, checkin: CheckIn):
        family = self.families.get(checkin.family_id)
        if not family:
            return
        
        await self.create_alert(
            patient_id=checkin.patient_id,
            alert_type=AlertType.MISSED_CHECKIN,
            severity=AlertSeverity.WARNING,
            message=f"Missed check-in scheduled for {checkin.expected_at.strftime('%H:%M')}",
            data={"checkin_id": checkin.id, "expected_at": checkin.expected_at.isoformat()},
        )
    
    async def _check_stale_alerts(self):
        """Check for alerts that haven't been acknowledged."""
        now = datetime.utcnow()
        
        for alert in list(self.alerts.values()):
            if alert.acknowledged or alert.resolved:
                continue
            
            # Alerts older than 1 hour without acknowledgment
            if (now - alert.created_at).total_seconds() > 3600:
                # Already escalated or at max level
                pass
    
    async def _check_device_status(self):
        """Check for device issues (signal loss, low battery, etc.)."""
        # Would integrate with CGM manager
        pass
    
    # ============================================
    # QUERY METHODS
    # ============================================
    
    def get_family(self, family_id: str) -> Optional[FamilyGroup]:
        return self.families.get(family_id)
    
    def get_family_by_patient(self, patient_id: str) -> Optional[FamilyGroup]:
        family_id = self.patient_to_family.get(patient_id)
        if family_id:
            return self.families.get(family_id)
        return None
    
    def get_active_alerts(self, family_id: str) -> List[FamilyAlert]:
        family = self.families.get(family_id)
        if not family:
            return []
        
        return [
            alert for alert in self.alerts.values()
            if alert.family_id == family_id and not alert.resolved
        ]
    
    def get_pending_checkins(self, family_id: str) -> List[CheckIn]:
        return [
            c for c in self.check_ins.values()
            if c.family_id == family_id and not c.completed_at
        ]
    
    def get_member(self, family_id: str, member_id: str) -> Optional[FamilyMember]:
        family = self.families.get(family_id)
        if family:
            return family.members.get(member_id)
        return None
    
    # ============================================
    # NOTIFICATION HELPERS
    # ============================================
    
    async def _send_invitation_email(self, member: FamilyMember, family: FamilyGroup):
        """Send invitation email to new family member."""
        # In production, integrate with email service
        logger.info(f"Sending invitation to {member.email} for family {family.id}")
    
    async def _send_notification(self, member: FamilyMember, alert: FamilyAlert):
        """Send notification via configured channels."""
        prefs = member.notification_preferences
        
        notification_data = {
            "member_id": member.id,
            "member_name": member.name,
            "alert": alert,
            "channels": [],
        }
        
        if prefs.get("push"):
            notification_data["channels"].append("push")
        if prefs.get("email"):
            notification_data["channels"].append("email")
        if prefs.get("sms"):
            notification_data["channels"].append("sms")
        if prefs.get("call") and alert.severity == AlertSeverity.EMERGENCY:
            notification_data["channels"].append("call")
        
        # Call notification callbacks
        for callback in self.notification_callbacks:
            try:
                await callback(notification_data)
            except Exception as e:
                logger.error(f"Notification callback error: {e}")


# ============================================
# FASTAPI ROUTES
# ============================================

from fastapi import FastAPI, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr

family_service = FamilyModeService()

app = FastAPI(title="T1D India Family Mode API")

# Request/Response models
class CreateFamilyRequest(BaseModel):
    patient_id: str
    name: Optional[str] = None

class InviteMemberRequest(BaseModel):
    email: EmailStr
    relationship: RelationshipType
    permissions: List[str] = ["view_glucose", "view_alerts", "view_insulin"]
    escalation_level: EscalationLevel = EscalationLevel.LEVEL_1

class AcceptInvitationRequest(BaseModel):
    user_id: str
    name: str

class MemberPermissionsRequest(BaseModel):
    permissions: List[str]
    escalation_level: Optional[EscalationLevel] = None

class AlertRequest(BaseModel):
    patient_id: str
    alert_type: AlertType
    severity: AlertSeverity
    message: str
    data: Dict[str, Any] = {}

class AcknowledgeAlertRequest(BaseModel):
    user_id: str
    name: str

class CheckInRequest(BaseModel):
    patient_id: str
    expected_at: datetime
    family_id: Optional[str] = None

class CompleteCheckInRequest(BaseModel):
    glucose_value: Optional[int] = None
    notes: Optional[str] = None

# Routes
@app.post("/api/families", response_model=dict)
async def create_family(request: CreateFamilyRequest):
    family = await family_service.create_family(request.patient_id, request.name)
    return {"family_id": family.id, "name": family.name}

@app.get("/api/families/{family_id}", response_model=dict)
async def get_family(family_id: str):
    family = family_service.get_family(family_id)
    if not family:
        raise HTTPException(status_code=404, detail="Family not found")
    
    return {
        "id": family.id,
        "name": family.name,
        "patient_id": family.patient_id,
        "members": [
            {
                "id": m.id,
                "name": m.name,
                "email": m.email,
                "relationship": m.relationship.value,
                "permissions": list(m.permissions),
                "escalation_level": m.escalation_level.value,
                "is_primary": m.is_primary,
                "is_emergency_contact": m.is_emergency_contact,
            }
            for m in family.members.values()
        ],
        "settings": family.settings,
    }

@app.post("/api/families/{family_id}/invite", response_model=dict)
async def invite_member(family_id: str, request: InviteMemberRequest):
    member = await family_service.invite_member(
        family_id, request.email, request.relationship,
        set(request.permissions), request.escalation_level
    )
    return {"member_id": member.id, "email": member.email}

@app.post("/api/families/{family_id}/members/{member_id}/accept", response_model=dict)
async def accept_invitation(family_id: str, member_id: str, request: AcceptInvitationRequest):
    member = await family_service.accept_invitation(family_id, member_id, request.user_id, request.name)
    return {"member_id": member.id, "name": member.name}

@app.delete("/api/families/{family_id}/members/{member_id}", response_model=dict)
async def remove_member(family_id: str, member_id: str):
    success = await family_service.remove_member(family_id, member_id)
    if not success:
        raise HTTPException(status_code=404, detail="Member not found")
    return {"success": True}

@app.patch("/api/families/{family_id}/members/{member_id}/permissions", response_model=dict)
async def update_permissions(family_id: str, member_id: str, request: MemberPermissionsRequest):
    success = await family_service.update_member_permissions(
        family_id, member_id, set(request.permissions), request.escalation_level
    )
    if not success:
        raise HTTPException(status_code=404, detail="Member not found")
    return {"success": True}

@app.post("/api/alerts", response_model=dict)
async def create_alert(request: AlertRequest):
    alert = await family_service.create_alert(
        request.patient_id,
        request.alert_type,
        request.severity,
        request.message,
        request.data,
    )
    return {"alert_id": alert.id}

@app.get("/api/families/{family_id}/alerts", response_model=List[dict])
async def get_alerts(family_id: str, active_only: bool = True):
    alerts = family_service.get_active_alerts(family_id) if active_only else \
             [a for a in family_service.alerts.values() if a.family_id == family_id]
    
    return [
        {
            "id": a.id,
            "patient_id": a.patient_id,
            "type": a.alert_type.value,
            "severity": a.severity.value,
            "message": a.message,
            "data": a.data,
            "escalation_level": a.escalation_level.value,
            "acknowledged": a.acknowledged,
            "acknowledged_by": a.acknowledged_by,
            "acknowledged_at": a.acknowledged_at.isoformat() if a.acknowledged_at else None,
            "escalated": a.escalated,
            "escalated_at": a.escalated_at.isoformat() if a.escalated_at else None,
            "resolved": a.resolved,
            "created_at": a.created_at.isoformat(),
        }
        for a in alerts
    ]

@app.post("/api/alerts/{alert_id}/acknowledge", response_model=dict)
async def acknowledge_alert(alert_id: str, request: AcknowledgeAlertRequest):
    success = await family_service.acknowledge_alert(alert_id, request.user_id, request.name)
    if not success:
        raise HTTPException(status_code=404, detail="Alert not found or already acknowledged")
    return {"success": True}

@app.post("/api/alerts/{alert_id}/resolve", response_model=dict)
async def resolve_alert(alert_id: str, user_id: str):
    success = await family_service.resolve_alert(alert_id, user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"success": True}

@app.post("/api/checkins", response_model=dict)
async def schedule_checkin(request: CheckInRequest):
    checkin = await family_service.schedule_checkin(
        request.patient_id, request.expected_at, request.family_id
    )
    return {"checkin_id": checkin.id, "expected_at": checkin.expected_at.isoformat()}

@app.post("/api/checkins/{checkin_id}/complete", response_model=dict)
async def complete_checkin(checkin_id: str, request: CompleteCheckInRequest):
    success = await family_service.complete_checkin(
        checkin_id, request.glucose_value, request.notes
    )
    if not success:
        raise HTTPException(status_code=404, detail="Check-in not found")
    return {"success": True}

@app.get("/api/families/{family_id}/checkins", response_model=List[dict])
async def get_checkins(family_id: str, pending_only: bool = True):
    checkins = family_service.get_pending_checkins(family_id) if pending_only else \
               [c for c in family_service.check_ins.values() if c.family_id == family_id]
    
    return [
        {
            "id": c.id,
            "patient_id": c.patient_id,
            "expected_at": c.expected_at.isoformat(),
            "completed_at": c.completed_at.isoformat() if c.completed_at else None,
            "glucose_value": c.glucose_value,
            "notes": c.notes,
        }
        for c in checkins
    ]

@app.get("/api/families/{family_id}/members", response_model=List[dict])
async def list_members(family_id: str):
    family = family_service.get_family(family_id)
    if not family:
        raise HTTPException(status_code=404, detail="Family not found")
    
    return [
        {
            "id": m.id,
            "user_id": m.user_id,
            "name": m.name,
            "email": m.email,
            "relationship": m.relationship.value,
            "permissions": list(m.permissions),
            "escalation_level": m.escalation_level.value,
            "is_primary": m.is_primary,
            "is_emergency_contact": m.is_emergency_contact,
            "last_active": m.last_active.isoformat() if m.last_active else None,
        }
        for m in family.members.values()
    ]


# Startup
@app.on_event("startup")
async def startup():
    await family_service.start()

@app.on_event("shutdown")
async def shutdown():
    await family_service.stop()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)