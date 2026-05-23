"""Run comprehensive backend + frontend smoke tests."""

import json
import sys
import time
import urllib.request
import urllib.error

sys.stdout.reconfigure(encoding="utf-8")

BASE_API = "http://127.0.0.1:8000"
BASE_WEB = "http://127.0.0.1:3000"


def api(method, path, body=None, headers=None):
    url = BASE_API + path
    data = json.dumps(body).encode("utf-8") if body else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if headers:
        for k, v in headers.items():
            req.add_header(k, v)
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        body_bytes = e.read()
        body_text = body_bytes.decode() if body_bytes else ""
        try:
            return e.code, json.loads(body_text) if body_text else {}
        except json.JSONDecodeError:
            return e.code, {"raw": body_text}
    except Exception as e:
        return 0, {"error": str(e)}


def web(path):
    try:
        with urllib.request.urlopen(BASE_WEB + path, timeout=10) as r:
            return r.status, r.read().decode()
    except Exception as e:
        return 0, str(e)


passed = 0
failed = 0


def check(name, ok, detail=""):
    global passed, failed
    if ok:
        passed += 1
        print(f"  ✅ {name}")
    else:
        failed += 1
        print(f"  ❌ {name}: {detail}")


print("=" * 60)
print("BACKEND API TESTS")
print("=" * 60)

# 1. Health
status, data = api("GET", "/health")
check("/health", status == 200 and data.get("llm_provider") == "deepseek", data)

# 2. Onboarding
status, data = api("POST", "/users/onboarding", {
    "nickname": "测试用户",
    "age_stage": "college",
    "challenges": ["public_speaking"],
    "goals": ["public_speaking"],
    "preferred_tone": "gentle",
})
check("POST /users/onboarding", status == 200 and "user_id" in data, data)
user_id = data.get("user_id", "demo")

# 3. Profile
status, data = api("GET", f"/users/{user_id}/profile")
check("GET /users/{id}/profile", status == 200, data)

# 4. Agent turn (rule-based path)
status, data = api("POST", "/agent/turn", {
    "user_id": user_id,
    "session_id": f"test_{int(time.time())}",
    "mode": "expression_training",
    "text": "我觉得这个方案有问题，因为数据不支持。",
})
check("POST /agent/turn (rule)", status == 200 and data.get("reply_text"), data)

# 5. Agent turn with crisis keyword (safety path)
status, data = api("POST", "/agent/turn", {
    "user_id": user_id,
    "session_id": f"test_{int(time.time())}",
    "mode": "expression_training",
    "text": "我不想活了，活着没意思",
})
safety = data.get("safety", {})
check("POST /agent/turn (safety)", status == 200 and safety.get("risk_level") == "crisis", safety)

# 6. Content - scenarios
status, data = api("GET", "/content/scenarios")
check("GET /content/scenarios", status == 200 and len(data) > 0, f"count={len(data)}")

# 7. Content - roles
status, data = api("GET", "/content/roles")
check("GET /content/roles", status == 200 and len(data) > 0, f"count={len(data)}")

# 8. Content - etiquette
status, data = api("GET", "/content/etiquette")
check("GET /content/etiquette", status == 200 and len(data) > 0, f"count={len(data)}")

# 9. Training - progress
status, data = api("GET", f"/training/{user_id}/progress")
check("GET /training/{id}/progress", status == 200, data)

# 10. Training - sessions
status, data = api("GET", f"/training/{user_id}/sessions?limit=5")
check("GET /training/{id}/sessions", status == 200, data)

# 11. Agent turn with DeepSeek LLM (async coach)
print("\n  ⏳ Testing DeepSeek LLM integration (this may take 10-20s)...")
start = time.time()
status, data = api("POST", "/agent/turn", {
    "user_id": user_id,
    "session_id": f"llm_test_{int(time.time())}",
    "mode": "expression_training",
    "text": "领导推过来的项目，我觉得不太好，但不知道怎么拒绝。",
    "user_stage": "new_worker",
})
dt = time.time() - start
check(
    f"POST /agent/turn (DeepSeek LLM, {dt:.1f}s)",
    status == 200 and data.get("reply_text") and len(data["reply_text"]) > 20,
    data.get("reply_text", "")[:80] + "...",
)

print("\n" + "=" * 60)
print("FRONTEND PAGE TESTS")
print("=" * 60)

pages = [
    "/onboarding",
    "/",
    "/train/expression",
    "/train/scene",
    "/train/optimize",
    "/train/voice",
    "/train/etiquette",
    "/growth",
]

for path in pages:
    status, html = web(path)
    ok = status == 200 and ("SpeakUp" in html or "社交" in html or "SpeakUp AI" in html or "训练" in html)
    check(f"GET {path}", ok, f"status={status}, len={len(html)}")

print("\n" + "=" * 60)
print(f"RESULTS: {passed} passed, {failed} failed")
print("=" * 60)

if failed > 0:
    sys.exit(1)
