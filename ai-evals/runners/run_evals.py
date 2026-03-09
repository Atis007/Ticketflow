#!/usr/bin/env python3
"""
AI evaluation runner for Ticketflow.
Reads test cases, calls the AI service, compares output, reports results.

Usage:
    python run_evals.py [--service-url URL] [--db-url URL] [--suite layout|chat|all]
"""

import argparse
import json
import os
import sys
import time
import uuid
from pathlib import Path
from typing import Any

import httpx

SERVICE_URL = os.getenv("AI_SERVICE_URL", "http://localhost:8100")
DB_URL = os.getenv("DATABASE_URL", "")
TEST_CASES_DIR = Path(__file__).parent.parent / "test_cases"


def load_test_cases(suite: str) -> list[dict[str, Any]]:
    cases = []
    files = {
        "layout": "layout_generation.json",
        "chat": "chat_tools.json",
    }

    if suite == "all":
        target_files = list(files.values())
    elif suite in files:
        target_files = [files[suite]]
    else:
        print(f"Unknown suite: {suite}")
        sys.exit(1)

    for fname in target_files:
        path = TEST_CASES_DIR / fname
        if path.exists():
            with open(path) as f:
                loaded = json.load(f)
                for tc in loaded:
                    tc["_suite"] = fname.replace(".json", "")
                cases.extend(loaded)

    return cases


def run_layout_eval(tc: dict[str, Any], client: httpx.Client) -> dict[str, Any]:
    start = time.monotonic()
    try:
        resp = client.post("/api/layout/generate", json=tc["input"], timeout=120.0)
        duration_ms = int((time.monotonic() - start) * 1000)

        if resp.status_code != 200:
            return {
                "passed": False,
                "score": 0.0,
                "error": f"HTTP {resp.status_code}: {resp.text[:200]}",
                "duration_ms": duration_ms,
            }

        data = resp.json()
        layout = data.get("layout", {})
        assertions = tc.get("assertions", {})
        errors = []

        # Check required fields
        for field in assertions.get("required_fields", []):
            if field not in layout:
                errors.append(f"Missing field: {field}")

        sections = layout.get("sections", [])
        min_s = assertions.get("min_sections", 1)
        max_s = assertions.get("max_sections", 50)
        if len(sections) < min_s:
            errors.append(f"Too few sections: {len(sections)} < {min_s}")
        if len(sections) > max_s:
            errors.append(f"Too many sections: {len(sections)} > {max_s}")

        # Capacity check
        total_seats = sum(
            r.get("seat_count", 0)
            for s in sections
            for r in s.get("rows", [])
        )
        target = tc["input"].get("total_capacity", 0)
        tolerance = assertions.get("capacity_tolerance_pct", 20) / 100.0
        if target > 0:
            diff = abs(total_seats - target) / target
            if diff > tolerance:
                errors.append(
                    f"Capacity mismatch: got {total_seats}, expected ~{target} (±{int(tolerance*100)}%)"
                )

        # Duplicate row labels check
        if assertions.get("no_duplicate_row_labels"):
            for s in sections:
                labels = [r.get("label") for r in s.get("rows", [])]
                dupes = [l for l in labels if labels.count(l) > 1]
                if dupes:
                    errors.append(f"Duplicate rows in '{s.get('name')}': {set(dupes)}")

        # Rows exist check
        if assertions.get("section_has_rows"):
            for s in sections:
                if not s.get("rows"):
                    errors.append(f"Section '{s.get('name')}' has no rows")

        passed = len(errors) == 0
        score = 1.0 - (len(errors) / max(1, len(assertions)))

        return {
            "passed": passed,
            "score": max(0.0, score),
            "errors": errors if errors else None,
            "duration_ms": duration_ms,
            "total_seats": total_seats,
            "sections": len(sections),
        }

    except Exception as e:
        duration_ms = int((time.monotonic() - start) * 1000)
        return {
            "passed": False,
            "score": 0.0,
            "error": str(e),
            "duration_ms": duration_ms,
        }


def run_chat_eval(tc: dict[str, Any], client: httpx.Client) -> dict[str, Any]:
    start = time.monotonic()
    try:
        resp = client.post("/api/chat", json=tc["input"], timeout=120.0)
        duration_ms = int((time.monotonic() - start) * 1000)

        if resp.status_code != 200:
            return {
                "passed": False,
                "score": 0.0,
                "error": f"HTTP {resp.status_code}: {resp.text[:200]}",
                "duration_ms": duration_ms,
            }

        data = resp.json()
        assertions = tc.get("assertions", {})
        errors = []

        # Check response not empty
        if assertions.get("response_not_empty"):
            response_text = data.get("response", "")
            tool_calls = data.get("tool_calls", [])
            if not response_text and not tool_calls:
                errors.append("Response is empty and no tool calls made")

        # Check expected tool
        expected_tool = assertions.get("expected_tool")
        tool_calls = data.get("tool_calls", [])
        tool_names = [tc.get("name", "") for tc in tool_calls]

        if expected_tool is not None:
            if expected_tool not in tool_names:
                errors.append(f"Expected tool '{expected_tool}' not called. Got: {tool_names}")
        elif expected_tool is None and assertions.get("expected_tool") is None:
            # No tool expected — that's fine regardless
            pass

        passed = len(errors) == 0
        score = 1.0 if passed else 0.0

        return {
            "passed": passed,
            "score": score,
            "errors": errors if errors else None,
            "duration_ms": duration_ms,
            "tool_calls": tool_names,
        }

    except Exception as e:
        duration_ms = int((time.monotonic() - start) * 1000)
        return {
            "passed": False,
            "score": 0.0,
            "error": str(e),
            "duration_ms": duration_ms,
        }


def save_to_db(run_id: str, tc_id: str, model: str, tc_input: Any, result: dict) -> None:
    """Optionally save eval results to database (requires psycopg2)."""
    if not DB_URL:
        return
    try:
        import psycopg2
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()
        cur.execute(
            """INSERT INTO ai_eval_runs
               (run_id, test_case_id, eval_name, model_name, input_payload, output_payload, passed, score, duration_ms)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (
                run_id,
                tc_id,
                tc_id,
                model,
                json.dumps(tc_input),
                json.dumps(result),
                result.get("passed", False),
                result.get("score", 0.0) * 100,
                result.get("duration_ms", 0),
            ),
        )
        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        print(f"  [warn] DB save failed: {e}")


def main() -> None:
    global DB_URL

    parser = argparse.ArgumentParser(description="Ticketflow AI Eval Runner")
    parser.add_argument("--service-url", default=SERVICE_URL)
    parser.add_argument("--db-url", default=DB_URL)
    parser.add_argument("--suite", default="all", choices=["layout", "chat", "all"])
    args = parser.parse_args()

    DB_URL = args.db_url

    client = httpx.Client(base_url=args.service_url)
    cases = load_test_cases(args.suite)

    if not cases:
        print("No test cases found.")
        sys.exit(1)

    run_id = str(uuid.uuid4())
    print(f"Run ID: {run_id}")
    print(f"Suite: {args.suite}")
    print(f"Test cases: {len(cases)}")
    print(f"Service: {args.service_url}")
    print("-" * 60)

    passed = 0
    failed = 0
    total_duration = 0

    for tc in cases:
        tc_id = tc.get("id", "unknown")
        suite = tc.get("_suite", "unknown")
        name = tc.get("name", tc_id)

        print(f"\n[{suite}] {tc_id}: {name}")

        if suite == "layout_generation":
            result = run_layout_eval(tc, client)
        elif suite == "chat_tools":
            result = run_chat_eval(tc, client)
        else:
            print(f"  SKIP (unknown suite)")
            continue

        status = "PASS" if result["passed"] else "FAIL"
        duration = result.get("duration_ms", 0)
        total_duration += duration

        print(f"  {status} (score: {result.get('score', 0):.2f}, {duration}ms)")
        if result.get("errors"):
            for err in result["errors"]:
                print(f"    - {err}")
        if result.get("error"):
            print(f"    ERROR: {result['error']}")

        if result["passed"]:
            passed += 1
        else:
            failed += 1

        save_to_db(run_id, tc_id, "ollama", tc.get("input"), result)

    print("\n" + "=" * 60)
    print(f"Results: {passed} passed, {failed} failed, {passed + failed} total")
    print(f"Total duration: {total_duration}ms")
    print(f"Pass rate: {passed / max(1, passed + failed) * 100:.1f}%")

    sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    main()
