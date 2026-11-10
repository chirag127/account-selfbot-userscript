# AGENTS.md - account-selfbot-userscript

Single-file userscript. `account-selfbot-userscript.user.js` at repo root IS the product.
No build, no deps, `@grant none`.

## Method

| Platform | Action | Target |
|----------|--------|--------|
| Discord | Bulk delete own messages | The logged-in user's own messages in the current channel |
| Discord | Bulk unfollow channels | The logged-in user's channel follows |
| X / Twitter | Bulk unfollow | The logged-in user's account follows |

Safety by design:

- **Own-account-only**: every action targets the logged-in user's own content
- **Human-pace**: configurable delay (default 2000ms) + random jitter
- **Dry-run default**: `o.dryRun` is `true` on first run; the user flips to LIVE
- **Per-session cap**: `o.maxPerSession` (default 50) limits actions per session

Settings open **only** from the right-click context menu (transient DOM menu on the
`contextmenu` event). No floating panels/chips. `@grant none`, `@run-at document-idle`.

## Rules

- One file, zero build step. `@match` covers Discord + X/Twitter + `*://*/*`.
- The right-click menu only appears on supported platforms (Discord or X).
- Dry-run is the default; the user must explicitly flip it to LIVE.
- Never touches other users' messages or follows — own-account-only.
- Gray zone: automating account actions is against Discord's and X's ToS. The user
  bears the risk of rate-limiting or a ban.

## Install docs

Shared guide: https://github.com/chirag127/userscript-install-guide

## Test

`sctl install ./account-selfbot-userscript.user.js`, open a Discord channel with your
own messages, right-click → **Bulk delete own messages**, confirm the dry-run toast
shows the count. Then flip dry-run OFF and confirm the messages are deleted at the
configured pace.

Documentation is single-sourced at `c:\ws\docs\okf\`. Your note:
`c:\ws\docs\okf\scripts\account-selfbot-userscript.md`. Do not create an `okf/` folder here.
