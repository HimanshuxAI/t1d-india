#!/usr/bin/env python3
"""
Database Seed Script
Seeds the database with realistic synthetic Indian T1D data.
Run with: python scripts/seed_database.py
"""

import asyncio
import json
import sys
import os
from pathlib import Path
from datetime import datetime, timedelta
from typing import List, Dict, Any
import uuid

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from apps.api.src.config import env
from apps.api.src.main import app
from apps.api.src.plugins import prisma_plugin
from apps.api.src.plugins.prisma import prismaPlugin
from prisma import Prisma
import bcrypt

async def seed_database():
    """Seed the database with synthetic Indian T1D data."""
    prisma = Prisma()
    await prisma.connect()
    
    print("🌱 Starting database seed...")
    
    # Load synthetic data
    data_dir = Path(__file__).parent.parent / 'synthetic_data'
    
    if not (data_dir / 'patients.json').exists():
        print("❌ Synthetic data not found. Run synthetic_generator.py first.")
        return
    
    with open(data_dir / 'patients.json') as f:
        patients_data = json.load(f)
    
    with open(data_dir / 'meal_logs.json') as f:
        meal_logs = json.load(f)
    
    with open(data_dir / 'insulin_logs') as f:
        insulin_logs = json.load(f)
    
    with open(data_dir / 'cgm_readings.json') as f:
        cgm_readings = json.load(f)
    
    with open(data_dir / 'hypo_events.json') as f:
        hypo_events = json.load(f)
    
    print(f"📊 Loaded: {len(patients_data)} patients, {len(meal_logs)} meals, {len(insulin_logs)} insulin logs, {len(cgm_readings)} CGM readings")
    
    # Create users and profiles
    for i, p in enumerate(patients_data):
        print(f"👤 Creating patient {i+1}/{len(patients_data)}: {p['first_name']} {p['last_name']}")
        
        # Create user
        email = p['email']
        clerk_id = f"clerk_{p['patient_id']}"
        
        # Hash password (all patients get same password for demo)
        password_hash = bcrypt.hashpw(b"demo123", bcrypt.gensalt()).decode()
        
        user = await prisma.user.upsert(
            where={'clerkId': clerk_id},
            create={
                'clerkId': clerk_id,
                'email': p['email'],
                'phoneHash': hash(p['phone']),
                'role': 'PATIENT',
                'locale': 'en-IN',
                'timezone': 'Asia/Kolkata',
            },
            update={
                'email': p['email'],
                'phoneHash': hash(p['phone']),
            }
        )
        
        # Create profile
        await prisma.patientProfile.upsert(
            where={'userId': user.id},
            create={
                'userId': user.id,
                'dateOfBirth': datetime.fromisoformat(p['date_of_birth']),
                'gender': p['gender'].upper(),
                'heightCm': p['height_cm'],
                'weightKg': p['weight_kg'],
                'diabetesType': p['diabetes_type'],
                'diagnosisDate': datetime.fromisoformat(p['diagnosis_date']),
                'hba1cLatest': p['hba1c_latest'],
                'hba1cDate': datetime.now() - timedelta(days=90),
                'insulinRegimen': p['insulin_regimen'],
                'icrGPerU': p['icr_g_per_u'],
                'isfMgDlPerU': p['isf_mg_dl_per_u'],
                'targetGlucoseMgDl': p['target_glucose_mg_dl'],
                'basalRateUPerHr': p['basal_rate_u_per_hr'],
                'nphMorningU': p['nph_morning_u'],
                'nphEveningU': p['nph_evening_u'],
                'regularBreakfastU': p['regular_breakfast_u'],
                'regularLunchU': p['regular_lunch_u'],
                'regularDinnerU': p['regular_dinner_u'],
                'cgmType': p['cgm_type'],
                'pumpType': p['pump_type'],
            },
            update={
                'heightCm': p['height_cm'],
                'weightKg': p['weight_kg'],
                'hba1cLatest': p['hba1c_latest'],
                'insulinRegimen': p['insulin_regimen'],
            }
        )
        
        # Create HbA1c history
        for hba1c in p.get('hba1c_history', []):
            # Could store in a separate table if needed
            pass
    
    # Get all user IDs for meal/insulin logs
    users = await prisma.user.findMany(where={'role': 'PATIENT'})
    user_map = {u.id: u for u in users}
    
    # Seed meal logs (sample first 5000)
    print(f"🍽️ Seeding {min(len(meal_logs), 5000)} meal logs...")
    for i, meal in enumerate(meal_logs[:5000]):
        if i % 1000 == 0:
            print(f"  🍽️ Meal {i+1}/5000")
        
        # Find user
        # In production, match by patient_id
        user_id = list(user_map.keys())[i % len(user_map)]
        
        await prisma.mealLog.create({
            data={
                'userId': user_id,
                'mealTime': datetime.fromisoformat(meal['meal_time']),
                'mealType': meal['meal_type'].upper(),
                'inputMethod': meal['input_method'],
                'items': meal['items'],
                'totalCarbsG': meal['total_carbs_g'],
                'totalProteinG': meal.get('total_protein_g'),
                'totalFatG': meal.get('total_fat_g'),
                'totalFiberG': meal.get('total_fiber_g'),
                'locationType': meal.get('location_type'),
                'hungerLevel': meal.get('hunger_level'),
                'notes': meal.get('notes'),
                'syncedAt': datetime.fromisoformat(meal['logged_at']) if meal.get('logged_at') else None,
                'clientId': meal.get('client_id'),
            }
        )
    
    # Seed insulin logs (sample first 5000)
    print(f"💉 Seeding {min(len(insulin_logs), 5000)} insulin logs...")
    for i, log in enumerate(insulin_logs[:5000]):
        if i % 1000 == 0:
            print(f"  💉 Insulin {i+1}/5000")
        
        user_id = list(user_map.keys())[i % len(user_map)]
        
        await prisma.insulinLog.create({
            data={
                'userId': user_id,
                'administeredAt': datetime.fromisoformat(log['administered_at']),
                'insulinType': log['insulin_type'],
                'doseU': log['dose_u'],
                'injectionSite': log['injection_site'],
                'relatedMealLogId': log.get('related_meal_log_id'),
                'glucoseAtInjection': log.get('glucose_at_injection'),
                'carbEstimateG': log.get('carb_estimate_g'),
                'calculatorRecommendedU': log.get('calculator_recommended_u'),
                'overrideReason': log.get('override_reason'),
                'deliveryMethod': log['delivery_method'],
                'deviceId': log.get('device_id'),
                'syncedAt': datetime.fromisoformat(log['synced_at']) if log.get('synced_at') else None,
                'clientId': log.get('client_id'),
            }
        })
    
    # Seed CGM readings (sample first 20000)
    print(f"📊 Seeding {min(len(cgm_readings), 20000)} CGM readings...")
    batch_size = 1000
    for i in range(0, min(len(cgm_readings), 20000), batch_size):
        batch = cgm_readings[i:i+batch_size]
        user_id = list(user_map.keys())[i % len(user_map)]
        
        # Batch insert
        await prisma.cGMReading.createMany({
            data=[{
                'userId': user_id,
                'time': datetime.fromisoformat(r['time']),
                'glucoseMgDl': r['glucose_mg_dl'],
                'trend': r.get('trend'),
                'trendArrow': r.get('trend_arrow'),
                'isValid': r.get('is_valid', True),
                'source': r.get('source', 'simulated'),
                'clientId': r.get('client_id'),
            } for r in batch]
        })
        
        if i % 5000 == 0:
            print(f"  📊 CGM {i+1}/20000")
    
    print("✅ Database seeding complete!")
    
    # Print summary
    patient_count = await prisma.user.count(where={'role': 'PATIENT'})
    meal_count = await prisma.mealLog.count()
    insulin_count = await prisma.insulinLog.count()
    cgm_count = await prisma.cGMReading.count()
    
    print(f"""
    ✅ Seeding Complete!
    👥 Patients: {patient_count}
    🍽️ Meal Logs: {meal_count}
    💉 Insulin Logs: {insulin_count}
    📊 CGM Readings: {cgm_count}
    """)
    
    await prisma.disconnect()


async def create_demo_users():
    """Create demo accounts for testing."""
    prisma = Prisma()
    await prisma.connect()
    
    demo_users = [
        {
            'email': 'patient@demo.com',
            'password': 'demo123',
            'name': 'Demo Patient',
            'role': 'PATIENT',
        },
        {
            'email': 'caregiver@demo.com',
            'password': 'demo123',
            'name': 'Demo Caregiver',
            'role': 'CAREGIVER',
        },
        {
            'email': 'clinician@demo.com',
            'password': 'demo123',
            'name': 'Dr. Demo',
            'role': 'CLINICIAN',
        },
    ]
    
    for u in demo_users:
        password_hash = bcrypt.hashpw(u['password'].encode(), bcrypt.gensalt()).decode()
        
        user = await prisma.user.upsert(
            where={'email': u['email']},
            create={
                'email': u['email'],
                'clerkId': f"clerk_{u['email']}",
                'phoneHash': hash(u['email']),
                'role': u['role'],
                'locale': 'en-IN',
                'timezone': 'Asia/Kolkata',
            },
            update={}
        )
        
        if u['role'] == 'PATIENT':
            await prisma.patientProfile.upsert(
                where={'userId': user.id},
                create={
                    'userId': user.id,
                    'dateOfBirth': datetime(1995, 5, 15),
                    'gender': 'MALE',
                    'heightCm': 170,
                    'weightKg': 65,
                    'diabetesType': 'T1D',
                    'diagnosisDate': datetime(2015, 3, 10),
                    'hba1cLatest': 7.8,
                    'insulinRegimen': 'NPH_REGULAR',
                    'icrGPerU': 10,
                    'isfMgDlPerU': 50,
                    'targetGlucoseMgDl': 110,
                    'nphMorningU': 16,
                    'nphEveningU': 12,
                    'regularBreakfastU': 6,
                    'regularLunchU': 4,
                    'regularDinnerU': 6,
                    'cgmType': 'DEXCOM_G6',
                    'targetGlucoseMgDl': 110,
                    'hypoThresholdMgDl': 70,
                    'severeHypoThresholdMgDl': 54,
                },
                update={}
            )
        
        print(f"✅ Created demo user: {u['email']} / {u['password']}")
    
    await prisma.disconnect()


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description='Seed database with synthetic T1D data')
    parser.add_argument('--demo-only', action='store_true', help='Create only demo users')
    parser.add_argument('--full', action='store_true', help='Full seed with synthetic data')
    args = parser.parse_args()
    
    if args.demo_only:
        asyncio.run(create_demo_users())
    elif args.full:
        asyncio.run(seed_database())
    else:
        # Default: create demo users
        asyncio.run(create_demo_users())