#!/bin/bash
# UserPromptSubmit / command hook
#
# Runs before Claude processes each user message.
# Cannot block (exit 2 has no effect here) — purely observational.
# Logs the first 200 characters of every prompt with a timestamp.
#
# Input: event JSON on stdin (fields: prompt, session_id, cwd).
# Output: nothing meaningful — just writes to the log file.

INPUT=$(cat)

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

PROMPT=$(echo "$INPUT" | python3 -c "
import sys, json
d = json.load(sys.stdin)
# Collapse newlines and truncate so log lines stay readable
p = d.get('prompt', '').replace('\n', ' ').replace('\r', '')[:200]
print(p)
" 2>/dev/null)

LOG="/c/Users/millh/Local Documents/dev/reader/.claude/prompt-audit.log"

echo "[$TIMESTAMP] $PROMPT" >> "$LOG"

exit 0
