---
name: devbot-page-size-guard
description: Enforces the 200-line limit for React components and pages in DevBot mobile. Guides extraction of oversized files into smaller, focused components. Auto-triggers when editing .tsx files in modules/devbot/app/src/pages/.
---

# DevBot Page Size Guard

## When This Skill Activates

Auto-trigger when editing any `.tsx` file in `modules/devbot/app/src/pages/` or `modules/devbot/app/src/components/`.

## Rule

**All React components and pages must be under 200 lines.** This is a non-negotiable project standard.

## Current Violations

| Page                        | Lines | Over By | Priority |
| --------------------------- | ----- | ------- | -------- |
| BabyLogs.tsx                | 2,323 | 2,123   | CRITICAL |
| BabyAnalytics.tsx           | 1,203 | 1,003   | CRITICAL |
| LawnCare.tsx                | 821   | 621     | CRITICAL |
| EventsTimer.tsx             | 500   | 300     | HIGH     |
| InteractiveChatView.tsx     | 497   | 297     | HIGH     |
| PlansPage.tsx               | 419   | 219     | HIGH     |
| InteractiveChatList.tsx     | 341   | 141     | MEDIUM   |
| RemotionVideos.tsx          | 324   | 124     | MEDIUM   |
| SchedulerView.tsx           | 263   | 63      | MEDIUM   |
| ChatView.tsx                | 243   | 43      | LOW      |
| BabyProfileDrawer.tsx       | 333   | 133     | MEDIUM   |
| ChatMessage.tsx             | 251   | 51      | LOW      |
| SchedulerSettingsDrawer.tsx | 203   | 3       | LOW      |

## Extraction Strategy

When a file exceeds 200 lines, extract in this priority order:

### 1. Extract Sub-Components (Most Common)

Move distinct UI sections into their own files:

```
pages/BabyLogs.tsx (2,323 lines)
  -> components/baby/BabyLogList.tsx
  -> components/baby/BabyLogForm.tsx
  -> components/baby/BabyLogFilters.tsx
  -> components/baby/BabyDiaperLog.tsx
  -> components/baby/BabyFeedingLog.tsx
  -> components/baby/BabyGrowthLog.tsx
```

### 2. Extract Hooks (Data Logic)

Move query/mutation logic into custom hooks:

```
pages/InteractiveChatList.tsx
  -> hooks/useInteractiveChats.ts  (queries + mutations)
  -> pages/InteractiveChatList.tsx  (just UI)
```

### 3. Extract Constants & Types

Move to dedicated files:

```
pages/BabyAnalytics.tsx
  -> types/baby-analytics.ts     (interfaces, chart configs)
  -> constants/baby-analytics.ts (color maps, labels)
```

### 4. Extract Utility Functions

Move pure functions out of components:

```
pages/EventsTimer.tsx
  -> lib/timer-utils.ts  (formatTime, calculateDuration)
```

## Suggested Extractions by File

### BabyLogs.tsx (2,323 -> target: 6 files ~150 lines each)

- `components/baby/BabyLogForm.tsx` - Log creation form
- `components/baby/BabyLogFilters.tsx` - Filter bar (type, date, profile)
- `components/baby/BabyLogList.tsx` - Log list with virtual scroll
- `components/baby/DiaperLogEntry.tsx` - Diaper-specific log rendering
- `components/baby/FeedingLogEntry.tsx` - Feeding-specific log rendering
- `hooks/useBabyLogs.ts` - Queries and mutations

### BabyAnalytics.tsx (1,203 -> target: 4 files ~150 lines each)

- `components/baby/FeedingChart.tsx` - Feeding analytics chart
- `components/baby/DiaperChart.tsx` - Diaper analytics chart
- `components/baby/GrowthChart.tsx` - Growth percentile chart
- `components/baby/AnalyticsSummary.tsx` - Summary cards

### LawnCare.tsx (821 -> target: 4 files ~150 lines each)

- `components/lawn/LawnProfileList.tsx` - Profile cards
- `components/lawn/LawnPlanView.tsx` - Plan detail view
- `components/lawn/LawnPlanGenerator.tsx` - Generation UI
- `hooks/useLawnCare.ts` - Queries and mutations

### InteractiveChatView.tsx (497 -> target: 3 files ~150 lines each)

- `components/chat/ChatInput.tsx` - Message input area
- `components/chat/ChatHeader.tsx` - Chat title, actions
- `hooks/useInteractiveChat.ts` - Chat queries and mutations

### PlansPage.tsx (419 -> target: 3 files ~130 lines each)

- `components/plans/PlanList.tsx` - Plan cards list
- `components/plans/PlanForm.tsx` - Create/edit plan form
- `hooks/usePlans.ts` - Plan queries and mutations

## When Adding New Code

If your edit would push a file over 200 lines:

1. **Stop** - Do not continue adding to the file
2. **Extract first** - Move existing code into sub-components/hooks
3. **Then add** - Add your new code to the now-smaller file
4. **Verify** - Ensure the file stays under 200 lines

## Verification Checklist

Before completing edits to page/component files:

- [ ] File is under 200 lines (or extraction plan documented)
- [ ] Each extracted component has a single responsibility
- [ ] Extracted hooks handle all data fetching for their domain
- [ ] Types and constants are in separate files if reused
- [ ] Imports are direct (no barrel exports / double exports)
