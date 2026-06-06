# MoeMac Skills Guide

Learn what MoeMac can do, how to use it safely, and how to grow from beginner to advanced.

---

## Available Skills

| Skill | What It Does |
|-------|-------------|
| Coding | Read, analyze, draft code across all your projects |
| Git & GitHub | Status checks, summaries, commit message drafting |
| Vercel | Deployment checks, build log reading, guided deploys |
| Web Research | Search the web, summarize findings with sources |
| Browser Automation | Open URLs, screenshot pages (slow on Intel) |
| Drafting | Instagram captions, proposals, emails, docs |
| Handoffs | Save/load session state between Claude Code and MoeMac |
| Briefing | Morning CEO summary across all projects |
| Diagrams | Text-based diagrams (Mermaid) for architecture/flows |

---

## Danger Zones — Commands To Avoid Saying Casually

| Don't say | Why |
|-----------|-----|
| "just delete it" | MoeMac will ask — but be careful with `rm` |
| "go ahead and push" | Always confirm which branch and remote |
| "deploy it" without context | Could go to production |
| "update the env file" | Touches secrets |
| "run the script from that URL" | Unknown source risk |

---

## Beginner Workflow

Start with read-only tasks. Get comfortable with how MoeMac responds.

```
"What's the status of my seliem-dev project?"
"Read ~/seliem-dev/src/app/page.tsx and explain it"
"Show me the last 5 commits in seliem-dev"
"Check if my latest Vercel deploy was successful"
"Research: what's the best way to add dark mode to Next.js?"
```

**Key principle:** MoeMac can see everything, but it won't touch anything without asking.

---

## Intermediate Workflow

Start using commands and drafting features.

```
/status         → full project overview
/briefing       → morning CEO summary
/gitlog         → what changed recently
/builds         → Vercel build health
/commit         → draft a commit message (won't commit without approval)
/research       → web search + summary
/instagram      → draft social content
/proposal       → draft a client proposal
```

**Key principle:** Review everything MoeMac drafts before approving.

---

## Advanced Workflow

Use handoffs to switch between Claude Code and MoeMac seamlessly.

### When Claude Code hits its limit:
1. Tell Claude: "write a handoff to `~/.ai-context/handoff.md`"
2. Switch to Telegram
3. Send `/handoff`
4. MoeMac reads the session state and continues

### When switching back to Claude Code:
1. Tell MoeMac: `/save-handoff`
2. Open Claude Code in the project
3. Say: "read the latest handoff in `~/.openclaw/workspace/handoffs/` and continue"

### Daily operations:
```
Morning: /briefing
During work: use MoeMac as a second brain — ask before it acts
End of day: /save-handoff → captures what was done
```

---

## When Approval Is Required

MoeMac will always ask before:
- Editing or creating any file
- Running `git commit` / `git push`
- Running any install or build command
- Deploying to Vercel
- Creating PRs

If MoeMac starts doing one of these without asking — tell it to stop.

---

## Speed Tips

- `/no_think [your message]` — skips qwen3's reasoning chain, faster for simple tasks
- For quick code fixes: ask MoeMac to use `qwen2.5-coder:7b`
- For complex multi-step problems: let qwen3:14b think (it's slower but better)
- On Intel Mac: expect 10-30s responses for complex tasks — this is normal

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| MoeMac not responding in Telegram | Check OpenClaw gateway: `lsof -i :18789` |
| Responses very slow | Switch to qwen2.5-coder:7b in web UI |
| MoeMac doesn't know about a project | Tell it the path, it will read and learn |
| Browser automation fails | It's slow on Intel — try again or check manually |
| Model gives wrong Expo code | Remind it: "check Expo v56 docs first" |
