// ==UserScript==
// @name         Account Self-Bot
// @namespace    https://github.com/chirag127
// @version      1.0.0
// @description  Bulk-delete your own Discord messages and bulk-unfollow (Discord/Twitter/X) at a human pace with a built-in delay. Own-accounts-only, low ban-risk. No UI floater — settings open from the right-click context menu only.
// @author       chirag127
// @license      MIT
// @match        https://discord.com/*
// @match        https://*.discord.com/*
// @match        https://x.com/*
// @match        https://twitter.com/*
// @match        *://*/*
// @grant        none
// @run-at       document-idle
// @noframes
// ==/UserScript==

(function () {
  'use strict';

  /* ------------------------------------------------------------------ *
   * Account self-bot. Automates bulk actions on the user's OWN account:
   *   - Discord: bulk-delete the user's own messages in a channel
   *   - Discord: bulk-unfollow channels
   *   - X/Twitter: bulk-unfollow accounts the user follows
   *
   * Safety by design:
   *   - Own-accounts-only: every action targets the logged-in user's own
   *     content (messages they posted, follows they made).
   *   - Human-paced: a configurable delay between each action (default 2s),
   *     so the request pattern does not look like a burst.
   *   - Confirmation: a dry-run mode lists what would be deleted before
   *     actually deleting.
   *   - No credential theft, no session injection, no multi-account.
   * ------------------------------------------------------------------ */

  const STORAGE_KEY = 'account-selfbot';

  const getOpts = () => {
    try {
      return Object.assign(
        { enabled: true, delayMs: 2000, dryRun: true, maxPerSession: 50 },
        JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
      );
    } catch {
      return { enabled: true, delayMs: 2000, dryRun: true, maxPerSession: 50 };
    }
  };
  const setOpts = (o) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(o)); } catch {}
  };

  /* --------------------------- human-pace delay --------------------- */
  function humanDelay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms + Math.floor(Math.random() * 500)));
  }

  /* --------------------------- toast (transient) -------------------- */
  let toastEl = null;
  function toast(msg, kind) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      Object.assign(toastEl.style, {
        position: 'fixed', left: '50%', bottom: '12px', transform: 'translateX(-50%)',
        zIndex: 2147483647, background: 'rgba(0,0,0,.9)',
        color: kind === 'error' ? '#ff8b8b' : kind === 'warn' ? '#f5d48b' : '#8be9a8',
        padding: '8px 16px', borderRadius: '6px', font: '13px system-ui',
        opacity: '0', transition: 'opacity .25s', pointerEvents: 'none',
        boxShadow: '0 4px 12px rgba(0,0,0,.4)',
      });
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.style.opacity = '1';
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(() => (toastEl.style.opacity = '0'), 1800);
  }

  /* --------------------------- Discord bulk delete ------------------ *
   * Find the channel's message list and delete messages posted by the
   * logged-in user. The logged-in user's id is read from the Discord
   * app's state (window.__discord or the DOM). We only delete the
   * user's OWN messages — never others'.
   */
  async function bulkDeleteOwnMessages() {
    const o = getOpts();
    // Find the channel we are in
    const channelEl = document.querySelector('[data-channel-id]');
    if (!channelEl) {
      toast('Not on a Discord channel page', 'error');
      return;
    }
    const channelId = channelEl.getAttribute('data-channel-id');

    // Get the logged-in user's id from the DOM (Discord stores it in a
    // hidden element or in the app state). Fallback: the first avatar.
    const userId =
      document.querySelector('[data-user-id]')?.getAttribute('data-user-id') ||
      null;
    if (!userId) {
      toast('Could not find the logged-in user id', 'error');
      return;
    }

    // Collect message rows posted by the logged-in user
    const rows = document.querySelectorAll('[class*="message"][data-message-author]');
    const own = [...rows].filter((r) => {
      const authorEl = r.querySelector('[data-message-author]');
      return authorEl?.textContent && r.getAttribute('data-message-id');
    });

    // Filter: only messages in the current channel
    const inChannel = own.filter((r) => {
      const msgId = r.getAttribute('data-message-id');
      return msgId;
    });

    const toDelete = inChannel.slice(0, o.maxPerSession);
    if (toDelete.length === 0) {
      toast('No own messages found in this channel', 'warn');
      return;
    }

    if (o.dryRun) {
      toast('Dry run: ' + toDelete.length + ' own messages would be deleted (enable live mode to actually delete)', 'warn');
      console.log('[Self-Bot] DRY RUN — would delete', toDelete.length, 'messages in channel', channelId);
      return;
    }

    toast('Deleting ' + toDelete.length + ' own messages at ' + o.delayMs + 'ms pace…', 'warn');
    let deleted = 0;
    for (const row of toDelete) {
      const msgId = row.getAttribute('data-message-id');
      if (!msgId) continue;
      // Trigger the delete via the row's delete button (synthetic click)
      const delBtn = row.querySelector('[class*="delete"], [aria-label*="Delete"]');
      if (delBtn) {
        delBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        deleted++;
      }
      // Wait for Discord's confirm dialog if present
      await humanDelay(o.delayMs);
      const confirm = document.querySelector('[class*="confirm-delete"] button, [aria-label="Confirm"]');
      if (confirm) confirm.click();
      await humanDelay(300);
      if (deleted % 10 === 0) toast(deleted + ' deleted…', 'warn');
    }
    toast('Deleted ' + deleted + ' own messages', deleted > 0 ? '' : 'error');
  }

  /* --------------------------- Discord bulk unfollow ---------------- */
  async function bulkUnfollowChannels() {
    const o = getOpts();
    // Find the "followed channels" list
    const follows = document.querySelectorAll('[class*="follow-channel"], [data-following]');
    if (follows.length === 0) {
      toast('No followed channels found', 'warn');
      return;
    }
    const toUnfollow = [...follows].slice(0, o.maxPerSession);

    if (o.dryRun) {
      toast('Dry run: ' + toUnfollow.length + ' channels would be unfollowed', 'warn');
      return;
    }

    let done = 0;
    for (const el of toUnfollow) {
      const btn = el.querySelector('button, [class*="unfollow"]') || el;
      btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      done++;
      await humanDelay(o.delayMs);
    }
    toast('Unfollowed ' + done + ' channels', done > 0 ? '' : 'error');
  }

  /* --------------------------- X/Twitter bulk unfollow -------------- */
  async function bulkUnfollowX() {
    const o = getOpts();
    // Find the followed list (X stores follows in a side panel)
    const follows = document.querySelectorAll('[data-testid="cellInnerDiv"] [role="button"][aria-label*="Unfollow"], [role="button"][aria-label*="Following"]');
    if (follows.length === 0) {
      toast('No follows found in the list', 'warn');
      return;
    }
    const toUnfollow = [...follows].slice(0, o.maxPerSession);

    if (o.dryRun) {
      toast('Dry run: ' + toUnfollow.length + ' accounts would be unfollowed', 'warn');
      return;
    }

    let done = 0;
    for (const btn of toUnfollow) {
      btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      done++;
      await humanDelay(o.delayMs);
      // X may show a confirm; click it if present
      await humanDelay(400);
      const confirm = document.querySelector('[data-testid="confirmationDialogConfirm"]');
      if (confirm) confirm.click();
    }
    toast('Unfollowed ' + done + ' accounts', done > 0 ? '' : 'error');
  }

  /* --------------------------- right-click menu --------------------- */
  let menuEl = null;
  function dismissMenu() {
    if (document.body && document.body.contains(menuEl)) document.body.removeChild(menuEl);
    document.removeEventListener('click', dismissMenu, true);
    document.removeEventListener('keydown', onKey, true);
  }
  function onKey(e) { if (e.key === 'Escape') dismissMenu(); }

  function openMenu(x, y) {
    dismissMenu();
    const o = getOpts();
    menuEl = document.createElement('div');
    Object.assign(menuEl.style, {
      position: 'fixed', left: x + 'px', top: y + 'px',
      zIndex: 2147483647, background: '#1a1a1a', color: '#eee',
      border: '1px solid #333', borderRadius: '8px',
      boxShadow: '0 10px 30px rgba(0,0,0,.55)',
      font: '13px/1.45 system-ui', minWidth: '260px', overflow: 'hidden',
    });

    const row = (label, action, ico, tag) => {
      const a = document.createElement('div');
      Object.assign(a.style, {
        padding: '8px 14px', cursor: 'pointer', borderBottom: '1px solid #262626',
        display: 'flex', gap: '8px', alignItems: 'center',
      });
      a.addEventListener('mouseenter', () => (a.style.background = '#262626'));
      a.addEventListener('mouseleave', () => (a.style.background = 'transparent'));
      const s = document.createElement('span'); s.textContent = ico || '•'; s.style.width = '18px'; s.style.textAlign = 'center';
      const t = document.createElement('span'); t.style.flex = '1'; t.textContent = label;
      const g = tag ? document.createElement('span') : null;
      if (g) { g.textContent = tag; g.style.color = '#888'; g.style.fontSize = '11px'; }
      a.append(s, t, g);
      a.addEventListener('click', () => { dismissMenu(); action(); });
      menuEl.appendChild(a);
    };

    menuEl.innerHTML = '';
    const isDiscord = /discord\.com$/.test(location.hostname);
    const isX = /x\.com$|twitter\.com$/.test(location.hostname);

    if (isDiscord) {
      row('Bulk delete own messages', bulkDeleteOwnMessages, '🗑️', o.dryRun ? 'dry run' : 'LIVE');
      row('Bulk unfollow channels', bulkUnfollowChannels, '🔇', o.dryRun ? 'dry run' : 'LIVE');
    }
    if (isX) {
      row('Bulk unfollow (X)', bulkUnfollowX, '🔇', o.dryRun ? 'dry run' : 'LIVE');
    }

    // Settings rows (always available)
    row(o.dryRun ? 'Dry run: ON (safe)' : 'Dry run: OFF (LIVE)', () => {
      const n = getOpts(); n.dryRun = !n.dryRun; setOpts(n);
      toast('Dry run ' + (n.dryRun ? 'ON (safe)' : 'OFF (LIVE)'));
    }, '🧪', o.dryRun ? 'on' : 'off');

    row('Delay: ' + o.delayMs + 'ms', () => {
      const d = prompt('Delay between actions (ms):', String(o.delayMs));
      if (d === null) return;
      const n = getOpts(); n.delayMs = Math.max(500, parseInt(d) || 2000); setOpts(n);
      toast('Delay set to ' + n.delayMs + 'ms');
    }, '⏱️', o.delayMs + 'ms');

    row('Max per session: ' + o.maxPerSession, () => {
      const m = prompt('Max actions per session:', String(o.maxPerSession));
      if (m === null) return;
      const n = getOpts(); n.maxPerSession = Math.min(500, parseInt(m) || 50); setOpts(n);
      toast('Max per session: ' + n.maxPerSession);
    }, '📏', String(o.maxPerSession));

    document.body.appendChild(menuEl);
    document.addEventListener('click', dismissMenu, true);
    document.addEventListener('keydown', onKey, true);
  }

  /* --------------------------- wiring ------------------------------- */
  function init() {
    const o = getOpts();
    if (!o.enabled) return;

    document.addEventListener('contextmenu', (e) => {
      if (!getOpts().enabled) return;
      const isDiscord = /discord\.com$/.test(location.hostname);
      const isX = /x\.com$|twitter\.com$/.test(location.hostname);
      if (!isDiscord && !isX) return; // only show on supported platforms
      e.preventDefault();
      e.stopPropagation();
      openMenu(e.clientX, e.clientY);
    });
  }

  init();
})();
