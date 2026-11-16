# Country grid assessment · data tool prototype

**Status: prototype. Trial data, not validated. Internal only: do not cite or circulate.**

An interactive page assessing the state of the electricity grid in five pilot countries (Germany, Poland, South Korea, Indonesia, Pakistan). It's based on this definition of success: *the grid is succeeding when it can accommodate changes on the supply and demand sides of the power system in a timely manner to provide clean, abundant, reliable and affordable electricity for all.*

For each grid assessment indicator, the page shows a constraint metric, a possible driver and a future risk, plus country characteristics for context. There are no thresholds or scores yet.

**Made by:** Lizzie (Elisabeth), Ember
**Working data:** [Data for Ember labs – Prototype](https://docs.google.com/spreadsheets/d/18a1xHsJFrN5e3Xi6wmOivFK9hhTKeItXXRVsuoiiHHU) (Google Sheet)

## What's in this repo

| Path | What it is |
| --- | --- |
| `index.html` | The tool: one self-contained page, with the data built in. Open it in a browser |
| `data/grid-assessment-data_2026-11-11.xlsx` | Snapshot of the workbook the page was built from (last edited 11 Nov 2026, 15:22) |
| `scripts/check_data.py` | Checks that the page's data matches a workbook export |

## How the data gets into the page

The page doesn't read the Google Sheet. It holds a **snapshot** of the workbook's data in one block inside `index.html` (`window.GGAF`), plus notes explaining each gap. Editing the sheet doesn't change the page: after the workbook changes, the page has to be rebuilt.

The page also calculates its own ratios from the workbook, e.g. queue ÷ installed capacity, transformer capacity ÷ peak, and congestion cost ÷ grid investment. Each chart has a "How this is calculated" note.

**Check (16 Nov 2026):** every series that maps directly to a workbook row was compared, value by value: **590 values matching, 0 differing**. That covers line length, storage, RES-E share, access, consumption per capita, curtailment share, congestion cost per MWh and incidents, for all five countries.

To re-run it after an update (needs Python with `openpyxl`):

```bash
pip install openpyxl
python3 scripts/check_data.py index.html data/<new export>.xlsx
```

## Workbook tabs used

The page uses tabs 1–5, 7–11, 13, 15–28, 31 and 33. Tab 12 (demand queue) and tab 14 (SAIDI/SAIFI) aren't in the workbook; tabs 29 and 32 point to tabs 26 and 27.

**Not used yet:**

| Tab | Contents |
| --- | --- |
| 35 | Plan delivery rate: share of planned grid build delivered |
| 30 | Projected transformer capacity |
| 34 | Projected average hourly load |
| 6 | Demand growth in national plans, indexed (the page uses tabs 25 and 31 for plan demand) |

To view the tool, download `index.html` and open it in a browser. GitHub Pages is off until the tool is approved for wider use.
