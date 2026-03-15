#!/bin/bash
# SessionStart / command hook
#
# Fires at session start, resume, and after /compact.
# Anything echoed here is injected into Claude's context as a system message,
# so key project facts survive compaction and stay in every session.
#
# Input: event JSON on stdin (fields: trigger = "startup"|"resume"|"compact"|"clear").
# Output: text echoed to stdout becomes the injected reminder.

cat << 'EOF'
=== Reader App — Key Reminders ===

Architecture:
  • All DB access goes through Server Actions in src/app/actions.ts — never
    add direct database calls in components or new API routes for app data.
  • Single-page app: all views (Library, Reader) render on / controlled by
    React state. There is no routing beyond the root page.

Database quirks:
  • lineHeight in the `settings` table is stored × 10 (e.g. 1.8 → 18).
    Divide by 10 on read; multiply by 10 on write.
  • stories.id is either a scraped original ID or a UUID.
  • reading_progress has a composite PK of (userId, storyId).

Auth:
  • NextAuth v5 beta, Google OAuth, JWT session strategy.
  • Config is split: src/auth.config.ts (edge-compatible) + src/auth.ts
    (full config with Drizzle adapter). This split is required for middleware.

=== End Reminders ===
EOF
