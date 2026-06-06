# OpenClaw Setup — Seliem.dev Workflow

Complete guide to Mohamed's AI assistant setup, context handoff, and safe operations.

---

## Overview

**OpenClaw** is a local AI agent running Ollama models. It serves as the primary fallback when Claude Code hits its context limit.

**Context bridge:** Both Claude Code and OpenClaw share `~/.ai-context/` for session handoffs.

---

## Start / Stop OpenClaw

OpenClaw runs as a background daemon. Check the system tray or use:

```bash
# Check if gateway is running
lsof -i :18789

# The gateway auto-starts on login via launchd
# To restart it, quit and relaunch from Applications
```

---

## Access Points

| Interface | URL / Method |
|-----------|-------------|
| Web UI | http://localhost:18789 |
| Telegram | Message your bot directly |
| TUI | Run `openclaw` in terminal |

---

## Active Models

| Model | Size | Use |
|-------|------|-----|
| `qwen3:14b` | ~9.3 GB | **Primary** — best reasoning + coding |
| `qwen3:latest` (8.2B) | 5.2 GB | Fallback if 14b is slow |
| `qwen2.5-coder:7b` | 4.7 GB | Fast coding fallback |

Switch models in the web UI at http://localhost:18789

---

## Telegram Commands

Send these to your bot from Telegram:

| Command | What It Does |
|---------|-------------|
| `/handoff` | Pick up from last Claude Code session |
| `/status` | Git + Vercel status across all projects |
| `/briefing` | Morning CEO summary |
| `/deploy` | Guided Vercel deployment (with approval) |

### Setting Up the /handoff Button in Telegram
To make `/handoff` appear as a persistent button in Telegram:

1. Open Telegram → search **@BotFather**
2. Send: `/mybots`
3. Select your bot
4. Tap **Edit Bot** → **Edit Commands**
5. Paste this block:
```
handoff - Pick up from last Claude Code session
status - Check all project + deployment status
briefing - Morning CEO briefing
deploy - Deploy to production (requires approval)
```
6. Save — the commands now appear as a menu button in your chat

---

## Context Handoff (Claude Code ↔ OpenClaw)

### Files
```
~/.ai-context/
  handoff.md      ← active session state
  projects.md     ← all project metadata
  decisions.md    ← standing architectural decisions
```

### Claude Code → OpenClaw
When Claude Code approaches its limit:
1. Tell Claude: *"write a handoff to ~/.ai-context/handoff.md"*
2. In Telegram, send: `/handoff`
3. OpenClaw reads the handoff and continues

### OpenClaw → Claude Code
When switching back:
1. Tell OpenClaw: *"write a handoff summary"*
2. Open Claude Code in your project folder
3. Say: *"read ~/.ai-context/handoff.md and continue"*

---

## GitHub Setup

Already configured:
- `gh` CLI authenticated as `mohamedseliembyte`
- Scopes: repo, workflow, gist, read:org

```bash
# Check auth
gh auth status

# View repo
gh repo view mohamedseliembyte/seliem-dev

# Recent workflow runs
gh run list --repo mohamedseliembyte/seliem-dev --limit 5
```

**Safe operations (no approval needed):** `git status`, `git log`, `git diff`, `gh` read commands

**Require approval:** `git commit`, `git push`, `git reset --hard`

---

## Vercel Setup

Already configured:
- `vercel` CLI authenticated as `mohamedseliemdev-6811`
- `seliem-dev` project linked to https://seliem.dev

```bash
# Check projects
vercel project ls

# Check latest deployment
vercel inspect $(vercel ls --scope mohamedseliemdev-6811 2>/dev/null | grep seliem-dev | awk '{print $2}' | head -1)

# Deploy (REQUIRES EXPLICIT APPROVAL)
vercel --prod
```

---

## Safe Usage Rules

### Always OK (no approval)
- Reading files, running `git status / log / diff`
- `gh` read commands
- `vercel project ls`, `vercel inspect`
- Running dev server (`npm run dev`)
- Web searches

### Always Ask First
- `git commit` — "Commit with message: [X]?"
- `git push` — "Push to origin/main?"
- `vercel --prod` — "Deploy to production?"
- `npm install <pkg>` — "Install [pkg]?"
- File deletion — "Delete [file]?"
- Editing `.env*` files

### Never
- Auto-push without approval
- Expose API keys or tokens in output
- Commit `.env` files
- Delete files without confirmation

---

## Troubleshooting

**OpenClaw not responding in Telegram:**
1. Check gateway: `lsof -i :18789`
2. Restart OpenClaw from Applications
3. Verify bot token in `~/.openclaw/openclaw.json`

**Model too slow:**
- Switch from `qwen3:14b` to `qwen3:latest` in web UI
- For fast coding tasks: use `qwen2.5-coder:7b`

**Ollama not running:**
```bash
ollama serve
ollama list
```

**Vercel CLI not authenticated:**
```bash
vercel login
vercel link  # run inside project folder
```

**GitHub CLI not authenticated:**
```bash
gh auth login
```

---

## File Locations

| File | Purpose |
|------|---------|
| `~/.openclaw/openclaw.json` | Main OpenClaw config |
| `~/.openclaw/workspace/AGENTS.md` | Agent behavior rules |
| `~/.openclaw/workspace/USER.md` | User profile |
| `~/.openclaw/workspace/TOOLS.md` | Project registry + CLI tools |
| `~/.ai-context/handoff.md` | Session handoff state |
| `~/.ai-context/projects.md` | Project metadata |
| `~/.ai-context/decisions.md` | Standing decisions |
| `~/.claude/CLAUDE.md` | Claude Code global config |
