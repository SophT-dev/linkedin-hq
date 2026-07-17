# Install Guide — The Cold Email Operating System

This takes about two minutes. You're copying ten small folders into the place Claude looks for skills, then restarting Claude so it picks them up. No coding, no dependencies, no account to create.

---

## What you need

- **A Claude client that supports skills** — Claude Code (the CLI) is the primary target. The skill files are plain Markdown, so they also work anywhere you can paste a system prompt (see "No skills directory?" below).
- **Two minutes** and the ability to copy a folder.

---

## Option A — Clone with git (recommended)

```bash
# 1. Clone the repo
git clone https://github.com/bleedailabs/cold-email-operating-system.git
cd cold-email-operating-system

# 2. Make sure your Claude skills directory exists
mkdir -p ~/.claude/skills          # macOS / Linux

# 3. Copy the ten skill folders in
cp -r skills/* ~/.claude/skills/

# 4. Restart Claude Code
```

### Windows (PowerShell)

```powershell
git clone https://github.com/bleedailabs/cold-email-operating-system.git
cd cold-email-operating-system

# Create the skills directory if it doesn't exist
New-Item -ItemType Directory -Force "$HOME\.claude\skills" | Out-Null

# Copy the skill folders in
Copy-Item -Recurse skills\* "$HOME\.claude\skills\"
```

---

## Option B — Download the ZIP (no git)

1. Download **`cold-email-os-skills.zip`** from this repo.
2. Unzip it. You'll get a `skills/` folder with ten subfolders inside.
3. Move those ten subfolders into your Claude skills directory:
   - **macOS / Linux:** `~/.claude/skills/`
   - **Windows:** `%USERPROFILE%\.claude\skills\` (i.e. `C:\Users\<you>\.claude\skills\`)
4. Restart Claude.

After this, your skills directory should look like:

```
~/.claude/skills/
├── 01-icp-definer/SKILL.md
├── 02-list-auditor/SKILL.md
├── 03-account-researcher/SKILL.md
├── ... (through) ...
└── 10-win-logger/SKILL.md
```

---

## Verify the install

Start Claude Code and list your skills (or just ask Claude "what skills do you have?"). You should see the ten cold-email skills. Then run the first one:

> "Run the ICP Definer — interview me about who we actually close and write my ICP file."

If Claude picks up the skill and starts interviewing you, you're installed.

---

## Recommended first run

You don't need all ten working before you get value. Do this in order:

1. **ICP Definer** — build your `ICP.md`. Everything downstream reads it, so do this first. Save the output somewhere the other skills can see it (your project folder, or paste it in when you run them).
2. **Deliverability Sentinel** — run its launch checklist against your current setup. It'll tell you what's unsafe before you send another email.
3. Add the rest one at a time, in pipeline order, as you need them.

---

## Troubleshooting

**Claude doesn't see the skills after install.**
- Confirm the folders landed in the right place: each skill must be at `~/.claude/skills/<name>/SKILL.md`, not nested an extra level deep (a common ZIP mistake is `skills/skills/...`). If you see a double `skills/skills`, move the inner folders up one level.
- Restart the Claude client fully — skills are loaded at startup.

**"I copied `skills/` itself, not its contents."**
- You want the ten `NN-name/` folders directly inside `~/.claude/skills/`, not a single `skills/` folder inside it. Move the contents up one level.

**A skill runs but ignores my ICP.**
- Most skills read your `ICP.md` file. If you haven't run the ICP Definer yet, or the file isn't visible in your session, the skill will say so — run the ICP Definer first and keep its output handy to paste in.

**I'm not using Claude Code — I use the web/desktop app.**
- The skill files are plain Markdown system prompts. Open any `SKILL.md`, copy everything below the frontmatter, and paste it in as your instructions for that task. You lose the one-word invocation, but the process is identical.

**I want to change a skill's rules.**
- Edit the `SKILL.md` directly — that's the whole point of it being a plain file. Change the banned-phrase list in the Opener Writer, the bounce threshold in the Sentinel, the touch count in the Sequence Builder. It's yours now.

**Windows path issues.**
- Use `%USERPROFILE%\.claude\skills\` in Explorer, or `$HOME\.claude\skills\` in PowerShell. If `.claude` is hidden, enable "Show hidden files" in Explorer's View menu.

---

## Uninstall

Delete the ten folders from `~/.claude/skills/` and restart Claude. That's it — nothing else was installed anywhere.

---

Questions or a fix to contribute? Open an issue or a PR on the repo. This is meant to be forked and improved.
