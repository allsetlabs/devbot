# TVK Election Data — ECI Website Guide

Read this file **before every data refresh run**. It documents the official ECI website structure, URLs, and selectors needed to pull Tamil Nadu 2026 TVK election data.

---

## Official Website

**Base URL:** `https://results.eci.gov.in/ResultAcGenMay2026/`

| Page | URL | Purpose |
|------|-----|---------|
| Tamil Nadu party summary | `partywiseresult-S22.htm` | All-party seat totals (Won + Leading + Total) |
| TVK constituency leads | `partywiseleadresult-3679S22.htm` | All 78 TVK leading seats with margins |
| Individual constituency | `candidateswise-S22{N}.htm` | Candidate details for constituency number N |
| Tamil Nadu main page | `index.htm` | Home with map + party tabs |

**Party code:** `3679` (Tamilaga Vettri Kazhagam)  
**State code:** `S22` (Tamil Nadu)  
**Last fetched:** May 4, 2026 (final counting round — 46W+61L=107)

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

## All 234 Constituencies Scrape (JS — run from any ECI tab)

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

## Data Reference (as of May 4, 2026 — FINAL round)

### Party-wise totals

| Party | Won | Leading | Total |
|-------|-----|---------|-------|
| TVK | 46 | 61 | **107** |
| DMK | 20 | 41 | 61 |
| ADMK | 18 | 27 | 45 |
| PMK | 2 | 3 | 5 |
| INC | 1 | 4 | 5 |
| IUML | 1 | 1 | 2 |
| CPI | 1 | 1 | 2 |
| VCK | 0 | 2 | 2 |
| CPI(M) | 1 | 1 | 2 |
| BJP | 1 | 0 | 1 |
| DMDK | 0 | 1 | 1 |
| AMMK | 1 | 0 | 1 |
| **Total** | **93** | **143** | **234** |

**Key changes from previous snapshot (38W+70L=108):**
- TVK: 38→46 Won, 70→61 Leading, **total dropped 108→107** (Yercaud flip)
- Yercaud FLIPPED: was TVK+312 leading → now ADMK+2119 (major swing!)
- Tirukkoyilur now at TVK+69 (was 254) — most extreme risk remaining
- Thirumayam settled at DMK+1539 (was showing DMK+3 in early rounds — was a counting artifact)
- DMK: 62→61, ADMK: 43→45, DMK Alliance: 75→74
- Sholavandan, Tiruvadanai declared Won (no longer in leading page)

### TVK margin summary (108 seats total — statewise data incl. won)

| Margin Range | Seats |
|-------------|-------|
| < 1,000 | 5 |
| 1K – 3K | 9 |
| 3K – 5K | 5 |
| 5K – 10K | 13 |
| 10K – 20K | 33 |
| > 20K | 43 |
| **Total** | **108** |

### TVK 10 most at-risk wins (smallest leading margins — 61 still-leading seats)

| Constituency | Margin | Status | Risk |
|-------------|--------|--------|------|
| Tirukkoyilur | 69 | 22/24 | Extreme |
| Polur | 316 | 12/22 | Extreme |
| Kumbakonam | 432 | 20/22 | Extreme |
| Kulithalai | 560 | 19/21 | High |
| Kallakurichi | 798 | — | Medium |
| Srivaikuntam | 1,186 | — | Medium |
| Cumbum | 1,421 | — | Medium |
| Manapparai | 1,426 | 26/26 | Locked |
| Usilampatti | 1,617 | 24/25 | Medium |
| Modakkurichi | 2,430 | — | Low |

### Close losses (TVK lost by < 5K, 28 seats)

| Constituency | Winner | Margin |
|-------------|--------|--------|
| Tiruvannamalai | DMK | 646 |
| Palani | ADMK | 753 |
| Kovilpatti | DMK | 962 |
| Udhagamandalam | BJP | 976 |
| Dindigul | DMK | 1,131 |
| Karur | ADMK | 1,340 |
| Thirumayam | DMK | 1,539 |
| Papanasam | IUML | 1,733 |
| Tiruppattur | DMK | 1,738 |
| Pudukkottai | DMK | 2,031 |
| Yercaud | ADMK | 2,119 |
| Tittakudi | DMK | 2,190 |
| Coimbatore (South) | DMK | 2,271 |
| Kilvelur | CPI(M) | 2,278 |
| Vriddhachalam | DMDK | 2,387 |
| Sholingur | PMK | 2,475 |
| Melur | INC | 2,724 |
| Lalgudi | ADMK | 2,739 |
| Colachal | INC | 2,943 |
| Vaniyambadi | IUML | 2,982 |
| Vikravandi | PMK | 3,046 |
| Killiyoor | INC | 3,285 |
| Paramakudi | DMK | 3,548 |
| Aruppukkottai | DMK | 3,885 |
| Viluppuram | DMK | 4,119 |
| Bargur | ADMK | 4,182 |
| Tiruchirappalli (West) | DMK | 4,786 |
| Rishivandiyam | DMK | 4,997 |

### Who beats TVK (75 seats where TVK is 2nd)

| Party | Seats |
|-------|-------|
| DMK | 37 |
| ADMK | 23 |
| INC | 4 |
| PMK | 4 |
| CPI(M) | 2 |
| IUML | 2 |
| CPI | 1 |
| BJP | 1 |
| DMDK | 1 |
| **Total** | **75** |

### TVK seat category breakdown

| Category | Count |
|----------|-------|
| Won (Final) | 46 |
| Safe Lead (>5K) | 43 |
| Close Lead (<5K) | 19 |
| Close Loss (<5K) | 28 |
| Not Competitive | 98 |
| **Total** | **234** |

---

## Steps for future data refresh

1. **Read this file** (`tvk info.md`)
2. Open Chrome tab → navigate to `https://results.eci.gov.in/ResultAcGenMay2026/partywiseresult-S22.htm`
3. Use JS `document.querySelectorAll('table tbody tr')` → parse party totals (cells[0..3])
4. Navigate to `https://results.eci.gov.in/ResultAcGenMay2026/partywiseleadresult-3679S22.htm`
5. Use JS (see above) → parse all margins, sort ascending
6. Run the async fetch loop (12 pages) for close loss data
7. Compare changed values against data in `TvkElectionCharts.tsx`, `TvkCloseRaceCharts.tsx`, `TvkInsightCharts.tsx`, and `TvkElection.tsx`
8. Update all data constants in those 4 files
9. Run `npm run type-check` from `app/`
10. Navigate to `https://localhost:4005/tvk` in Chrome and verify charts render
11. Update this file with new data
12. Commit on current branch

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
