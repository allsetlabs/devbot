# TVK Election 2026 — Data Sources & Scraping Guide

## Overview
Tamil Nadu 2026 Assembly Election results for TVK (Tamilaga Vettri Kazhagam — Vijay's party).
Total seats: 234 | Majority mark: 118 | Election date: 23 April 2026 | Result date: 4 May 2026

**BEFORE EVERY RUN:** Read this file first. Navigate to the ECI URLs below to get fresh data.

---

## Official Data Sources

### 1. ECI Party-wise Results (PRIMARY)
- **URL**: `https://results.eci.gov.in/ResultAcGenMay2026/partywiseresult-S22.htm`
- **Status**: Works in browser (Chrome MCP). Returns data live.
- **Table selector**: `table tbody tr` → cells[0]=Party, cells[1]=Won, cells[2]=Leading, cells[3]=Total
- **TVK row text**: "Tamilaga Vettri Kazhagam - TVK"
- **TVK constituency link**: Found via `a[href]` in TVK row — currently `partywiseleadresult-3679S22.htm`
- **JS to extract all parties**: `document.querySelectorAll('table tbody tr')` → cells[0..3]
- **JS to extract TVK constituency link**: `links[0].href` from the TVK row

### 2. ECI TVK Constituency Detail (for margin data)
- **URL**: `https://results.eci.gov.in/ResultAcGenMay2026/partywiseleadresult-3679S22.htm`
  (URL suffix changes if party ID changes — always extract from step 1 first)
- **Table columns**: cells[0]=Serial, cells[1]=Constituency(+No), cells[2]=Candidate, cells[3]=Votes, cells[4]=Margin
- **JS to extract margins**: `document.querySelectorAll('table tbody tr')` → `parseInt(cells[4].textContent.replace(/,/g,''))`

### 3. ECI Vote Share
- **URL**: `https://results.eci.gov.in/ResultAcGenMay2026/voteshareresult-S22.htm`
  (Found by clicking "Party Wise Vote Share — View Full Details" button on the results page)
- **Button text**: "Party Wise Vote Share – View Full Details"
- **Table selector**: `table tbody tr` → cells[1]=Party, cells[2]=Vote%, cells[3]=TotalVotes
- **Note**: TVK appears under "Other" in vote share — it's a newly registered party

### 4. Wikipedia (for finalized summary)
- **URL**: `https://en.wikipedia.org/wiki/2026_Tamil_Nadu_Legislative_Assembly_election`
- **Useful for**: Final confirmed seat tallies post-counting
- **Table selector**: `.wikitable` — "Results summary" or "Party-wise results" section

---

## Data Last Fetched: 2026-05-05 12:12 PM

### Party-wise Seat Tally (Official ECI)
| Party | Won | Leading | Total |
|---|---|---|---|
| TVK (Tamilaga Vettri Kazhagam) | 0 | 106 | 106 |
| ADMK | 0 | 64 | 64 |
| DMK | 0 | 43 | 43 |
| INC | 0 | 5 | 5 |
| PMK | 0 | 4 | 4 |
| BJP | 0 | 3 | 3 |
| DMDK | 0 | 2 | 2 |
| VCK | 0 | 2 | 2 |
| CPI | 0 | 2 | 2 |
| IUML | 0 | 1 | 1 |
| AMMKMNKZ | 0 | 1 | 1 |
| CPI(M) | 0 | 1 | 1 |
| **Total** | **0** | **234** | **234** |

### TVK Winning Margin Breakdown (106 seats — real ECI data)
| Margin Range | Seats | Note |
|---|---|---|
| Very close (<1,000) | 14 | At risk if recounting |
| Close win (1K–3K) | 27 | Narrow win |
| Moderate (3K–5K) | 14 | Comfortable |
| Good (5K–10K) | 33 | Safe |
| Comfortable (10K–20K) | 16 | Very safe |
| Dominant (>20K) | 2 | Madavaram (30,315), Poonamallee (21,249) |
| **Total** | **106** | Avg margin: 5,629 votes |

### Alliance Summary
| Alliance | Parties | Seats | Vote Share |
|---|---|---|---|
| TVK (solo) | TVK | 106 | ~38.74%* |
| AIADMK+ | ADMK + BJP | 67 | ~25.47% |
| DMK Alliance (SPA) | DMK + INC + VCK + CPI + CPI(M) + IUML | 54 | ~30.26% |
| Others | PMK + DMDK + AMMKMNKZ | 7 | ~5.53% |

### Vote Share (Official ECI — named parties)
| Party | Vote % | Total Votes |
|---|---|---|
| Other (incl. TVK*) | 38.74% | 50,21,272 |
| DMK | 24.20% | 31,36,703 |
| ADMK | 22.29% | 28,89,410 |
| NTK | 3.91% | 5,06,253 |
| INC | 3.50% | 4,54,118 |
| BJP | 3.18% | 4,12,316 |
| DMDK | 1.06% | 1,37,696 |
| VCK | 0.88% | 1,14,294 |
| CPI | 0.70% | 90,496 |
| CPI(M) | 0.60% | 77,833 |
| NOTA | 0.41% | 53,471 |
| IUML | 0.38% | 49,028 |
| BSP | 0.12% | 14,993 |

*TVK is classified as "Other" in ECI vote share — it's a newly registered party not yet recognized as a state party.

---

## Scraping Instructions

### Step 1: Get party totals + TVK detail URL
```
1. tabs_create_mcp → new tab
2. navigate → https://results.eci.gov.in/ResultAcGenMay2026/partywiseresult-S22.htm
3. wait 3s
4. javascript_tool: document.querySelectorAll('table tbody tr') → extract cells[0..3] + links[0].href for TVK row
```

### Step 2: Get TVK constituency margins
```
1. navigate → href from Step 1 (partywiseleadresult-XXXXS22.htm)
2. wait 2s
3. javascript_tool:
   const rows = document.querySelectorAll('table tbody tr');
   const margins = [];
   rows.forEach(row => {
     const cells = row.querySelectorAll('td');
     const m = parseInt(cells[4]?.textContent?.trim().replace(/,/g,''));
     if(!isNaN(m)) margins.push(m);
   });
   // Then categorize by range
```

### Step 3: Get vote share
```
1. navigate → https://results.eci.gov.in/ResultAcGenMay2026/voteshareresult-S22.htm
   (OR click the "Party Wise Vote Share – View Full Details" link on the results page)
2. wait 3s
3. javascript_tool: document.querySelectorAll('table tbody tr') → cells[1]=Party, cells[2]=Vote%, cells[3]=TotalVotes
```

### Key selectors summary
| Data | URL | JS Selector |
|---|---|---|
| Party seats | partywiseresult-S22.htm | `table tbody tr` → cells[0..3] |
| TVK detail link | partywiseresult-S22.htm | TVK row `a[href]` |
| TVK margins | partywiseleadresult-3679S22.htm | `table tbody tr` → cells[4] |
| Vote share | voteshareresult-S22.htm | `table tbody tr` → cells[1..3] |
