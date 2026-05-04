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

## Data Last Fetched: 2026-05-04 (Live Count — latest round during counting)

### Party-wise Seat Tally (ECI Live — counting in progress)
| Party | Total (Leading) |
|---|---|
| TVK (Tamilaga Vettri Kazhagam) | 107 |
| DMK | 58 |
| ADMK | 51 |
| PMK | 4 |
| INC | 4 |
| IUML | 2 |
| BJP | 2 |
| CPI | 2 |
| DMDK | 1 |
| VCK | 1 |
| AMMK | 1 |
| CPI(M) | 1 |
| **Total** | **234** |

### Alliance Breakdown
| Alliance | Parties | Seats |
|---|---|---|
| TVK (Solo) | TVK | 107 |
| DMK Alliance | DMK+INC+VCK+CPI+CPI(M)+IUML | 68 |
| ADMK (Solo) | ADMK | 51 |
| Others | PMK+DMDK+AMMK | 6 |
| BJP | BJP | 2 |

**Note**: DMK Alliance surged to 68 seats. BJP won 2 seats (incl. Udhagamandalam). TVK short of majority by 11.

### TVK Constituency Status (All 234 — live)
| Status | Count | Description |
|---|---|---|
| Safe Lead (>5K margin) | 71 | Dominant lead |
| Close Lead (<5K margin) | 34 | At risk: <1K(4), 1K-3K(19), 3K-5K(11) |
| Close Loss (<5K behind) | 38 | Lost but could have swung |
| Not Competitive (trailing >5K + not in top 2) | 91 | Wide loss or not in top-2 |

### TVK Who's Beating TVK (72 seats TVK is in 2nd place — live)
| Party | Seats |
|---|---|
| DMK | 35 |
| ADMK | 26 |
| INC | 3 |
| PMK | 2 |
| CPI | 2 |
| CPI(M) | 1 |
| BJP | 1 |
| IUML | 1 |
| DMDK | 1 |

### Top 15 Closest TVK Losses (Live — May 4, 2026 latest round)
| Constituency | Won By | Margin |
|---|---|---|
| Sattur | DMK | 46 |
| Kumbakonam | DMK | 86 |
| Sholavandan | DMK | 100 |
| Udhagamandalam | BJP | 189 |
| Tirukkoyilur | ADMK | 279 |
| Namakkal | ADMK | 502 |
| Srivaikuntam | ADMK | 544 |
| Mettuppalayam | DMK | 691 |
| Coimbatore South | DMK | 855 |
| Bodinayakanur | DMK | 919 |
| Bhavanisagar | ADMK | 967 |
| Viluppuram | DMK | 1,148 |
| Vellore | DMK | 1,240 |
| Chepauk-Thiruvallikeni | DMK | 1,365 |
| Lalgudi | ADMK | 1,663 |

### TVK Wins at Risk (10 Slimmest TVK Leading Margins)
| Constituency | TVK Lead (votes) |
|---|---|
| Tiruvadanai | 119 |
| Tiruvannamalai | 395 |
| Vikravandi | 542 |
| Palayamkottai | 792 |
| Thiruverumbur | 1,077 |
| Paramakudi | 1,155 |
| Polur | 1,431 |
| Kulithalai | 1,446 |
| Kumarapalayam | 1,511 |
| Sivakasi | 1,572 |

### TVK Winning Margin Breakdown (107 seats — live updated)
| Margin Range | Seats |
|---|---|
| <1,000 (at risk) | 4 |
| 1K–3K | 19 |
| 3K–5K | 11 |
| 5K–10K | 15 |
| 10K–20K | 35 |
| >20K | 21 |
| **Total** | **105** (statewise) / **107** (party page) |
| Avg margin | 12,803 votes |
| Highest | Madavaram 74,243 |
| Lowest | Tiruvadanai 119 |

### What-If Scenarios
| Scenario | Seats | vs Majority (118) |
|---|---|---|
| Current (live) | 107 | -11 |
| If won all <1K losses (10 seats) | 117 | -1 (razor thin!) |
| If won all <5K losses (38 seats) | 145 | +27 |

### Close Losses by Winning Party (38 seats, <5K margin)
| Party | Seats |
|---|---|
| DMK | 21 |
| ADMK | 14 |
| BJP | 1 |
| DMDK | 1 |
| INC | 1 |

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
