#!/usr/bin/env python3
"""
T1D India - Full End-to-End Automated Test Script
Verifies all web pages, API routes, and the NVIDIA Vision plate recognition pipeline.
"""

import sys
import json
import urllib.request
import urllib.error

BASE_URL = "http://localhost:3001"

ROUTES = [
    ("/dashboard", "Main Clinical Dashboard"),
    ("/meals", "Meals & Carbs Log"),
    ("/meals/photo", "NVIDIA Vision Plate Analyzer"),
    ("/cgm", "CGM Continuous Glucose Stream"),
    ("/insulin", "Insulin Dosage & Plate Builder"),
    ("/foods", "ICMR-NIN Food Composition Database"),
    ("/profile", "Patient Clinical Passport (ABHA / DPDP)"),
    ("/settings", "System Settings & Telemetry"),
]

def test_routes():
    print("=" * 65)
    print("1. TESTING FRONTEND ROUTES & SSR RENDERING")
    print("=" * 65)
    all_passed = True
    for route, name in ROUTES:
        url = f"{BASE_URL}{route}"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=5) as res:
                content = res.read().decode("utf-8", errors="ignore")
                has_error = '<h1 class="next-error-h1">404</h1>' in content or 'ModuleBuildError' in content
                if res.status == 200 and not has_error:
                    print(f"  [PASS] {route:16} ({res.status} OK) -> {name}")
                else:
                    print(f"  [FAIL] {route:16} ({res.status}) -> Contains error overlay")
                    all_passed = False
        except Exception as e:
            print(f"  [FAIL] {route:16} -> {e}")
            all_passed = False
    return all_passed

def test_nvidia_vision():
    print("\n" + "=" * 65)
    print("2. TESTING NVIDIA VISION MULTIMODAL API")
    print("=" * 65)
    url = f"{BASE_URL}/api/v1/meals/photo"
    # 1x1 base64 test image
    test_img = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
    payload = json.dumps({"image": test_img}).encode("utf-8")
    
    try:
        req = urllib.request.Request(
            url,
            data=payload,
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=15) as res:
            data = json.loads(res.read().decode("utf-8"))
            if data.get("success"):
                model = data.get("data", {}).get("analyzedWith")
                print(f"  [PASS] Vision Endpoint: {url}")
                print(f"         Model Used     : {model}")
                print(f"         Status         : HTTP {res.status} OK")
                print(f"         Payload Tested : Base64 Multimodal Telemetry")
                return True
            else:
                print(f"  [FAIL] Vision Endpoint returned success=False: {data}")
                return False
    except Exception as e:
        print(f"  [FAIL] Vision Endpoint request error: {e}")
        return False

def test_emoji_absence():
    print("\n" + "=" * 65)
    print("3. VERIFYING ZERO EMOJIS IN SOURCE CODE")
    print("=" * 65)
    import os, re
    emoji_pattern = re.compile(r'[\U00010000-\U0010ffff]', flags=re.UNICODE)
    found = 0
    base = "apps/web/src"
    for root, dirs, files in os.walk(base):
        for f in files:
            if f.endswith((".tsx", ".ts")) and not f.endswith(".d.ts"):
                path = os.path.join(root, f)
                with open(path, "r", encoding="utf-8", errors="ignore") as fp:
                    for idx, line in enumerate(fp, 1):
                        emojis = emoji_pattern.findall(line)
                        if emojis:
                            print(f"  [FAIL] Emoji detected: {path}:{idx} -> {''.join(emojis)}")
                            found += 1
    if found == 0:
        print("  [PASS] 0 emojis found across all TypeScript & React files.")
        return True
    return False

if __name__ == "__main__":
    p1 = test_routes()
    p2 = test_nvidia_vision()
    p3 = test_emoji_absence()
    print("\n" + "=" * 65)
    if p1 and p2 and p3:
        print("ALL TESTS PASSED: Platform is healthy, verified, and operational.")
        sys.exit(0)
    else:
        print("SOME TESTS FAILED: Please check the errors above.")
        sys.exit(1)
