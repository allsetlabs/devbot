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

## Data Last Fetched: 2026-05-04 (Live Count, Counting in Progress)

### Party-wise Seat Tally (ECI Live — counting in progress)
| Party | Total (Leading) |
|---|---|
| TVK (Tamilaga Vettri Kazhagam) | 109 |
| ADMK | 56 |
| DMK | 49 |
| PMK | 5 |
| INC | 4 |
| VCK | 2 |
| CPI | 2 |
| CPI(M) | 2 |
| BJP | 1 |
| DMDK | 1 |
| IUML | 1 |
| AMMK | 1 |
| **Total** | **234** |

### Alliance Breakdown
| Alliance | Parties | Seats |
|---|---|---|
| TVK (Solo) | TVK | 109 |
| DMK Alliance | DMK+INC+VCK+CPI+CPI(M)+IUML | 60 |
| ADMK (Solo) | ADMK | 56 |
| Others | PMK+BJP+DMDK+AMMK | 9 |

### TVK Constituency Status (All 234 — live)
| Status | Count | Description |
|---|---|---|
| Safe Lead (>5K margin) | 68 | Dominant lead |
| Close Lead (<5K margin) | 41 | At risk: <1K(10), 1K-3K(17), 3K-5K(14) |
| Close Loss (<5K behind) | 39 | Lost but could have swung |
| Not Competitive | 86 | Far loss (31 in 2nd, 55 not in top-2) |

### TVK Who's Beating TVK (70 seats TVK is in 2nd place — live)
| Party | Seats |
|---|---|
| DMK | 32 |
| ADMK | 28 |
| PMK | 3 |
| INC | 2 |
| CPI | 2 |
| CPI(M) | 1 |
| IUML | 1 |
| DMDK | 1 |

### Top 15 Closest TVK Losses (Live — May 4, 2026)
| Constituency | Won By | Margin |
|---|---|---|
| Bodinayakanur | DMK | 173 |
| Namakkal | ADMK | 460 |
| Tiruchuli | DMK | 466 |
| Rishivandiyam | DMK | 503 |
| Vikravandi | PMK | 547 |
| Nagercoil | DMK | 774 |
| Sankari | ADMK | 812 |
| Coimbatore South | DMK | 821 |
| Srivaikuntam | ADMK | 955 |
| Viluppuram | DMK | 1,015 |
| Chepauk-Thiruvallikeni | DMK | 1,048 |
| Sivakasi | ADMK | 1,261 |
| Madurantakam | ADMK | 1,424 |
| Tirukkoyilur | ADMK | 1,438 |
| Bhavanisagar | ADMK | 1,552 |

### TVK Winning Margin Breakdown (109 seats — live)
| Margin Range | Seats |
|---|---|
| <1,000 (at risk) | 10 |
| 1K–3K | 17 |
| 3K–5K | 14 |
| 5K–10K | 21 |
| 10K–20K | 36 |
| >20K | 11 |
| **Total** | **109** |
| Avg margin | 9,695 votes |
| Highest | Madavaram 52,347 |

### What-If Scenarios
| Scenario | Seats | vs Majority (118) |
|---|---|---|
| Current (live) | 109 | -9 |
| If won all <1K losses | 119 | +1 (just over!) |
| If won all <5K losses | 148 | +30 |

### Vote Share (Official ECI — live)
| Party | Vote % | Total Votes |
|---|---|---|
| Other (incl. TVK*) | 39.07% | 86,31,074 |
| DMK | 24.09% | 53,21,698 |
| ADMK | 22.12% | 48,85,356 |
| NTK | 3.95% | 8,71,947 |
| INC | 3.65% | 8,06,527 |
| BJP | 2.99% | 6,60,357 |
| DMDK | 1.09% | 2,39,908 |
| VCK | 0.95% | 2,10,215 |
| CPI | 0.61% | 1,35,765 |
| CPI(M) | 0.60% | 1,32,961 |
| NOTA | 0.41% | 91,319 |
| IUML | 0.33% | 73,806 |

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
3. javascript_tool: extract cells[4] (margin) from each row
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
2. Run the async fetch loop above (fetches all 12 pages in parallel)
3. Extract leadingParty, trailingParty, margin for all rows
4. Filter: tvkTrailing = where trailingParty includes 'Tamilaga Vettri'
5. Filter: closeLosses = tvkTrailing where margin < 5000
```

### Key selectors summary
| Data | URL | JS Selector | Key cells |
|---|---|---|---|
| Party seats | partywiseresult-S22.htm | `table tbody tr` | cells[0..3] |
| TVK margins | partywiseleadresult-3679S22.htm | `table tbody tr` | cells[4] |
| Vote share | voteshareresult-S22.htm | `table tbody tr` | cells[1,2] |
| All constituencies | statewiseS22{1..12}.htm | `table tbody tr` (31 cells/row) | cells[4,17,28] |
