# AI Agent Operating Guidelines & Fast-Path Protocol

> **CRITICAL DIRECTIVE**: To eliminate token waste and prevent redundant exploratory scans, **NEVER** run broad codebase scans, recursive directory dumps, or brute-force Docker inspection before checking the documented System Map.

---

## 1. The Fast-Path Rule (Order of Operations)

Whenever a task, bug report, or feature request is received:

1. **Step 1 — Read the Lean System Map First**:
   - Always read `docs/SYSTEM_MAP.md` or `PROJECT.md` before executing any exploratory commands (`find`, `grep`, `docker ps`, `dir /s`, or multi-file inspections).
   - Use the mapped container names, paths, workflow IDs, and environment parameters directly.

2. **Step 2 — Never Dump Entire Codebases or Tables**:
   - **For VPS / Docker**: Never run unbounded `docker logs` or read entire SQLite/Postgres tables. Use the targeted 1-line SQL queries and specific container commands documented in `docs/SYSTEM_MAP.md`.
   - **For Local Code**: Target specific functions and files identified in the System Map. Do not read files longer than 200 lines in full if only a single function is relevant.

3. **Step 3 — Document Fixes Upon Completion**:
   - Whenever a bug is resolved or a new service/workflow is introduced, update `docs/SYSTEM_MAP.md` or the corresponding Runbook immediately with the exact resolution, IDs, and tested command.

---

## 2. Quick Reference Pointers
- **Architecture & Service Index**: [`docs/SYSTEM_MAP.md`](./docs/SYSTEM_MAP.md)
- **Master Project Documentation & Changelog**: [`PROJECT.md`](./PROJECT.md)
- **Known Credentials & Secrets Registry**: Refer to the path specified in `docs/SYSTEM_MAP.md` (do not hardcode sensitive credentials in public git commits).
