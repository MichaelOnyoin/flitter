import Constants from 'expo-constants';

type AppExtra = {
  apiBaseUrl?: string;
  locationBatchPath?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as AppExtra;

export const config = {
  apiBaseUrl: (extra.apiBaseUrl ?? '').replace(/\/$/, ''),
  locationBatchPath: extra.locationBatchPath ?? '/api/location-batches',
  batchSize: 50,
};

export function assertConfigured(): void {
  if (!config.apiBaseUrl || config.apiBaseUrl.includes('YOUR-API')) {
    throw new Error('Set expo.extra.apiBaseUrl in app.json before syncing.');
  }
}
