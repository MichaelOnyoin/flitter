import { assertConfigured, config } from '../config';
import { getAccessToken } from '../storage/sessionStore';
import { peekPings, removePings } from '../storage/locationQueue';

let syncInProgress = false;

export async function flushLocationQueue(): Promise<void> {
  if (syncInProgress) return;
  syncInProgress = true;

  try {
    assertConfigured();
    const token = await getAccessToken();
    if (!token) return;

    while (true) {
      const pings = await peekPings(config.batchSize);
      if (pings.length === 0) return;

      const response = await fetch(`${config.apiBaseUrl}${config.locationBatchPath}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pings }),
      });

      if (!response.ok) {
        throw new Error(`Location sync failed with HTTP ${response.status}`);
      }

      await removePings(pings.map((ping) => ping.id));
    }
  } finally {
    syncInProgress = false;
  }
}
