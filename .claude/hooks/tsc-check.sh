#!/bin/bash
# Runs tsc --noEmit after edits to TypeScript files.
# Called by Claude Code PostToolUse hook for Edit and Write tools.

file=$(python3 -c "import os,json; d=json.loads(os.environ.get('CLAUDE_TOOL_INPUT','{}')); print(d.get('file_path',''))" 2>/dev/null)

if [[ "$file" =~ \.(ts|tsx)$ ]]; then
  cd "/c/Users/millh/Local Documents/dev/reader"
  output=$(npx tsc --noEmit 2>&1)
  if [ $? -ne 0 ]; then
    echo "TypeScript errors found:"
    echo "$output"
    exit 2
  fi
fi
