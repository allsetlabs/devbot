# TVK Election 2026 - Data Sources & Scraping Guide

## Overview
Tamil Nadu 2026 Assembly Election results for TVK (Tamilaga Vettri Kazhagam - Vijay's party).
Total seats: 234 | Majority mark: 118 | Election date: 23 April 2026 | Result date: 4 May 2026

---

## Official Data Sources

### 1. Election Commission of India (ECI) - Official Results
- **URL**: https://results.eci.gov.in/ResultAcGenMay2026/
- **Status**: Returns 403 when fetched programmatically — needs browser or Referer header
- **Workaround**: Use Chrome browser tools to navigate and scrape table data
- **Page structure**: Party-wise results table with columns: Party, Won, Leading, Total

### 2. ECI State-specific page
- **URL**: https://results.eci.gov.in/ResultAcGenMay2026/partywiseresult-S22.htm
  (S22 = Tamil Nadu state code)
- **Table selector**: `table.table` or `#div1 table`
- **Row selector**: `tr` with `td` elements: Party Name, Won, Leading, Total, %Votes

### 3. tnelections2026.in (unofficial data dashboard)
- **URL**: https://tnelections2026.in/results
- **Status**: Dashboard was showing placeholder data during counting
- **Note**: Check after results are finalized

### 4. Wikipedia
- **URL**: https://en.wikipedia.org/wiki/2026_Tamil_Nadu_Legislative_Assembly_election
- **Useful for**: Final confirmed seat tallies once counting is complete
- **Table selector**: `.wikitable` — look for "Results summary" or "Party-wise results" table

### 5. The Hindu (Live updates)
- **URL**: https://www.thehindu.com/elections/tamil-nadu-assembly/
- **Note**: Live blog format, good for constituency-level data

### 6. Business Standard
- **URL**: https://www.business-standard.com/elections/tamil-nadu-elections/
- **Good for**: Seat-wise margin data

---

## Data Last Fetched: 2026-05-04 (Live counting day)

### TVK Seat Estimates (as of ~11am May 4, 2026)
Counting is ongoing. Numbers approximate from news aggregation.

| Category | Seats | Basis |
|---|---|---|
| Winning comfortably (>10K margin) | ~75 | Extrapolated from 120 total leads |
| Close win (<10K margin) | ~47 | Extrapolated |
| Close loss (<10K behind) | ~32 | Extrapolated |
| Trailing (10K–30K behind) | ~55 | Extrapolated |
| Not competitive (>30K behind) | ~25 | Extrapolated |
| **Total** | **234** | TVK contested all seats |

### Party-wise Tally (Trends, ~11am)
| Party | Seats |
|---|---|
| TVK | ~122 (crossed majority) |
| AIADMK+ | ~70 |
| DMK+ | ~42 |
| Others | ~0 |

### Vote Share
| Party | Share |
|---|---|
| TVK | ~32% |
| DMK alliance | ~32% |
| AIADMK bloc | ~30% |
| Others | ~6% |

---

## Scraping Instructions for Next Run

### To fetch live ECI data with Chrome tools:
1. Use `mcp__claude-in-chrome__tabs_create_mcp` to open new tab
2. Navigate to: `https://results.eci.gov.in/ResultAcGenMay2026/partywiseresult-S22.htm`
3. Use `mcp__claude-in-chrome__get_page_text` to extract table content
4. Parse rows: each `<tr>` has columns [Party, Won, Leading, Total, % Votes]

### To fetch constituency-level data:
1. Navigate to: `https://results.eci.gov.in/ResultAcGenMay2026/constituencywise-S22.htm`
2. Table has columns: [Constituency, Leading Party, Candidate, Votes, Margin, Status]
3. Filter rows where Leading Party = "TVK" for TVK wins
4. Sort by Margin column to classify close vs comfortable

### Key selectors on ECI pages:
- Party table: `table#tblData` or `table.table-bordered`
- Rows: `tbody tr`
- Constituency name: `td:nth-child(2) a`
- Leading party: `td:nth-child(4)`
- Margin: `td:nth-child(6)`

### BEFORE EVERY RUN: Read this file and update the data tables above after fetching fresh data.
