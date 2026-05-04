# TVK Election 2026 — Data Sources & Scraping Guide

## Overview
Tamil Nadu 2026 Assembly Election results for TVK (Tamilaga Vettri Kazhagam — Vijay's party).
Total seats: 234 | Majority mark: 118 | Election date: 23 April 2026 | Result date: May 5, 2026

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
- **Table columns**: cells[0]=Serial, cells[1]=Constituency(+No), cells[2]=Candidate, cells[3]=Votes, cells[4]=Margin, cells[5]=Status(rounds)
- **JS to extract margins**: `document.querySelectorAll('table tbody tr')` → `parseInt(cells[4].textContent.replace(/,/g,''))`

### 3. ECI Vote Share
- **URL**: `https://results.eci.gov.in/ResultAcGenMay2026/voteshareresult-S22.htm`
  (Found by clicking "Party Wise Vote Share — View Full Details" button on the results page)
- **Button text**: "Party Wise Vote Share – View Full Details"
- **Table selector**: `table tbody tr` → cells[1]=Party, cells[2]=Vote%, cells[3]=TotalVotes
- **Note**: TVK appears under "Other" in vote share — it's a newly registered party

### 4. ECI All Constituencies At a Glance (PAGINATED — 12 pages)
- **URLs**: `https://results.eci.gov.in/ResultAcGenMay2026/statewiseS22{1..12}.htm`
  (i.e., statewiseS221.htm, statewiseS222.htm, ... statewiseS2212.htm)
- **Found via**: "All Constituencies at a glance >" link on the main results page
- **Table structure**: 31 cells per row (tooltip spans inflate cell count)
  - cells[0] = Constituency name
  - cells[1] = Constituency number
  - cells[2] = Leading candidate
  - cells[4] = Leading party (clean, after removing tooltip span)
  - cells[15] = Trailing candidate
  - cells[17] = Trailing party (clean)
  - cells[28] = Margin
  - cells[30] = Status
- **IMPORTANT**: Party names are FULL names, not abbreviations. Use "Tamilaga Vettri Kazhagam" not "TVK" when filtering.
- **JS to fetch ALL 12 pages** (run from any ECI tab):
```js
(async () => {
  function extractFromHTML(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const rows = doc.querySelectorAll('table tbody tr');
    const data = [];
    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if(cells.length >= 29) {
        const constituency = cells[0]?.textContent.trim();
        const constNo = cells[1]?.textContent.trim();
        const getCleanText = (cell) => {
          if(!cell) return '';
          const clone = cell.cloneNode(true);
          clone.querySelectorAll('span').forEach(s => s.remove());
          return clone.textContent.trim();
        };
        const leadingParty = getCleanText(cells[4]);
        const trailingParty = getCleanText(cells[17]);
        const margin = parseInt(cells[28]?.textContent.trim().replace(/,/g,'')) || 0;
        const status = cells[30]?.textContent.trim();
        if(constituency && constNo.match(/^\d+$/)) {
          data.push({constituency, constNo: parseInt(constNo), leadingParty, trailingParty, margin, status});
        }
      }
    });
    return data;
  }
  const base = 'https://results.eci.gov.in/ResultAcGenMay2026/statewiseS22';
  const allData = [];
  for(let i = 1; i <= 12; i++) {
    const resp = await fetch(base + i + '.htm');
    const html = await resp.text();
    allData.push(...extractFromHTML(html));
  }
  window._electionData = allData;
  return JSON.stringify({total: allData.length});
})()
```

### 5. Wikipedia (for finalized summary)
- **URL**: `https://en.wikipedia.org/wiki/2026_Tamil_Nadu_Legislative_Assembly_election`
- **Useful for**: Final confirmed seat tallies post-counting
- **Table selector**: `.wikitable` — "Results summary" or "Party-wise results" section

---

## Data Last Fetched: 2026-05-04 (Live Count — refreshed round during counting)

### Party-wise Seat Tally (ECI Live — counting in progress)
| Party | Total (Leading) |
|---|---|
| TVK (Tamilaga Vettri Kazhagam) | 103 |
| DMK | 61 |
| ADMK | 49 |
| PMK | 5 |
| INC | 4 |
| IUML | 2 |
| BJP | 2 |
| CPI | 2 |
| DMDK | 2 |
| VCK | 2 |
| AMMK | 1 |
| CPI(M) | 1 |
| **Total** | **234** |

### Alliance Breakdown
| Alliance | Parties | Seats |
|---|---|---|
| TVK (Solo) | TVK | 103 |
| DMK Alliance | DMK+INC+VCK+CPI+CPI(M)+IUML | 72 |
| ADMK (Solo) | ADMK | 49 |
| Others | PMK+DMDK+AMMK | 8 |
| BJP | BJP | 2 |

**Note**: DMK Alliance surged to 72 seats (DMK 61+INC 4+VCK 2+CPI 2+CPI(M) 1+IUML 2). TVK short of majority by 15.

### TVK Constituency Status (All 234 — live refreshed)
| Status | Count | Description |
|---|---|---|
| Safe Lead (>5K margin) | 77 | Dominant lead |
| Close Lead (<5K margin) | 26 | At risk: <1K(8), 1K-3K(9), 3K-5K(9) |
| Close Loss (<5K behind) | 41 | Lost but could have swung |
| Not Competitive (trailing >5K + not in top 2) | 90 | Wide loss or not in top-2 |

### TVK Who's Beating TVK (75 seats TVK is in 2nd place — live refreshed)
| Party | Seats |
|---|---|
| DMK | 35 |
| ADMK | 26 |
| INC | 3 |
| PMK | 3 |
| CPI | 2 |
| IUML | 2 |
| DMDK | 2 |
| CPI(M) | 1 |
| BJP | 1 |

### Top 15 Closest TVK Losses (Refreshed — May 4, 2026 latest round)
| Constituency | Won By | Margin |
|---|---|---|
| Sholavandan | DMK | 15 |
| Vellore | DMK | 40 |
| Sattur | DMK | 46 |
| Kumbakonam | DMK | 86 |
| Paramakudi | DMK | 103 |
| Vikravandi | PMK | 166 |
| Manapparai | ADMK | 293 |
| Udhagamandalam | BJP | 433 |
| Namakkal | ADMK | 502 |
| Gudiyattam | DMDK | 920 |
| Lalgudi | ADMK | 974 |
| Dindigul | DMK | 1,079 |
| Bhavanisagar | ADMK | 1,161 |
| Coimbatore South | DMK | 1,198 |
| Katpadi | ADMK | 1,313 |

### TVK Wins at Risk (10 Slimmest TVK Leading Margins — refreshed)
| Constituency | TVK Lead (votes) |
|---|---|
| Tiruvadanai | 17 |
| Srivaikuntam | 38 |
| Mettuppalayam | 52 |
| Killiyoor | 151 |
| Tirukkoyilur | 385 |
| Tiruvannamalai | 395 |
| Sholingur | 841 |
| Yercaud | 973 |
| Polur | 1,431 |
| Sivakasi | 1,572 |

### TVK Winning Margin Breakdown (103 seats — live updated)
| Margin Range | Seats |
|---|---|
| <1,000 (at risk) | 8 |
| 1K–3K | 9 |
| 3K–5K | 9 |
| 5K–10K | 19 |
| 10K–20K | 30 |
| >20K | 28 |
| **Total** | **103** |
| Avg margin | 14,141 votes |
| Highest | Madavaram 79,885 |
| Lowest | Tiruvadanai 17 |

### What-If Scenarios
| Scenario | Seats | vs Majority (118) |
|---|---|---|
| Current (live) | 103 | -15 |
| If won all <1K losses (10 seats) | 113 | -5 |
| If won all <5K losses (41 seats) | 144 | +26 |

### Close Losses by Winning Party (41 seats, <5K margin)
| Party | Seats |
|---|---|
| DMK | 21 |
| ADMK | 13 |
| PMK | 2 |
| DMDK | 2 |
| BJP | 1 |
| INC | 1 |
| CPI | 1 |

### Vote Share (Official ECI — live updated)
| Party | Vote % | Total Votes |
|---|---|---|
| Other (incl. TVK*) | 39.19% | 10,052,566 |
| DMK | 24.04% | 6,164,776 |
| ADMK | 21.87% | 5,609,671 |
| NTK | 3.95% | 1,012,886 |
| BJP | 3.07% | 788,386 |
| INC | 3.63% | 930,298 |
| DMDK | 1.10% | 282,868 |
| VCK | 1.04% | 267,971 |
| CPI | 0.60% | 153,529 |
| CPI(M) | 0.59% | 151,518 |
| NOTA | 0.41% | 105,969 |
| IUML | 0.36% | 93,210 |

*TVK is classified as "Other" in ECI vote share — newly registered party.

---

## Scraping Instructions

### Step 1: Get party totals
```
1. navigate → https://results.eci.gov.in/ResultAcGenMay2026/partywiseresult-S22.htm
2. wait 3s
3. javascript_tool: document.querySelectorAll('table tbody tr') → extract cells[0..3]
```

### Step 2: Get TVK constituency margins
```
1. navigate → https://results.eci.gov.in/ResultAcGenMay2026/partywiseleadresult-3679S22.htm
2. wait 2s
3. javascript_tool: extract cells[4] (margin) from each row, sort ascending
```

### Step 3: Get vote share
```
1. navigate → https://results.eci.gov.in/ResultAcGenMay2026/voteshareresult-S22.htm
2. wait 3s
3. javascript_tool: cells[1]=Party, cells[2]=Vote%
```

### Step 4: Get all 234 constituencies (for close race analysis)
```
1. Navigate to any ECI page
2. Run the async fetch loop above (fetches all 12 pages sequentially)
3. Filter: leadingParty === 'Tamilaga Vettri Kazhagam' → TVK leading
4. Filter: trailingParty === 'Tamilaga Vettri Kazhagam' → TVK trailing
5. closeLosses = tvkTrailing where margin < 5000
```

### Step 5: Get TVK wins at risk (smallest TVK winning margins)
```
1. navigate → https://results.eci.gov.in/ResultAcGenMay2026/partywiseleadresult-3679S22.htm
2. javascript_tool: extract cells[1] (name), cells[4] (margin) → sort ascending → take top 10
```

### Key selectors summary
| Data | URL | JS Selector | Key cells |
|---|---|---|---|
| Party seats | partywiseresult-S22.htm | `table tbody tr` | cells[0..3] |
| TVK margins | partywiseleadresult-3679S22.htm | `table tbody tr` | cells[1,4] |
| TVK wins at risk | partywiseleadresult-3679S22.htm | `table tbody tr` sorted asc by cells[4] | cells[1,4] |
| Vote share | voteshareresult-S22.htm | `table tbody tr` | cells[1,2] |
| All constituencies | statewiseS22{1..12}.htm | `table tbody tr` (31 cells/row) | cells[4,17,28] |

### Party name mapping (full name → abbreviation)
```
'Tamilaga Vettri Kazhagam' → 'TVK'
'All India Anna Dravida Munnetra Kazhagam' → 'ADMK'
'Dravida Munnetra Kazhagam' → 'DMK'
'Pattali Makkal Katchi' → 'PMK'
'Indian National Congress' → 'INC'
'Communist Party of India' → 'CPI'
'Indian Union Muslim League' → 'IUML'
'Bharatiya Janata Party' → 'BJP'
'Desiya Murpokku Dravida Kazhagam' → 'DMDK'
'Viduthalai Chiruthaigal Katchi' → 'VCK'
'Amma Makkal Munnettra Kazagam' → 'AMMK'
'Communist Party of India (Marxist)' → 'CPI(M)'
```
