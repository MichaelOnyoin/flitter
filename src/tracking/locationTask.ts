import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { flushLocationQueue } from '../api/locationApi';
import { enqueuePing } from '../storage/locationQueue';
import { getSession } from '../storage/sessionStore';
import type { LocationPing } from '../types';

export const LOCATION_TASK_NAME = 'driver-active-trip-location';

type LocationTaskData = { locations: Location.LocationObject[] };

if (!TaskManager.isTaskDefined(LOCATION_TASK_NAME)) {
  TaskManager.defineTask<LocationTaskData>(LOCATION_TASK_NAME, async ({ data, error }) => {
    if (error || !data?.locations?.length) return;

    const session = await getSession();
    if (!session) return;

    for (const location of data.locations) {
      const ping: LocationPing = {
        id: `${session.tripId}-${location.timestamp}-${Math.random().toString(36).slice(2, 8)}`,
        tripId: session.tripId,
        driverId: session.driverId,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        altitude: location.coords.altitude,
        heading: location.coords.heading,
        speed: location.coords.speed,
        capturedAt: new Date(location.timestamp).toISOString(),
      };
      await enqueuePing(ping);
    }

    // Queue first, then attempt delivery. A network failure never loses the samples.
    try {
      await flushLocationQueue();
    } catch {
      // A later location event or foreground refresh retries the queue.
    }
  });
}
