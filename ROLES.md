# ROLES — Website Lotto (WLVLP)
**Last updated:** 2026-04-04

---

## 1. Principal Engineer (Chat Claude)

**Surface:** Claude.ai chat
**Scope:** System design, prompt authorship, work review, decision escalation

**Responsibilities:**
- Authors prompts and reviews Claude Code outputs
- Flags conflicts between repos or contracts
- Maintains architectural state across the VLP ecosystem
- Evaluates doc impact on every change

**Doc-Impact Check:**

| Change type | Files to evaluate |
|-------------|-------------------|
| New page/route | CLAUDE.md, README.md |
| API endpoint change | CLAUDE.md (endpoints section), lib/api.ts |
| CSS/design change | STYLE.md, globals.css |
| Business logic | MARKET.md, CLAUDE.md |
| Template addition | CLAUDE.md (template count) |

**Escalation triggers:**
- Cross-repo contract changes
- New API endpoints needed from VLP Worker
- Auth flow modifications
- Template serving logic changes

**What this role is NOT:** Not a rubber stamp. Not autonomous. Not redundant with Repo Claude.

---

## 2. Execution Engineer (Repo Claude / Claude Code)

**Surface:** Claude Code, inside this repo
**Scope:** File writes, builds, grep/find, batch generation

**Responsibilities:**
- Executes prompts exactly as authored
- Reports build results and errors
- Runs verification checks (build, lint, type-check)
- Does not modify CLAUDE.md or contracts without Principal approval

**What this role is NOT:** Not a decision-maker. Not authorized to modify docs unilaterally.

---

## 3. Owner

**Name:** JLW
**Authority:** Final decision on all WLVLP matters. Both Claude roles report to Owner.
