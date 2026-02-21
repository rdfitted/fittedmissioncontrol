# Agent Panel Fix - Summary

## Problem
Mission Control was only showing 1 agent (Hex/main) instead of all 12 agents because the API routes were looking in the old `~/.clawdbot/` directory, but OpenClaw has moved to `~/.openclaw/`.

## Root Cause
Hard-coded paths in:
- `src/app/api/agents/route.ts`
- `src/app/api/agents/[id]/sessions/route.ts`

## Changes Made

### 1. `src/app/api/agents/route.ts`
Added `getClawdirPaths()` helper function that:
- Tries `~/.openclaw/` first, falls back to `~/.clawdbot/`
- Tries `openclaw.json` first, then `clawdbot.json`
- Returns correct paths for agents directory

Updated `GET()` function to use dynamic paths instead of hardcoded ones.

### 2. `src/app/api/agents/[id]/sessions/route.ts`
Added `getAgentsDir()` helper function that:
- Tries `~/.openclaw/agents` first
- Falls back to `~/.clawdbot/agents` if not found

Updated `GET()` function to use dynamic path resolution.

## Backward Compatibility
✅ If someone still has `.clawdbot/`, the code will fall back to that directory
✅ Supports both `openclaw.json` and `clawdbot.json` config formats

## Verification
- ✅ Build passes: `npm run build`
- ✅ All 12 agents present in `~/.openclaw/agents/`:
  - main (Hex)
  - knox
  - vault
  - aria
  - scout
  - rigor
  - sterling
  - pulse
  - reach
  - iris
  - recon
  - slate
- ✅ Config file `openclaw.json` contains all agent definitions

## Expected Result
The agent panel sidebar should now show all 12 agents with their correct:
- Names
- Roles (from SOUL.md)
- Status (active/idle/stale based on session timestamps)
- Model assignments
- Reporting hierarchy

## Next Steps
Start the dev server and verify the agent panel displays all 12 agents:
```bash
npm run dev
```
Navigate to http://localhost:3000 and check the left sidebar.
