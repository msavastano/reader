#!/bin/bash
# Notification / command hook
#
# Fires when Claude Code raises a notification — e.g. when it's waiting for
# user input, a permission prompt appears, or auth succeeds.
# Shows a Windows balloon notification via PowerShell.
#
# Input: event JSON on stdin (fields: message, notification_type, session_id).
# Output: nothing — runs in background so it doesn't delay Claude.

INPUT=$(cat)

MESSAGE=$(echo "$INPUT" | python3 -c "
import sys, json
d = json.load(sys.stdin)
msg = d.get('message', 'Claude Code needs your attention')
# Escape single quotes so PowerShell doesn't choke
print(msg[:120].replace(\"'\", '\`\`'))
" 2>/dev/null || echo "Claude Code needs your attention")

# Run detached — we don't want the hook to block waiting for the balloon to expire
powershell.exe -WindowStyle Hidden -NonInteractive -Command "
  Add-Type -AssemblyName System.Windows.Forms
  \$n = New-Object System.Windows.Forms.NotifyIcon
  \$n.Icon = [System.Drawing.SystemIcons]::Information
  \$n.BalloonTipIcon  = 'Info'
  \$n.BalloonTipTitle = 'Claude Code'
  \$n.BalloonTipText  = '$MESSAGE'
  \$n.Visible = \$true
  \$n.ShowBalloonTip(5000)
  Start-Sleep -Milliseconds 1500
  \$n.Dispose()
" &

exit 0
