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
**Last fetched:** Late evening, May 4, 2026 (latest counting round)

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

## Data Reference (as of latest round, May 4, 2026 late evening)

### Party-wise totals

| Party | Won | Leading | Total |
|-------|-----|---------|-------|
| TVK | 22 | 87 | **109** |
| DMK | 8 | 52 | 60 |
| ADMK | 5 | 39 | 44 |
| PMK | 0 | 5 | 5 |
| INC | 1 | 4 | 5 |
| IUML | 0 | 2 | 2 |
| VCK | 0 | 2 | 2 |
| CPI(M) | 0 | 2 | 2 |
| CPI | 1 | 1 | 2 |
| BJP | 0 | 1 | 1 |
| DMDK | 0 | 1 | 1 |
| AMMKMNKZ | 0 | 1 | 1 |
| **Total** | **37** | **197** | **234** |

**Key changes from previous snapshot:**
- TVK: 15→22 officially Won (7 more declared)
- DMK: 59→60 (+1)
- ADMK: 45→44 (-1)
- BJP: 2→1 (-1)
- VCK: 1→2 (+1)
- DMK Alliance: 71→73 total
- Palani flipped back: TVK→ADMK+753
- Bargur flipped back: TVK→ADMK+882
- Cumbum flipped back: TVK→DMK+1,596
- Sholavandan recovered from 40 to 523 votes lead
- Kovilpatti new entry at 329 (extreme risk)

### TVK margin summary (87 Leading seats)

| Margin Range | Seats |
|-------------|-------|
| < 1,000 | 6 |
| 1K – 3K | 6 |
| 3K – 5K | 6 |
| 5K – 10K | 14 |
| 10K – 20K | 20 |
| > 20K | 35 |
| **Total (Leading)** | **87** |

Note: 22 officially "Won" seats not included above. Avg margin: 19,222 · Max: 74,189.

### TVK 10 most at-risk wins (smallest leading margins)

| Constituency | Margin | Status | Risk |
|-------------|--------|--------|------|
| Polur | 316 | 12/22 | Extreme |
| Kovilpatti | 329 | 21/23 | Extreme |
| Kumbakonam | 432 | 20/22 | Extreme |
| Sholavandan | 523 | 15/19 | High |
| Kulithalai | 542 | 18/21 | High |
| Kallakurichi | 605 | 23/27 | High |
| Srivaikuntam | 1,186 | Result Declared | Locked |
| Manapparai | 1,378 | 25/26 | Medium |
| Tirukkoyilur | 2,020 | 20/24 | Medium |
| Modakkurichi | 2,430 | 21/21 | Low |

### Close losses (TVK trailing by < 5K, 27 seats)

| Constituency | Winner | Margin |
|-------------|--------|--------|
| Palani | ADMK | 753 |
| Bargur | ADMK | 882 |
| Udhagamandalam | BJP | 976 |
| Dindigul | DMK | 1,131 |
| Tiruvannamalai | DMK | 1,139 |
| Tittakudi | DMK | 1,521 |
| Vriddhachalam | DMDK | 1,524 |
| Cumbum | DMK | 1,596 |
| Lalgudi | ADMK | 2,086 |
| Kilvelur | CPI(M) | 2,131 |
| Colachal | INC | 2,347 |
| Vikravandi | PMK | 2,576 |
| Paramakudi | DMK | 2,624 |
| Melur | INC | 2,724 |
| Tiruppattur | DMK | 2,907 |
| Pudukkottai | DMK | 2,942 |
| Vaniyambadi | IUML | 2,982 |
| Killiyoor | INC | 3,285 |
| Aruppukkottai | DMK | 3,510 |
| Papanasam | IUML | 3,900 |
| Karur | ADMK | 4,000 |
| Viluppuram | DMK | 4,027 |
| Sholingur | PMK | 4,115 |
| Rishivandiyam | DMK | 4,360 |
| Coimbatore (South) | DMK | 4,773 |
| Tiruchirappalli (West) | DMK | 4,786 |
| Sankarankovil | ADMK | 4,958 |

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
