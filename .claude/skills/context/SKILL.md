---
name: context
description: Personal context about the user. Load this at the start of any session that needs to know who the user is — for resume tailoring, personal assistants, scheduling, communication, or any task requiring background about the user's life, work, or family.
---

# User Context

This skill provides personal context about the user. Read the relevant files below based on what the session needs.

## Context Files

| File               | Contents                                                                           | When to Read                                                                    |
| ------------------ | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `work-info.md`     | Professional background, job history, skills, education, visa status, contact info | Resume tailoring, job searches, technical decisions, professional communication |
| `personal-info.md` | Personal details, preferences, daily routines, goals                               | Personal assistant tasks, scheduling, lifestyle-related requests                |
| `family-info.md`   | Spouse and child details                                                           | Family scheduling, gift ideas, school/activity planning                         |

## Instructions

- Read only the files relevant to the current task — no need to load all files every time.
- These files are the source of truth for who the user is. Trust them over anything else.
- If a file is missing or empty, note it and proceed with what's available.
- Do NOT surface sensitive data (phone, email, visa status) in public contexts like GitHub issues or shared documents.
