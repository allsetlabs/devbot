# TVK Election Data — ECI Website Guide

Read this file **before every data refresh run**. It documents the official ECI website structure, URLs, and selectors needed to pull Tamil Nadu 2026 TVK election data.

---

## Official Website

**Base URL:** `https://results.eci.gov.in/ResultAcGenMay2026/`

| Page | URL | Purpose |
|------|-----|---------|
| Tamil Nadu party summary | `partywiseresult-S22.htm` | All-party seat totals (Won + Leading + Total) |
| TVK constituency leads | `partywiseleadresult-3679S22.htm` | All 109 TVK leading/won seats with margins |
| Individual constituency | `candidateswise-S22{N}.htm` | Candidate details for constituency number N |
| Tamil Nadu main page | `index.htm` | Home with map + party tabs |

**Party code:** `3679` (Tamilaga Vettri Kazhagam)  
**State code:** `S22` (Tamil Nadu)  
**Last fetched:** Evening, May 4, 2026 (latest counting round)

---

## Party-wise Summary Page (`partywiseresult-S22.htm`)

### Page structure
```
main > table
  Row: Party | Won | Leading | Total
```

### How to read
- Use `get_page_text` on `tabId` pointing to this URL
- The text returns a compact block: `TVK 109 DMK 59 ADMK 45 PMK 5 ...`
- Then the detailed table: `Tamilaga Vettri Kazhagam - TVK | 10 | 99 | 109`
- Total row: `Total | 17 | 217 | 234`

---

## TVK Constituency Leads Page (`partywiseleadresult-3679S22.htm`)

### Page structure
```
main > table
  Columns: S.No | Constituency (link) | Leading Candidate | Total Votes | Margin | Status
  Footer: "Last Updated at HH:MM PM On DD/MM/YYYY"
```

### Selectors (for accessibility tree / read_page)
- Table: `table [ref_20]` (root table)
- Constituency links: `link "CONSTITUENCY_NAME(N)"` — each constituency is a link with href `candidateswise-S22{N}.htm`
- Margin value: `generic "{number}"` — 5th column after constituency name
- Status: `generic "{X}/{Y}"` — rounds counted / total rounds. `X == Y` means counting complete
- Last updated timestamp: `generic "Last Updated at"` followed by date string

### Reading the data efficiently
Use `read_page` with `filter: "all"`, `depth: 5`, `max_chars: 80000` on this tab.

The output lists entries like:
```
link "CONSTITUENCY(N)" → candidate → total_votes → margin → status(rounds)
```

---

## Data Reference (as of latest round, May 4, 2026 evening)

### Party-wise totals

| Party | Won | Leading | Total |
|-------|-----|---------|-------|
| TVK | 15 | 94 | **109** |
| DMK | 8 | 51 | 59 |
| ADMK | 2 | 43 | 45 |
| PMK | 0 | 5 | 5 |
| INC | 1 | 4 | 5 |
| BJP | 0 | 2 | 2 |
| IUML | 0 | 2 | 2 |
| CPI(M) | 0 | 2 | 2 |
| CPI | 1 | 1 | 2 |
| DMDK | 0 | 1 | 1 |
| VCK | 0 | 1 | 1 |
| AMMKMNKZ | 0 | 1 | 1 |
| **Total** | **27** | **207** | **234** |

**Key changes from 5 PM snapshot:**
- BJP: 3→2 (lost 1 seat)
- CPI: 1→2 (gained 1 seat)
- DMK Alliance: 70→71 total
- TVK: 10→15 officially Won (Cumbum, Bargur + 3 others declared)
- Kumbakonam flipped: was DMK+86, now TVK+432
- Palani flipped: was ADMK+1,246, now TVK+482
- Nilakkottai flipped: was DMK+513, now TVK+3,423
- Sholavandan crashed from 727 to only **40 votes** (14/19 rounds!)

### TVK margin summary (94 Leading seats)

| Margin Range | Seats |
|-------------|-------|
| < 1,000 | 6 |
| 1K – 3K | 7 |
| 3K – 5K | 7 |
| 5K – 10K | 15 |
| 10K – 20K | 25 |
| > 20K | 34 |
| **Total (Leading)** | **94** |

Note: 15 officially "Won" seats not included above.

### TVK 10 most at-risk wins (smallest leading margins)

| Constituency | Margin | Rounds | Risk |
|-------------|--------|--------|------|
| Sholavandan | 40 | 14/19 | Extreme |
| Polur | 316 | 12/22 | Extreme |
| Kumbakonam | 432 | 20/22 | Extreme |
| Palani | 482 | 23/25 | Extreme |
| Tiruvadanai | 678 | 25/27 | High |
| Yercaud | 975 | 17/24 | High |
| Kallakurichi | 1,278 | 21/27 | Medium |
| Kulithalai | 1,318 | 17/21 | Medium |
| Namakkal | 1,325 | 11/23 | Medium |
| Manapparai | 1,803 | 24/25 | Medium |

### Close losses (TVK trailing by < 5K, ~27 seats)

| Constituency | Winner | Margin |
|-------------|--------|--------|
| Dindigul | DMK | ~279 |
| Tiruvannamalai | DMK | ~1,074 |
| Vikravandi | PMK | ~1,075 |
| Lalgudi | ADMK | ~1,101 |
| Tittakudi | DMK | ~1,125 |
| Udhagamandalam | BJP | ~1,231 |
| Sholingur | PMK | ~1,561 |
| Kilvelur | CPI(M) | ~1,679 |
| Killiyoor | INC | ~1,987 |
| Paramakudi | DMK | ~2,437 |
| Vaniyambadi | IUML | ~2,572 |
| *(~16 more up to 5K)* | | |

*Note: Kumbakonam (DMK+86), Palani (ADMK+1,246), and Nilakkottai (DMK+513) no longer in this list — all flipped to TVK wins.*

---

## Steps for future data refresh

1. **Read this file** (tvk info.md)
2. Open Chrome tab → navigate to `https://results.eci.gov.in/ResultAcGenMay2026/partywiseresult-S22.htm`
3. Use `get_page_text` → parse party totals from text block
4. Navigate to `https://results.eci.gov.in/ResultAcGenMay2026/partywiseleadresult-3679S22.htm`
5. Use `read_page` with `depth:5, max_chars:80000, filter:"all"` → parse all margins
6. Compare changed values against data in `TvkElectionCharts.tsx`, `TvkCloseRaceCharts.tsx`, `TvkInsightCharts.tsx`, and `TvkElection.tsx`
7. Update all data constants in those 4 files
8. Run `npm run lint && npm run type-check` from `app/`
9. Navigate to `https://localhost:4005/tvk` in Chrome and verify charts render
10. Commit on current branch

---

## Navigation buttons on ECI site

| Element | Action |
|---------|--------|
| "Hindi" link in nav | Toggle language (avoid — breaks parsing) |
| "Refresh" link in nav | Reloads page with latest data |
| Constituency links in table | Go to candidate-wise result for that seat |
| "Party Wise Results – View Full Details" link | Party vote share breakdown |
| "All Constituencies at a glance >" | Full matrix view of all 234 seats |
