#!/usr/bin/env python3
"""Convert a guest CSV (e.g. the Bachelorette attendee list, or a Zola-style
wedding export) into a privacy-minimized D1 SQL seed file.

Usage:
  python scripts/build_guest_seed.py /path/to/attendees.csv --output seed-guests.sql

Expected columns: First Name, Last Name (and optionally Partner First/Last Name
for household grouping). The generated SQL contains only camera-login fields.
Contact/address columns are ignored.
The output file is always UTF-8 so it can be imported reliably from PowerShell/Windows.
D1's remote SQL importer manages atomic execution itself, so explicit BEGIN/COMMIT statements
are intentionally omitted.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import re
from pathlib import Path


def sql(value: str | None) -> str:
    if value is None:
        return "NULL"
    return "'" + value.replace("'", "''") + "'"


def norm(value: str) -> str:
    folded = value.strip().lower()
    return re.sub(r"[^a-z0-9'-]", "", folded)


def stable_id(prefix: str, *parts: str) -> str:
    raw = "|".join(parts).encode("utf-8")
    digest = hashlib.sha256(raw).hexdigest()[:20]
    return f"{prefix}_{digest}"


def named_people(row: dict[str, str]):
    people = []
    primary_first = (row.get("First Name") or "").strip()
    primary_last = (row.get("Last Name") or "").strip()
    if primary_first and primary_last:
        people.append((primary_first, primary_last, "adult", "primary"))

    partner_first = (row.get("Partner First Name") or "").strip()
    partner_last = (row.get("Partner Last Name") or primary_last).strip()
    if partner_first and partner_first.lower() != "guest" and partner_last:
        people.append((partner_first, partner_last, "adult", "partner"))

    for index in range(1, 6):
        first = (row.get(f"Child {index} First Name") or "").strip()
        last = (row.get(f"Child {index} Last Name") or primary_last).strip()
        if first and first.lower() != "guest" and last:
            people.append((first, last, "child", f"child{index}"))

    return people


def count_unnamed_slots(row: dict[str, str], named_count: int) -> int:
    try:
        total = int(float((row.get("Total Definitely Invited") or "0").strip() or 0))
    except ValueError:
        total = 0
    return max(0, total - named_count)


def build_sql(rows: list[dict[str, str]]) -> tuple[str, int, int]:
    lines = ["PRAGMA foreign_keys = ON;"]
    guest_count = 0
    unnamed_count = 0

    for index, row in enumerate(rows, start=1):
        people = named_people(row)
        household_id = stable_id("hh", str(index), row.get("First Name") or "", row.get("Last Name") or "")
        unnamed = count_unnamed_slots(row, len(people))
        unnamed_count += unnamed
        relation = (row.get("Relationship To Couple") or "").strip() or None
        lines.append(
            "INSERT OR REPLACE INTO households (id, source_row, relationship_to_couple, unnamed_guest_slots) VALUES "
            f"({sql(household_id)}, {index}, {sql(relation)}, {unnamed});"
        )

        for first, last, guest_type, slot in people:
            guest_id = stable_id("guest", household_id, slot, first, last)
            lines.append(
                "INSERT OR REPLACE INTO guests (id, household_id, first_name, last_name, normalized_last_name, guest_type, active) VALUES "
                f"({sql(guest_id)}, {sql(household_id)}, {sql(first)}, {sql(last)}, {sql(norm(last))}, {sql(guest_type)}, 1);"
            )
            guest_count += 1

    return "\n".join(lines) + "\n", guest_count, unnamed_count


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("csv_path", type=Path)
    parser.add_argument("--output", "-o", type=Path, required=True)
    args = parser.parse_args()

    with args.csv_path.open("r", encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))

    sql_text, guest_count, unnamed_count = build_sql(rows)
    args.output.write_text(sql_text, encoding="utf-8", newline="\n")
    print(f"Wrote {args.output} as UTF-8")
    print(f"{len(rows)} households, {guest_count} named guests, {unnamed_count} unnamed guest slots")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
