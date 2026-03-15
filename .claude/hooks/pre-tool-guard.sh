#!/bin/bash
# PreToolUse / command hook
#
# Blocks dangerous Bash commands before they execute.
# Exit 2 + stderr message → Claude Code cancels the tool call and shows
# the message to Claude so it can explain the block to the user.
#
# Input: full event JSON on stdin.
# Output: nothing on success (exit 0); stderr + exit 2 to block.

INPUT=$(cat)

TOOL=$(echo "$INPUT" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(d.get('tool_name', ''))
" 2>/dev/null)

# Only inspect Bash commands
[ "$TOOL" != "Bash" ] && exit 0

COMMAND=$(echo "$INPUT" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(d.get('tool_input', {}).get('command', ''))
" 2>/dev/null)

# ── Block 1: force push ──────────────────────────────────────────────────────
if echo "$COMMAND" | grep -qE 'git push.*(--force|-f)'; then
  echo "Blocked: force push. Ask the user to confirm before force-pushing." >&2
  exit 2
fi

# ── Block 2: recursive force delete ─────────────────────────────────────────
if echo "$COMMAND" | grep -qE 'rm\s+.*-[a-zA-Z]*r[a-zA-Z]*f|rm\s+.*-[a-zA-Z]*f[a-zA-Z]*r'; then
  echo "Blocked: rm -rf style command. Confirm destructive deletes with the user first." >&2
  exit 2
fi

# ── Block 3: destructive SQL ─────────────────────────────────────────────────
if echo "$COMMAND" | grep -qiE '\bDROP\s+(DATABASE|TABLE)\b'; then
  echo "Blocked: DROP DATABASE/TABLE detected. Confirm with the user before running." >&2
  exit 2
fi

exit 0
