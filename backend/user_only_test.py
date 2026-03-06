import json
import time
import urllib.request
import urllib.error
import os
from statistics import mean

BASE = "http://127.0.0.1:8099"

cat_id = int(os.environ.get("CAT_ID", "1"))
sub_id = int(os.environ.get("SUB_ID", "1"))
sub_slug = os.environ.get("SUB_SLUG", "theatre")
existing_event_slug = os.environ.get("EVENT_SLUG", "logging-test-paid-event")


def req(path, method="GET", token=None, body=None, headers=None):
    hdrs = {"Content-Type": "application/json"}
    if token:
        hdrs["Authorization"] = f"Bearer {token}"
    if headers:
        hdrs.update(headers)
    data = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")
    request = urllib.request.Request(BASE + path, data=data, method=method, headers=hdrs)
    start = time.perf_counter()
    try:
        with urllib.request.urlopen(request, timeout=20) as resp:
            raw = resp.read().decode("utf-8")
            elapsed = (time.perf_counter() - start) * 1000
            return resp.status, raw, elapsed
    except urllib.error.HTTPError as err:
        raw = err.read().decode("utf-8")
        elapsed = (time.perf_counter() - start) * 1000
        return err.code, raw, elapsed


report = {"checks": [], "timings": {}}

# guest checks
guest_checks = [
    ("guest_categories", "/api/categories", 200),
    ("guest_events_list", "/api/events?page=1&pageSize=20", 200),
    ("guest_events_subcategory", f"/api/events/{sub_slug}", 200),
    ("guest_event_detail_slug", f"/api/events/{sub_slug}/{existing_event_slug}", 200),
    ("guest_event_detail_invalid_id", "/api/events/0", 400),
    ("guest_event_detail_missing", "/api/events/999999", 404),
]

for name, path, expected in guest_checks:
    status, raw, ms = req(path)
    report["checks"].append({
        "name": name,
        "status": status,
        "ok": status == expected,
        "ms": round(ms, 2),
        "body_snippet": raw[:120],
    })

# invalid month format
status, raw, ms = req("/api/events?month=2026-13")
report["checks"].append({
    "name": "events_invalid_month",
    "status": status,
    "ok": status == 400,
    "ms": round(ms, 2),
    "body_snippet": raw[:120],
})

# register edge cases
bad_regs = [
    ("missing_fields", {"email": "", "password": "", "passwordConfirmation": "", "fullname": ""}, 400),
    ("invalid_email", {"email": "not-an-email", "password": "Test1234!", "passwordConfirmation": "Test1234!", "fullname": "Test User"}, 400),
    ("short_name", {"email": "a@b.com", "password": "Test1234!", "passwordConfirmation": "Test1234!", "fullname": "A B"}, 400),
    ("password_mismatch", {"email": "a2@b.com", "password": "Test1234!", "passwordConfirmation": "Test1234?", "fullname": "Test User"}, 400),
    ("password_no_upper", {"email": "a3@b.com", "password": "test1234!", "passwordConfirmation": "test1234!", "fullname": "Test User"}, 400),
    ("password_no_lower", {"email": "a4@b.com", "password": "TEST1234!", "passwordConfirmation": "TEST1234!", "fullname": "Test User"}, 400),
    ("password_no_digit", {"email": "a5@b.com", "password": "TestTest!", "passwordConfirmation": "TestTest!", "fullname": "Test User"}, 400),
    ("password_no_special", {"email": "a6@b.com", "password": "Test1234", "passwordConfirmation": "Test1234", "fullname": "Test User"}, 400),
]

for name, payload, expected in bad_regs:
    status, raw, ms = req("/api/auth/user/register", method="POST", body=payload)
    report["checks"].append({
        "name": f"register_{name}",
        "status": status,
        "ok": status == expected,
        "ms": round(ms, 2),
        "body_snippet": raw[:120],
    })

# valid register/login
email = f"useronly_{int(time.time())}@example.com"
reg_payload = {
    "email": email,
    "password": "Test1234!",
    "passwordConfirmation": "Test1234!",
    "fullname": "User Only",
}
status, raw, ms = req("/api/auth/user/register", method="POST", body=reg_payload)
report["checks"].append({
    "name": "register_valid",
    "status": status,
    "ok": status == 201,
    "ms": round(ms, 2),
    "body_snippet": raw[:120],
})

status, raw, ms = req("/api/auth/user/login", method="POST", body={"email": email, "password": "WrongPass1!"})
report["checks"].append({
    "name": "login_wrong_pass",
    "status": status,
    "ok": status == 401,
    "ms": round(ms, 2),
    "body_snippet": raw[:120],
})

status, raw, ms = req("/api/auth/user/login", method="POST", body={"email": email, "password": "Test1234!"})
user_token = ""
try:
    user_token = json.loads(raw).get("data", {}).get("token", "")
except Exception:
    user_token = ""
report["checks"].append({
    "name": "login_valid",
    "status": status,
    "ok": status == 200 and bool(user_token),
    "ms": round(ms, 2),
    "body_snippet": raw[:120],
})

# auth me
if user_token:
    status, raw, ms = req("/api/auth/me", token=user_token)
    report["checks"].append({
        "name": "auth_me",
        "status": status,
        "ok": status == 200,
        "ms": round(ms, 2),
        "body_snippet": raw[:120],
    })

# verify email confirm missing token
status, raw, ms = req("/api/auth/verify-email/confirm", method="POST", body={})
report["checks"].append({
    "name": "verify_confirm_missing",
    "status": status,
    "ok": status == 400,
    "ms": round(ms, 2),
    "body_snippet": raw[:120],
})

# send verification (may be rate-limited)
if user_token:
    status, raw, ms = req("/api/auth/verify-email/send", method="POST", token=user_token, body={})
    report["checks"].append({
        "name": "verify_send",
        "status": status,
        "ok": status in (200, 400),
        "ms": round(ms, 2),
        "body_snippet": raw[:120],
    })

# profile endpoints (expect 403 unverified)
if user_token:
    status, raw, ms = req("/api/profile/purchases", token=user_token)
    report["checks"].append({
        "name": "profile_purchases_unverified",
        "status": status,
        "ok": status == 403,
        "ms": round(ms, 2),
        "body_snippet": raw[:120],
    })
    status, raw, ms = req("/api/profile/favorites", token=user_token)
    report["checks"].append({
        "name": "profile_favorites_unverified",
        "status": status,
        "ok": status == 403,
        "ms": round(ms, 2),
        "body_snippet": raw[:120],
    })

# event creation edge cases
if user_token:
    status, raw, ms = req("/api/events", method="POST", token=user_token, body={"title": "", "categoryId": cat_id, "subcategoryId": sub_id, "startsAt": "2026-03-05T18:00:00+01:00", "isFree": False, "price": 1000})
    report["checks"].append({
        "name": "event_missing_title",
        "status": status,
        "ok": status == 400,
        "ms": round(ms, 2),
        "body_snippet": raw[:120],
    })

    status, raw, ms = req("/api/events", method="POST", token=user_token, body={"title": "Bad Price", "categoryId": cat_id, "subcategoryId": sub_id, "startsAt": "2026-03-05T18:00:00+01:00", "isFree": False, "price": 0})
    report["checks"].append({
        "name": "event_invalid_price",
        "status": status,
        "ok": status == 400,
        "ms": round(ms, 2),
        "body_snippet": raw[:120],
    })

    status, raw, ms = req("/api/events", method="POST", token=user_token, body={"title": "Free With Price", "categoryId": cat_id, "subcategoryId": sub_id, "startsAt": "2026-03-05T18:00:00+01:00", "isFree": True, "price": 1000})
    report["checks"].append({
        "name": "event_free_with_price",
        "status": status,
        "ok": status == 400,
        "ms": round(ms, 2),
        "body_snippet": raw[:120],
    })

    status, raw, ms = req("/api/events", method="POST", token=user_token, body={"title": "Bad Dates", "categoryId": cat_id, "subcategoryId": sub_id, "startsAt": "2026-03-05T18:00:00+01:00", "endsAt": "2026-03-05T10:00:00+01:00", "isFree": False, "price": 1000})
    report["checks"].append({
        "name": "event_bad_dates",
        "status": status,
        "ok": status == 400,
        "ms": round(ms, 2),
        "body_snippet": raw[:120],
    })

    status, raw, ms = req("/api/events", method="POST", token=user_token, body={"title": "Bad Capacity", "categoryId": cat_id, "subcategoryId": sub_id, "startsAt": "2026-03-05T18:00:00+01:00", "isFree": False, "price": 1000, "capacity": 0})
    report["checks"].append({
        "name": "event_bad_capacity",
        "status": status,
        "ok": status == 400,
        "ms": round(ms, 2),
        "body_snippet": raw[:120],
    })

    # valid event
    slug = f"user-event-{int(time.time())}"
    status, raw, ms = req("/api/events", method="POST", token=user_token, body={
        "title": "User Event",
        "slug": slug,
        "categoryId": cat_id,
        "subcategoryId": sub_id,
        "startsAt": "2026-03-05T18:00:00+01:00",
        "endsAt": "2026-03-05T20:00:00+01:00",
        "isFree": False,
        "price": 1000,
        "city": "Belgrade",
        "venue": "User Hall",
        "capacity": 100,
        "isSeated": False,
        "isActive": True,
    })
    event_id = None
    try:
        event_id = json.loads(raw).get("data", {}).get("id")
    except Exception:
        event_id = None
    report["checks"].append({
        "name": "event_create_valid",
        "status": status,
        "ok": status == 201 and bool(event_id),
        "ms": round(ms, 2),
        "body_snippet": raw[:120],
    })

    # duplicate slug in same subcategory -> 409
    if event_id:
        status, raw, ms = req("/api/events", method="POST", token=user_token, body={
            "title": "Dup Slug",
            "slug": slug,
            "categoryId": cat_id,
            "subcategoryId": sub_id,
            "startsAt": "2026-03-06T18:00:00+01:00",
            "isFree": False,
            "price": 1000,
        })
        report["checks"].append({
            "name": "event_duplicate_slug",
            "status": status,
            "ok": status == 409,
            "ms": round(ms, 2),
            "body_snippet": raw[:120],
        })

        # update event invalid price
        status, raw, ms = req(f"/api/events/{event_id}", method="PATCH", token=user_token, body={"price": 0, "isFree": False})
        report["checks"].append({
            "name": "event_update_invalid_price",
            "status": status,
            "ok": status == 400,
            "ms": round(ms, 2),
            "body_snippet": raw[:120],
        })

        # update event valid
        status, raw, ms = req(f"/api/events/{event_id}", method="PATCH", token=user_token, body={"venue": "Updated Venue"})
        report["checks"].append({
            "name": "event_update_valid",
            "status": status,
            "ok": status == 200,
            "ms": round(ms, 2),
            "body_snippet": raw[:120],
        })

# purchase edge cases
if user_token:
    status, raw, ms = req("/api/purchases/simulate", method="POST", token=user_token, body={"eventId": 0, "quantity": 1, "simulateOutcome": "success", "currency": "RSD"})
    report["checks"].append({
        "name": "purchase_invalid_event",
        "status": status,
        "ok": status in (400, 404),
        "ms": round(ms, 2),
        "body_snippet": raw[:120],
    })

    status, raw, ms = req("/api/purchases/simulate", method="POST", token=user_token, body={"eventId": 1, "quantity": 0, "simulateOutcome": "success", "currency": "RSD"})
    report["checks"].append({
        "name": "purchase_invalid_quantity",
        "status": status,
        "ok": status == 400,
        "ms": round(ms, 2),
        "body_snippet": raw[:120],
    })

    status, raw, ms = req("/api/purchases/simulate", method="POST", token=user_token, body={"eventId": 1, "quantity": 1, "simulateOutcome": "unknown", "currency": "RSD"})
    report["checks"].append({
        "name": "purchase_invalid_outcome",
        "status": status,
        "ok": status == 400,
        "ms": round(ms, 2),
        "body_snippet": raw[:120],
    })

# logout invalid token
status, raw, ms = req("/api/auth/logout", method="POST", token="invalid")
report["checks"].append({
    "name": "logout_invalid_token",
    "status": status,
    "ok": status == 401,
    "ms": round(ms, 2),
    "body_snippet": raw[:120],
})

# timings for user-visible endpoints
timing_targets = [
    ("timing_home_categories", "/api/categories"),
    ("timing_events_list", "/api/events?page=1&pageSize=20"),
    ("timing_events_subcategory", f"/api/events/{sub_slug}"),
    ("timing_event_detail", f"/api/events/{sub_slug}/{existing_event_slug}"),
    ("timing_profile_purchases", "/api/profile/purchases"),
]

for name, path in timing_targets:
    samples = []
    statuses = []
    for _ in range(3):
        s, raw, ms = req(path, token=user_token if "profile" in name else None)
        samples.append(ms)
        statuses.append(s)
    report["timings"][name] = {
        "status": statuses,
        "avg_ms": round(mean(samples), 2),
        "max_ms": round(max(samples), 2),
    }

print(json.dumps(report))
