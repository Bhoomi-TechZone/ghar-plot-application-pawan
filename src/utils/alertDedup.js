/**
 * alertDedup.js
 * Lightweight deduplication for notifications.
 * Prevents: FCM retries, FG+BG double-fire, race conditions.
 * Does NOT block: valid 1-minute interval backend notifications.
 */

// alertId → timestamp (blocks rapid re-fires of the same alert)
const processedAlerts = new Map();

// messageId → true (blocks the same FCM message firing in both FG and BG)
const processedMessages = new Set();

// 10s cooldown — enough to block true duplicates, but < 60s backend interval
const COOLDOWN_MS = 10000;

/**
 * Check if an alert should be shown based on alertId cooldown.
 * @param {string} alertId - Clean alert ID (no prefix)
 * @returns {boolean} true = show, false = skip (duplicate)
 */
export const shouldShowAlert = (alertId) => {
  if (!alertId) return true;

  const now = Date.now();
  const lastTime = processedAlerts.get(alertId);

  if (lastTime && (now - lastTime) < COOLDOWN_MS) {
    console.log(`🛡️ [DE-DUP] Blocked alertId ${alertId} (${Math.round((now - lastTime) / 1000)}s ago, cooldown ${COOLDOWN_MS / 1000}s)`);
    return false;
  }

  processedAlerts.set(alertId, now);

  // Cleanup: remove entries older than 2 minutes to prevent memory bloat
  if (processedAlerts.size > 30) {
    for (const [id, time] of processedAlerts.entries()) {
      if (now - time > 120000) processedAlerts.delete(id);
    }
  }

  return true;
};

/**
 * Check if this exact FCM message was already processed (FG+BG race guard).
 * @param {string} messageId - FCM remoteMessage.messageId
 * @returns {boolean} true = first time (safe to show), false = already processed
 */
export const shouldProcessMessage = (messageId) => {
  if (!messageId) return true;

  if (processedMessages.has(messageId)) {
    console.log(`🛡️ [DE-DUP] Blocked duplicate messageId: ${messageId}`);
    return false;
  }

  processedMessages.add(messageId);

  // Cleanup: keep set small (remove after 30s — FCM won't retry after that)
  setTimeout(() => processedMessages.delete(messageId), 30000);

  return true;
};
