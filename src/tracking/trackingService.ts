import { Platform } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { clearSession, saveSession } from '../storage/sessionStore';
import type { TrackingSession } from '../types';
import { LOCATION_TASK_NAME } from './locationTask';

export async function startTracking(session: TrackingSession): Promise<void> {
  if (!(await TaskManager.isAvailableAsync())) {
    throw new Error('Background tasks require an Expo development build, not Expo Go.');
  }

  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== Location.PermissionStatus.GRANTED) {
    throw new Error('Precise location permission is required to start a trip.');
  }

  const background = await Location.requestBackgroundPermissionsAsync();
  if (background.status !== Location.PermissionStatus.GRANTED) {
    throw new Error('Background location permission is required to track an active trip.');
  }

  await saveSession(session);

  try {
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.High,
      timeInterval: Platform.OS === 'android' ? 30_000 : undefined,
      distanceInterval: 25,
      deferredUpdatesDistance: 100,
      deferredUpdatesInterval: 60_000,
      pausesUpdatesAutomatically: false,
      activityType: Location.ActivityType.AutomotiveNavigation,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'Trip tracking active',
        notificationBody: 'Your location is being recorded for the active trip.',
        killServiceOnDestroy: false,
      },
    });
  } catch (error) {
    await clearSession();
    throw error;
  }
}

export async function stopTracking(): Promise<void> {
  const registered = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
  if (registered) await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  await clearSession();
}

export async function isTracking(): Promise<boolean> {
  return Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
}
