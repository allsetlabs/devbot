# TVK Election Data — ECI Website Guide

Read this file **before every data refresh run**. It documents the official ECI website structure, URLs, and selectors needed to pull Tamil Nadu 2026 TVK election data.

---

## Official Website

**Base URL:** `https://results.eci.gov.in/ResultAcGenMay2026/`

| Page | URL | Purpose |
|------|-----|---------|
| Tamil Nadu party summary | `partywiseresult-S22.htm` | All-party seat totals (Won + Leading + Total) |
| All constituencies (pg 1–12) | `statewiseS221.htm` … `statewiseS2212.htm` | Full 234-seat matrix with margins |
| TVK won seats | `partywisewinresult-3679S22.htm` | All TVK declared wins |
| TVK leading seats | `partywiseleadresult-3679S22.htm` | TVK leading seats still counting |
| Individual constituency | `candidateswise-S22{N}.htm` | Candidate details for constituency number N |
| Vote share | `voteshareresult-S22.htm` | Party vote % breakdown |
| Tamil Nadu main page | `index.htm` | Home with map + party tabs |

**Party code:** `3679` (Tamilaga Vettri Kazhagam)  
**State code:** `S22` (Tamil Nadu)  
**Last fetched:** May 4, 2026 (8:00 PM final — 69W+37L=106)

---

## Party-wise Summary Page (`partywiseresult-S22.htm`)

### Page structure
```
main > table
  Row: Party | Won | Leading | Total
```

### How to read
- JS: `document.querySelectorAll('table tbody tr')` → cells[0]=Party, cells[1]=Won, cells[2]=Leading, cells[3]=Total
- TVK row text: "Tamilaga Vettri Kazhagam - TVK"
- TVK constituency link: `partywiseleadresult-3679S22.htm`

---

## TVK Constituency Leads Page (`partywiseleadresult-3679S22.htm`)

### Page structure
```
main > table
  Columns: S.No | Constituency (link) | Leading Candidate | Total Votes | Margin | Status
  Footer: "Last Updated at HH:MM PM On DD/MM/YYYY"
```

### JS to extract all margin data
```js
const rows = document.querySelectorAll('table tbody tr');
const data = [];
rows.forEach(row => {
  const cells = row.querySelectorAll('td');
  if (cells.length >= 5) {
    const name = cells[1]?.textContent.trim();
    const margin = parseInt(cells[4]?.textContent.trim().replace(/,/g,''));
    const status = cells[5]?.textContent.trim();
    if(name && !isNaN(margin)) data.push({name, margin, status});
  }
});
data.sort((a,b)=>a.margin-b.margin);
```

---

## All 234 Constituencies Scrape (VERIFIED JS — run from ECI tab)

The statewiseS22*.htm pages use nested tables inside each `<td>` for party names.
Use `:scope > td` to avoid matching nested `<td>` elements.

```js
(async () => {
  function extractRows(doc) {
    const table = doc.querySelector('table');
    if (!table) return [];
    return Array.from(table.querySelectorAll('tr')).filter(r => {
      const tds = r.querySelectorAll(':scope > td');
      return tds.length >= 8 && /^[A-Z]/.test(tds[0]?.textContent?.trim() || '');
    }).map(row => {
      const tds = row.querySelectorAll(':scope > td');
      const getParty = (td) => td?.querySelector('table td:first-child')?.textContent?.trim() || '';
      return {
        constituency: tds[0]?.textContent?.trim(),
        no: tds[1]?.textContent?.trim(),
        leadingParty: getParty(tds[3]),   // nested table in td[3]
        trailingParty: getParty(tds[5]),  // nested table in td[5]
        margin: parseInt(tds[6]?.textContent?.trim()) || 0,  // td[6] = margin
        status: tds[8]?.textContent?.trim()  // td[8] = "Result Declared" | "Result in Progress"
      };
    });
  }
  const pages = [1,2,3,4,5,6,7,8,9,10,11,12];
  const all = await Promise.all(pages.map(async p => {
    const r = await fetch(`https://results.eci.gov.in/ResultAcGenMay2026/statewiseS22${p}.htm`);
    return extractRows(new DOMParser().parseFromString(await r.text(), 'text/html'));
  }));
  const flat = all.flat();
  window._electionData = flat;
  const TVK = 'Tamilaga Vettri Kazhagam';
  const tvkLeading = flat.filter(r => r.leadingParty === TVK);
  const tvkTrailing = flat.filter(r => r.trailingParty === TVK);
  const tvkClose = tvkTrailing.filter(r => r.margin > 0 && r.margin < 5000).sort((a,b) => a.m-b.m);
  return JSON.stringify({ total: flat.length, tvkLeading: tvkLeading.length, tvkTrailing: tvkTrailing.length, tvkClose: tvkClose.length });
})()
```

**Cell index reference for statewiseS22*.htm rows:**
- `tds[0]` = Constituency name
- `tds[1]` = Constituency number
- `tds[2]` = Leading candidate name
- `tds[3]` = Leading party (nested table — use `querySelector('table td:first-child')`)
- `tds[4]` = Trailing candidate name
- `tds[5]` = Trailing party (nested table — use `querySelector('table td:first-child')`)
- `tds[6]` = Margin (integer string)
- `tds[7]` = Round (e.g. `27/31`)
- `tds[8]` = Status (`Result Declared` or `Result in Progress`)

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

---

## Data Reference (as of May 4, 2026 — 8:00 PM FINAL)

### Party-wise totals

| Party | Won | Leading | Total |
|-------|-----|---------|-------|
| TVK | 69 | 37 | **106** |
| DMK | 35 | 24 | 59 |
| ADMK | 28 | 19 | 47 |
| PMK | 2 | 3 | 5 |
| INC | 2 | 3 | 5 |
| IUML | 2 | 0 | 2 |
| CPI | 1 | 1 | 2 |
| VCK | 1 | 1 | 2 |
| CPI(M) | 2 | 0 | 2 |
| BJP | 1 | 0 | 1 |
| DMDK | 1 | 1 | 2 |
| AMMK | 1 | 0 | 1 |
| **Total** | **145** | **89** | **234** |

**DMK Alliance:** DMK(59)+INC(5)+VCK(2)+CPI(2)+CPI(M)(2)+IUML(2) = **72**

**Key changes from 7:33 PM round:**
- TVK: 62→69 Won, 45→37 Leading, total 107→**106** (lost Polur!)
- **Polur FLIPPED:** was TVK+258 → now DMDK+67 (riskiest TVK win → TVK loss)
- Kumbakonam TVK+535 is now the riskiest TVK win
- DMDK now has 2 seats (was 1) — won Polur
- DMK: 58→59 (+1), ADMK: 48→47 (-1)
- DMK Alliance: 71→72

### TVK margin summary (106 seats — 8:00 PM)

| Margin Range | Seats |
|-------------|-------|
| < 1,000 | 5 |
| 1K – 3K | 8 |
| 3K – 5K | 5 |
| 5K – 10K | 11 |
| 10K – 20K | 34 |
| > 20K | 43 |
| **Total** | **106** |

### TVK 10 most at-risk wins (slimmest leading margins — 37 still-leading seats)

| Constituency | Trailing Party | Margin | Risk |
|-------------|---------------|--------|------|
| Kumbakonam | DMK | 535 | Extreme |
| Kulithalai | DMK | 560 | Extreme |
| Cumbum | DMK | 751 | Extreme |
| Kallakurichi | ADMK | 798 | Extreme |
| Manamadurai | DMK | 895 | High |
| Srivaikuntam | ADMK | 1,186 | High |
| Manapparai | ADMK | 1,426 | Medium |
| Usilampatti | ADMK | 1,805 | Medium |
| Modakkurichi | BJP | 2,430 | Low |
| Tiruvadanai | INC | 2,513 | Low |

### Close losses (TVK lost by < 5K, 29 seats — full list)

| Constituency | Winner | Margin |
|-------------|--------|--------|
| Polur | DMDK | 67 |
| Sholingur | PMK | 146 |
| Tirukkoyilur | ADMK | 161 |
| Vikravandi | PMK | 668 |
| Palani | ADMK | 693 |
| Kovilpatti | DMK | 843 |
| Udhagamandalam | BJP | 976 |
| Papanasam | IUML | 1,065 |
| Tiruppattur | DMK | 1,127 |
| Dindigul | DMK | 1,131 |
| Karur | ADMK | 1,340 |
| Killiyoor | INC | 1,428 |
| Thirumayam | DMK | 1,492 |
| Pudukkottai | DMK | 1,867 |
| Yercaud | ADMK | 2,189 |
| Coimbatore (South) | DMK | 2,271 |
| Kilvelur | CPI(M) | 2,278 |
| Vriddhachalam | DMDK | 2,387 |
| Tittakudi | DMK | 2,541 |
| Tiruvannamalai | DMK | 2,595 |
| Melur | INC | 2,724 |
| Lalgudi | ADMK | 2,739 |
| Colachal | INC | 2,748 |
| Vaniyambadi | IUML | 2,982 |
| Paramakudi | DMK | 3,548 |
| Viluppuram | DMK | 4,119 |
| Bargur | ADMK | 4,536 |
| Tiruchirappalli (West) | DMK | 4,786 |
| Aruppukkottai | DMK | 4,943 |

### Close losses by party (29 total)

| Party | Seats |
|-------|-------|
| DMK | 12 |
| ADMK | 6 |
| INC | 3 |
| PMK | 2 |
| IUML | 2 |
| DMDK | 2 |
| CPI(M) | 1 |
| BJP | 1 |

### Who beats TVK (76 seats where TVK is 2nd)

| Party | Seats |
|-------|-------|
| DMK | 37 |
| ADMK | 24 |
| INC | 4 |
| PMK | 3 |
| CPI(M) | 2 |
| IUML | 2 |
| DMDK | 2 |
| CPI | 1 |
| BJP | 1 |
| **Total** | **76** |

### TVK seat category breakdown

| Category | Count |
|----------|-------|
| Won (Final, Result Declared) | 69 |
| Safe Lead >5K (in progress) | 19 |
| Close Lead <5K (in progress) | 18 |
| Close Loss <5K | 29 |
| Not Competitive (≥5K trailing or not in top 2) | 99 |
| **Total** | **234** |

---

## Steps for future data refresh

1. **Read this file** (`tvk info.md`) — get current baselines
2. Open Chrome tab → navigate to `https://results.eci.gov.in/ResultAcGenMay2026/partywiseresult-S22.htm`
3. Check the "Last Updated" timestamp in the footer — if unchanged, no update needed
4. Read party totals from the table on that page (TVK Won/Leading/Total row)
5. Open Chrome DevTools console on that tab and run the **verified** async fetch script (see above) to get all 234 constituency results
6. From the extracted data, calculate:
   - TVK leading count and trailing count
   - Close losses (margin < 5K, sorted ascending)
   - Wins at risk (TVK leading, margin < 5K, sorted ascending)
   - Beater party counts (all 76 trailing seats)
   - Margin distribution (<1K, 1K-3K, 3K-5K, 5K-10K, 10K-20K, >20K)
7. Compare all changed values against existing constants in the 4 source files
8. Update all 4 files (see table below)
9. Update the Data Reference section in this file
10. Run `npm run type-check && npm run lint` from `app/`
11. Navigate to `https://localhost:4005/tvk` in Chrome and verify charts render
12. Commit on current branch (do NOT push)

---

## Files to update each run

| File | What changes |
|------|-------------|
| `app/src/components/TvkElectionCharts.tsx` | TVK_WIN_STATUS, TVK_MARGIN_DIST, ALL_PARTIES, TVK_WINS_AT_RISK |
| `app/src/components/TvkCloseRaceCharts.tsx` | TVK_STATUS, TVK_CLOSE_LOSSES, WHO_BEATS_TVK |
| `app/src/components/TvkInsightCharts.tsx` | ALLIANCE_DATA, ALLIANCE_PIE, CLOSE_LOSS_BY_PARTY, What-If data |
| `app/src/pages/TvkElection.tsx` | TVK_SEATS, TVK_NOT_COMPETITIVE, banner text, data notes |

---

## Navigation buttons on ECI site

| Element | Action |
|---------|--------|
| "Hindi" link in nav | Toggle language (avoid — breaks parsing) |
| "Refresh" link in nav | Reloads page with latest data |
| Constituency links in table | Go to candidate-wise result for that seat |
| "Party Wise Results – View Full Details" link | Party vote share breakdown |
| "All Constituencies at a glance >" | Full matrix view of all 234 seats |
