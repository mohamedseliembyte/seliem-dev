# MoeMac — Full Setup Documentation

Personal AI operations assistant for Mohamed Seliem, running locally on MoeMac.

---

## Architecture

```
Telegram (mobile) ──┐
Web UI (browser) ───┤──► OpenClaw Gateway (port 18789)
                    │         │
                    │    MoeMac Agent (qwen3:14b)
                    │         │
                    │    ~/.openclaw/workspace/
                    │         ├── MEMORY.md
                    │         ├── AGENTS.md (rules)
                    │         ├── handoffs/
                    │         └── skills/
                    │
                    └──► ~/.ai-context/ (shared with Claude Code)
                              ├── handoff.md
                              ├── projects.md
                              └── decisions.md
```

---

## Installed Tools

| Tool | Version | Status |
|------|---------|--------|
| OpenClaw | 2026.6.1 | Running |
| Ollama | latest | Running |
| qwen3:14b | 9.3 GB | Primary model |
| qwen3:8b | 5.2 GB | Fallback |
| qwen2.5-coder:7b | 4.7 GB | Fast coding fallback |
| Git | 2.50.1 | Installed |
| GitHub CLI (gh) | 2.92.0 | Authenticated |
| Vercel CLI | 54.4.1 | Authenticated |
| Node.js | 20.20.2 | via nvm |
| Mermaid CLI | latest | Installed |

---

## Model Setup

Primary: `ollama/qwen3:14b`
Config: `~/.openclaw/openclaw.json` → `agents.defaults.model.primary`

| Model | Use case | Speed |
|-------|----------|-------|
| qwen3:14b | Complex reasoning, planning, debugging | Slow (~20-30s) |
| qwen3:8b | General tasks, summaries | Medium (~10-15s) |
| qwen2.5-coder:7b | Fast coding, quick answers | Fast (~5-8s) |

Switch models in the web UI at `http://localhost:18789`

---

## Telegram Setup

- Bot name: `@moemoney_openclaw_bot`
- Owner Telegram ID: `6603573201`
- Mode: Direct messages only (groups require @mention)

### Registered Commands
| Command | Action |
|---------|--------|
| `/handoff` | Load latest session handoff |
| `/save-handoff` | Save current session state |
| `/status` | Full project + deployment status |
| `/briefing` | Morning CEO summary |
| `/deploy` | Guided Vercel deploy (approval required) |
| `/instagram` | Draft Instagram content |
| `/proposal` | Draft client proposal |
| `/builds` | Check Vercel build status |
| `/gitlog` | Git changes across all repos |
| `/screenshot` | Screenshot seliem.dev |
| `/commit` | Draft commit message |
| `/research` | Web search + summary |

---

## GitHub Setup

- CLI: `gh` v2.92.0
- Account: `mohamedseliembyte`
- Auth: keyring (token scopes: repo, workflow, gist, read:org)
- Check: `gh auth status`

---

## Vercel Setup

- CLI: `vercel` v54.4.1
- Account: `mohamedseliemdev-6811`
- Check: `vercel whoami`

| Project | URL |
|---------|-----|
| seliem-dev | https://seliem.dev |
| mp4-deploy | https://mp4-deploy-nine.vercel.app |
| mp4-study | https://bio-study-guide.vercel.app |
| landing | https://landing-theta-gilt.vercel.app |

---

## Approval Rules

### Free (no approval)
Read files, git status/log/diff, gh read commands, vercel ls/inspect/logs, drafting, web research

### Requires approval
File edits/creation, git add/commit/push, npm install, builds, vercel deploy, PR creation, cron jobs

### Never (same-message explicit approval only)
File deletion, .env edits, printing secrets, social media posting, production deploys without confirmation, rm -rf, unknown scripts

---

## Handoff Workflow (Claude Code ↔ MoeMac)

**Claude Code → MoeMac:**
1. "Write a handoff to `~/.ai-context/handoff.md`"
2. Telegram: `/handoff`

**MoeMac → Claude Code:**
1. `/save-handoff`
2. Open Claude Code: "read the latest handoff in `~/.openclaw/workspace/handoffs/`"

**Handoff files:**
- `~/.openclaw/workspace/handoffs/` — full history
- `~/.ai-context/handoff.md` — shared bridge

---

## Useful Commands

```bash
# Check OpenClaw is running
lsof -i :18789

# Check models
ollama list

# Check GitHub auth
gh auth status

# Check Vercel auth
vercel whoami

# View all Vercel projects
vercel project ls

# View seliem-dev recent deploys
vercel ls --scope mohamedseliemdev-6811 | head -5
```

---

## Start / Stop OpenClaw

OpenClaw runs as a launchd service (starts on login automatically).

```bash
# Check if running
lsof -i :18789

# Restart: quit and reopen OpenClaw from Applications
# Or from terminal:
launchctl stop ai.openclaw.gateway
launchctl start ai.openclaw.gateway
```

Web UI: `http://localhost:18789` (requires gateway token from `~/.openclaw/openclaw.json`)

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Bot not responding | Check gateway: `lsof -i :18789` — restart OpenClaw if not listed |
| Model slow | Switch to qwen2.5-coder:7b in web UI for fast tasks |
| Ollama not running | Run `ollama serve` in terminal |
| Vercel not auth'd | Run `vercel login` |
| GitHub not auth'd | Run `gh auth login` |
| Browser automation fails | Expected on Intel — slow or unavailable |
| Wrong Expo code | Say: "check https://docs.expo.dev/versions/v56.0.0/ first" |

---

## File Locations

| File | Purpose |
|------|---------|
| `~/.openclaw/openclaw.json` | Main config (model, plugins, gateway, Telegram) |
| `~/.openclaw/workspace/MEMORY.md` | Long-term memory |
| `~/.openclaw/workspace/AGENTS.md` | Behavior rules + all commands |
| `~/.openclaw/workspace/IDENTITY.md` | MoeMac name and personality |
| `~/.openclaw/workspace/SOUL.md` | Core operating principles |
| `~/.openclaw/workspace/HEARTBEAT.md` | Proactive check tasks |
| `~/.openclaw/workspace/TOOLS.md` | Project registry + CLI references |
| `~/.openclaw/workspace/handoffs/` | Session handoff history |
| `~/.openclaw/workspace/skills/` | Skill reference files |
| `~/.ai-context/handoff.md` | Shared bridge with Claude Code |
| `~/.claude/CLAUDE.md` | Claude Code global config |
