# Account Self-Bot

Automates bulk actions on the user's **own account** at a human pace:

- **Discord** — bulk-delete your own messages in a channel, bulk-unfollow channels
- **X / Twitter** — bulk-unfollow accounts you follow

> ⚠️ This is a self-bot: it automates actions on *your* account. It is against
> Discord's and X's ToS (both prohibit automation of user actions) and can get
> your account rate-limited or banned. The design is deliberately
> **low-ban-risk**: own-account-only, a configurable human-pace delay, a
> dry-run mode, and a per-session cap. Use at your own risk.

## Install

[Install account-selfbot-userscript.user.js](https://github.com/chirag127/account-selfbot-userscript/raw/main/account-selfbot-userscript.user.js)

## Use

On a Discord channel page or an X following list, right-click:

| Platform | Actions |
|----------|---------|
| Discord | **Bulk delete own messages**, **Bulk unfollow channels** |
| X / Twitter | **Bulk unfollow (X)** |

All actions respect:

- **Dry run** (ON by default) — lists what would be done without doing it
- **Delay** (default 2000ms, + random jitter) — human-pace request spacing
- **Max per session** (default 50) — caps how many actions run in one go

## How it works

- **Own-account-only**: every action targets the logged-in user's own content
  (messages they posted, follows they made). It never touches other users' data.
- **Human-pace**: a configurable delay + random jitter between each action so
  the request pattern does not look like a burst.
- **Dry-run default**: the first run only reports what would be deleted /
  unfollowed. Flip to LIVE to actually act.
- **Per-session cap**: `maxPerSession` limits how many actions run before the
  user has to right-click again.
- **No credential theft**, no session injection, no multi-account — only the
  logged-in user's own account is affected.

## Safety

- Own-account-only: never touches other users' messages or follows
- Human-pace: 2s default + jitter; configurable
- Dry-run default: confirm before acting
- Per-session cap: 50 default; configurable
- No credential theft, no session injection, no multi-account

## License

[MIT](LICENSE) © 2026 chirag127
