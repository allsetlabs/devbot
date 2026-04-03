# DevBot Feature Test Results

Last tested: 2026-03-25

## Interactive Chat API

| #   | Feature                | Endpoint                                               | Status |
| --- | ---------------------- | ------------------------------------------------------ | ------ |
| 1   | Create chat            | POST /api/interactive-chats                            | PASS   |
| 2   | Get single chat        | GET /api/interactive-chats/:id                         | PASS   |
| 3   | Rename chat            | POST /api/interactive-chats/:id/rename                 | PASS   |
| 4   | Change model           | POST /api/interactive-chats/:id/model                  | PASS   |
| 5   | Archive chat           | POST /api/interactive-chats/:id/archive                | PASS   |
| 6   | List archived chats    | GET /api/interactive-chats/archived                    | PASS   |
| 7   | Unarchive chat         | POST /api/interactive-chats/:id/unarchive              | PASS   |
| 8   | Get chat types         | GET /api/interactive-chats/types                       | PASS   |
| 9   | Duplicate chat         | POST /api/interactive-chats/:id/duplicate              | PASS   |
| 10  | Get chat status        | GET /api/interactive-chats/:id/status                  | PASS   |
| 11  | Get messages           | GET /api/interactive-chats/:id/messages                | PASS   |
| 12  | Change permission mode | POST /api/interactive-chats/:id/mode                   | PASS   |
| 13  | Set system prompt      | POST /api/interactive-chats/:id/system-prompt          | PASS   |
| 14  | Set max turns          | POST /api/interactive-chats/:id/max-turns              | PASS   |
| 15  | Delete chat            | DELETE /api/interactive-chats/:id                      | PASS   |
| 16  | Send message           | POST /api/interactive-chats/:id/send                   | PASS   |
| 17  | Stop execution         | POST /api/interactive-chats/:id/stop                   | PASS   |
| 18  | Export markdown        | GET /api/interactive-chats/:id/export?format=markdown  | PASS   |
| 19  | Export JSON            | GET /api/interactive-chats/:id/export?format=json      | PASS   |
| 20  | Export plaintext       | GET /api/interactive-chats/:id/export?format=plaintext | PASS   |

## Commands API

| #   | Feature       | Endpoint          | Status |
| --- | ------------- | ----------------- | ------ |
| 1   | List commands | GET /api/commands | PASS   |

## Scheduler API

| #   | Feature          | Endpoint                     | Status |
| --- | ---------------- | ---------------------------- | ------ |
| 1   | Create scheduler | POST /api/schedulers         | PASS   |
| 2   | Get scheduler    | GET /api/schedulers/:id      | PASS   |
| 3   | Update scheduler | PUT /api/schedulers/:id      | PASS   |
| 4   | Delete scheduler | DELETE /api/schedulers/:id   | PASS   |
| 5   | List runs        | GET /api/schedulers/:id/runs | PASS   |

## Birth Times API

| #   | Feature      | Endpoint                    | Status |
| --- | ------------ | --------------------------- | ------ |
| 1   | Create entry | POST /api/birth-times       | PASS   |
| 2   | List entries | GET /api/birth-times        | PASS   |
| 3   | Update entry | PATCH /api/birth-times/:id  | PASS   |
| 4   | Delete entry | DELETE /api/birth-times/:id | PASS   |

## Plans API

| #   | Feature     | Endpoint              | Status |
| --- | ----------- | --------------------- | ------ |
| 1   | Create plan | POST /api/plans       | PASS   |
| 2   | Get plan    | GET /api/plans/:id    | PASS   |
| 3   | Update plan | PUT /api/plans/:id    | PASS   |
| 4   | Delete plan | DELETE /api/plans/:id | PASS   |
| 5   | Count plans | GET /api/plans/count  | PASS   |

## Sessions API

| #   | Feature       | Endpoint          | Status |
| --- | ------------- | ----------------- | ------ |
| 1   | List sessions | GET /api/sessions | PASS   |

## Other Endpoints

| #   | Feature              | Endpoint                        | Status |
| --- | -------------------- | ------------------------------- | ------ |
| 1   | Weather (with zip)   | GET /api/weather?zip=75035      | PASS   |
| 2   | File browser         | GET /api/files/browse?q=package | PASS   |
| 3   | Remotion videos list | GET /api/remotion-videos        | PASS   |
| 4   | Logs                 | GET /api/logs                   | PASS   |

## Code Cleanup (2026-03-25)

| #   | Area              | Change                                                                                       | Status |
| --- | ----------------- | -------------------------------------------------------------------------------------------- | ------ |
| 1   | Supabase remnants | No Supabase imports in .ts/.tsx files                                                        | CLEAN  |
| 2   | Supabase remnants | PLAN.md updated (Supabase → Drizzle + SQLite)                                                | DONE   |
| 3   | Supabase remnants | files.ts `supabase` in EXCLUDE_DIRS (valid - excludes directory)                             | OK     |
| 4   | Code dedup        | Created `useLocalStorageMap` generic hook                                                    | DONE   |
| 5   | Code dedup        | Refactored `useFavorites` to use `useLocalStorageMap`                                        | DONE   |
| 6   | Code dedup        | Refactored `usePinnedMessages` to use `useLocalStorageMap`                                   | DONE   |
| 7   | Code dedup        | Refactored `useMessageReactions` to use `useLocalStorageMap`                                 | DONE   |
| 8   | Code dedup        | Extracted `ArchivedChatItem` component (removed 2x duplication)                              | DONE   |
| 9   | Code cleanup      | Removed unused dialog import in InteractiveChatList                                          | DONE   |
| 10  | Code dedup        | Created `asyncHandler` wrapper - eliminates try-catch in all routes                          | DONE   |
| 11  | Code dedup        | Applied `asyncHandler` to all 8 route files                                                  | DONE   |
| 12  | Code dedup        | Created `updateChatField` helper in interactive-chat.ts (7 endpoints consolidated)           | DONE   |
| 13  | Code dedup        | Extracted `formatExportStats` + `buildPlaintextExport` + `buildMarkdownExport` helpers       | DONE   |
| 14  | Code dedup        | Created `ListPageHeader` shared component for list pages                                     | DONE   |
| 15  | Code dedup        | Applied `ListPageHeader` to ChatList and SchedulerList                                       | DONE   |
| 16  | Code dedup        | Created `pluginAsyncHandler` + `pluginNotFound` + `pluginBadRequest` in plugins/types.ts     | DONE   |
| 17  | Code dedup        | Applied `pluginAsyncHandler` to all 5 plugin handler files (eliminated ~30 try-catch blocks) | DONE   |
| 18  | Code cleanup      | Fixed incorrect import paths in plugin handlers and routes (types.js path correction)        | DONE   |
| 19  | Supabase remnants | Removed stale backend/dist/ with old Supabase compiled artifacts                             | DONE   |

## UI Browser Tests (2026-03-25)

| #   | Feature              | Status  | Notes                                                                   |
| --- | -------------------- | ------- | ----------------------------------------------------------------------- |
| 1   | Chat list page loads | PASS    | Loads at /chats with filters and sorting                                |
| 2   | Create new chat      | PASS    | "New Chat" button works                                                 |
| 3   | Search/filter chats  | PASS    | URL params update, results filter correctly                             |
| 4   | Search clear         | PASS    |                                                                         |
| 5   | Archive chat         | PASS    | Removes from list, shows in archived count                              |
| 6   | Unarchive chat       | PASS    | Restores to main list                                                   |
| 7   | Delete chat          | PASS    | Permanently removed                                                     |
| 8   | Context menu         | PASS    | Favorites, duplicate, archive, delete all render                        |
| 9   | Send message         | PARTIAL | Message submits but no Claude response (requires Claude CLI on backend) |
| 10  | Sort: A-Z            | PASS    | Alphabetical sort works, URL updates to ?sort=name-asc                  |
| 11  | Sort: Oldest First   | PASS    | Oldest chats at top, URL updates to ?sort=oldest                        |
| 12  | Sort: Running First  | PASS    | Running chats bubble to top, URL updates to ?sort=status                |
| 13  | Favorites toggle     | PASS    | Star icon appears on chat, persists across page loads (localStorage)    |
| 14  | Duplicate chat       | PASS    | Creates "(Copy)" chat, navigates to it                                  |
| 15  | @ file tagging       | PASS    | Autocomplete dropdown shows matching files across all modules           |
| 16  | Slash commands menu  | PASS    | "/" triggers skills dropdown with all available commands                |

## Additional API Tests (2026-03-25)

| #   | Feature               | Endpoint                       | Status | Notes                                                                |
| --- | --------------------- | ------------------------------ | ------ | -------------------------------------------------------------------- |
| 1   | Scheduler rerun       | POST /api/schedulers/:id/rerun | PASS   | Returns 409 when task already running (expected behavior)            |
| 2   | Remotion video list   | GET /api/remotion-videos       | PASS   | Lists all videos                                                     |
| 3   | Remotion video create | POST /api/remotion-videos      | PASS   | Creates with status "generating", requires name + chatId             |
| 4   | File upload           | POST /api/upload               | PASS   | Returns success, path, filename, originalName                        |
| 5   | UI: Pin messages      | Interactive chat view          | PASS   | Pin/unpin toggle, count badge in header, pinned drawer, localStorage |

## Code Cleanup (2026-03-25 - Round 2)

| #   | Area       | Change                                                                                  | Status |
| --- | ---------- | --------------------------------------------------------------------------------------- | ------ |
| 20  | Code dedup | Added `requireString()` helper to route-helpers.ts (replaces ~10 validation blocks)     | DONE   |
| 21  | Code dedup | Added `validateOptionalString()` helper to route-helpers.ts (replaces ~4 update blocks) | DONE   |
| 22  | Code dedup | Added `generateId()` helper to route-helpers.ts (standardizes UUID generation)          | DONE   |
| 23  | Code dedup | Applied `requireString` to plans, schedulers, interactive-chat, sessions (6 instances)  | DONE   |
| 24  | Code dedup | Applied `validateOptionalString` to plans, schedulers (3 instances)                     | DONE   |
| 25  | Code dedup | Applied `generateId` to all 6 route files, fixed plans.ts inconsistent slice(0,12)→8    | DONE   |
| 26  | Code dedup | Removed unused `uuid` imports from 5 route files                                        | DONE   |

## Code Cleanup (2026-03-25 - Round 3)

| #   | Area          | Change                                                                                                 | Status |
| --- | ------------- | ------------------------------------------------------------------------------------------------------ | ------ |
| 27  | Supabase scan | Confirmed zero Supabase imports in .ts/.tsx/.json/.env files                                           | CLEAN  |
| 28  | Supabase scan | Only doc references remain (migration guides, feature test) - intentional                              | OK     |
| 29  | Code dedup    | Added `requireEnum()` helper to route-helpers.ts (replaces inline enum validation)                     | DONE   |
| 30  | Code dedup    | Added `getOneById()` helper to route-helpers.ts (replaces 4x get-by-id boilerplate)                    | DONE   |
| 31  | Code dedup    | Applied `getOneById` to plans, schedulers, sessions, interactive-chat                                  | DONE   |
| 32  | Code dedup    | Applied `requireEnum` to plans (priority, status), schedulers (status), interactive-chat (model, mode) | DONE   |
| 33  | Code dedup    | Extracted `MODE_LABELS` constant in interactive-chat.ts (was duplicated in 2 export fns)               | DONE   |

## Features Not Yet Tested

- Session create/delete (requires tmux)
- Remotion video update/delete
- File upload with chat association (chatId param)
