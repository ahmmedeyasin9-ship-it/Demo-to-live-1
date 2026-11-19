/**
 * 0X Premium - Safe Read-Only Monitor
 * Clean replacement for the two supplied scripts.
 *
 * Safety changes:
 * - Does NOT change Demo/Live labels, account selection, URL, balance, profit, or leaderboard.
 * - Does NOT hide watermarks or interfere with Canvas/WebGL.
 * - Does NOT bypass verification or download/execute remote code.
 * - Does NOT use eval().
 * - Reads only visible page text and reports a possible balance in the console.
 *
 * This is a monitoring helper, not a broker API and not proof of account status.
 */

(function () {
  'use strict';

  // Stop a previous copy of this monitor, if present.
  if (window.qxReadOnlyMonitor &&
      typeof window.qxReadOnlyMonitor.stop === 'function') {
    window.qxReadOnlyMonitor.stop();
  }

  const CONFIG = {
    scanIntervalMs: 2000,
    selectors: [
      'header',
      '[class*="balance"]',
      '[class*="account"]',
      '.zt1hG',
      '.v2KPX'
    ]
  };

  let intervalId = null;
  let observer = null;
  let lastReport = '';

  function parseVisibleBalance() {
    const candidates = new Set();

    for (const selector of CONFIG.selectors) {
      document.querySelectorAll(selector).forEach((element) => {
        if (!element || !element.isConnected) return;

        const style = window.getComputedStyle(element);
        if (style.display === 'none' ||
            style.visibility === 'hidden' ||
            Number(style.opacity) === 0) {
          return;
        }

        const text = (element.innerText || element.textContent || '').trim();
        if (text) candidates.add(text);
      });
    }

    for (const text of candidates) {
      // Only report a value when it appears in a visible page element.
      const match = text.match(/(?:USD\s*)?\$\s*([\d,]+(?:\.\d{1,2})?)/);
      if (!match) continue;

      const amount = Number(match[1].replace(/,/g, ''));
      if (Number.isFinite(amount) && amount >= 0) {
        return {
          amount,
          displayedText: match[0],
          sourceText: text.slice(0, 160)
        };
      }
    }

    return null;
  }

  function readAccountLabels() {
    const labels = [];

    for (const selector of CONFIG.selectors) {
      document.querySelectorAll(selector).forEach((element) => {
        const text = (element.innerText || element.textContent || '').trim();
        if (!text) return;

        const match = text.match(/\b(demo|live)\s+account\b|\b(demo|live)\b/i);
        if (match) labels.push(match[0]);
      });
    }

    return [...new Set(labels)].slice(0, 5);
  }

  function scan() {
    const balance = parseVisibleBalance();
    const accountLabels = readAccountLabels();

    const report = {
      time: new Date().toLocaleTimeString(),
      visibleBalance: balance ? balance.displayedText : 'Not found',
      accountLabels: accountLabels.length ? accountLabels : ['Not detected'],
      note: 'Read-only page observation; account status is not verified.'
    };

    const signature = JSON.stringify(report, (key, value) =>
      key === 'time' ? undefined : value
    );

    if (signature !== lastReport) {
      lastReport = signature;
      console.info('[0X Read-Only Monitor]', report);
    }
  }

  function start() {
    scan();
    intervalId = window.setInterval(scan, CONFIG.scanIntervalMs);

    if (document.body && 'MutationObserver' in window) {
      observer = new MutationObserver(() => {
        // Debounce work naturally by waiting for the next scheduled scan.
      });
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
      });
    }

    console.info(
      '[0X Read-Only Monitor] Started. No account, trading, or page UI changes are made.'
    );
  }

  function stop() {
    if (intervalId !== null) {
      window.clearInterval(intervalId);
      intervalId = null;
    }

    if (observer) {
      observer.disconnect();
      observer = null;
    }

    console.info('[0X Read-Only Monitor] Stopped.');
  }

  window.qxReadOnlyMonitor = { start, stop, scan };
  start();
})();
