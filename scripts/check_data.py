#!/usr/bin/env python3
"""Check that the data built into index.html matches the workbook.

The page holds a snapshot of the workbook's data (window.GGAF in index.html). After the
workbook changes, the page has to be rebuilt; run this to confirm the two still agree.

Usage:
    python3 scripts/check_data.py [index.html] [data/workbook.xlsx]

Needs: openpyxl (pip install openpyxl). Compares every series that maps directly to a
workbook row (country characteristics and the ratios the workbook already holds), and
reports values that differ and years that are in the workbook but missing on the page.
Ratios the page calculates itself (e.g. queue / installed capacity) are not checked here.
"""
import glob
import json
import sys

try:
    import openpyxl
except ImportError:
    sys.exit("Needs openpyxl: pip install openpyxl")

# Page metric -> (workbook tab, workbook row label, workbook stores a fraction to show as %)
CHECKS = [
    ("ch_grid", "1", "Total line length", False),
    ("ch_stor", "2", "Total storage capacity", False),
    ("ch_res", "3", "RES-E share", False),
    ("ch_acc", "4", "Access (total)", False),
    ("ch_cons", "7", "Consumption per capita, kWh", False),
    ("f_curt", "10", "Share of total generation (%)", True),
    ("c_cost", "15", "Cost per MWh of demand", False),
    ("r_inc", "13", "Incidents (count)", False),
]


def num(x):
    if isinstance(x, (int, float)):
        return float(x)
    try:
        return float(str(x).replace(",", "").replace("%", ""))
    except (TypeError, ValueError):
        return None


def load_page(path):
    s = open(path, encoding="utf-8").read()
    i = s.find("window.GGAF=")
    if i < 0:
        sys.exit(f"No window.GGAF data block found in {path}")
    data, _ = json.JSONDecoder().raw_decode(s[i + len("window.GGAF="):])
    return data["D"]


def workbook_row(wb, tab, country, label, pct):
    if tab not in wb.sheetnames:
        return None
    rows = list(wb[tab].iter_rows(values_only=True))
    hi = next((i for i, r in enumerate(rows) if r and r[0] == "Country"), None)
    if hi is None:
        return None
    years = []
    for i, h in enumerate(rows[hi]):
        if isinstance(h, (int, float)) or (isinstance(h, str) and h.isdigit()):
            years.append((i, int(h)))
    current = None
    for r in rows[hi + 1:]:
        if not r:
            continue
        if r[0]:
            current = r[0]
        if current == country and len(r) > 2 and r[2] == label:
            out = {}
            for i, y in years:
                v = num(r[i]) if i < len(r) else None
                if v is not None:
                    out[y] = v * 100 if (pct and abs(v) <= 1.5) else v
            return out
    return None


def page_series(D, country, key):
    m = D.get(country, {}).get(key)
    if not m or not m.get("series"):
        return {}
    s = m["series"][0]
    return {int(x): v for x, v in zip(m["xs"], s["vals"]) if v is not None}


def main():
    page_path = sys.argv[1] if len(sys.argv) > 1 else "index.html"
    wb_path = sys.argv[2] if len(sys.argv) > 2 else (sorted(glob.glob("data/*.xlsx")) or [None])[-1]
    if not wb_path:
        sys.exit("No workbook found: pass its path, or put the .xlsx in data/")
    D = load_page(page_path)
    wb = openpyxl.load_workbook(wb_path, data_only=True)
    matched = differing = missing_total = 0
    for key, tab, label, pct in CHECKS:
        for country in D:
            w = workbook_row(wb, tab, country, label, pct)
            if not w:
                continue
            p = page_series(D, country, key)
            common = [y for y in w if y in p]
            diffs = [(y, round(w[y], 3), round(p[y], 3)) for y in common
                     if abs(w[y] - p[y]) > max(0.06, abs(w[y]) * 0.002)]
            missing = [y for y in w if y not in p]
            matched += len(common) - len(diffs)
            differing += len(diffs)
            missing_total += len(missing)
            if diffs or missing:
                print(f"!! {key} {country}: {len(diffs)} differ {diffs[:3]}; not on page {missing[:6]}")
    print(f"\nWorkbook: {wb_path}\nPage: {page_path}")
    print(f"Values matching: {matched} | differing: {differing} | in workbook but not on page: {missing_total}")
    sys.exit(1 if differing or missing_total else 0)


if __name__ == "__main__":
    main()
