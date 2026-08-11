import * as SQLite from 'expo-sqlite';
import type { LocationPing } from '../types';

let databasePromise: Promise<SQLite.SQLiteDatabase> | undefined;

async function database(): Promise<SQLite.SQLiteDatabase> {
  databasePromise ??= SQLite.openDatabaseAsync('driver-tracker.db');
  const db = await databasePromise;
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS location_queue (
      id TEXT PRIMARY KEY NOT NULL,
      trip_id TEXT NOT NULL,
      driver_id TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      accuracy REAL,
      altitude REAL,
      heading REAL,
      speed REAL,
      captured_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_location_queue_captured_at
      ON location_queue(captured_at);
  `);
  return db;
}

export async function enqueuePing(ping: LocationPing): Promise<void> {
  const db = await database();
  await db.runAsync(
    `INSERT OR IGNORE INTO location_queue
      (id, trip_id, driver_id, latitude, longitude, accuracy, altitude, heading, speed, captured_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ping.id,
    ping.tripId,
    ping.driverId,
    ping.latitude,
    ping.longitude,
    ping.accuracy,
    ping.altitude,
    ping.heading,
    ping.speed,
    ping.capturedAt,
  );
}

type QueueRow = {
  id: string;
  trip_id: string;
  driver_id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  heading: number | null;
  speed: number | null;
  captured_at: string;
};

export async function peekPings(limit: number): Promise<LocationPing[]> {
  const db = await database();
  const rows = await db.getAllAsync<QueueRow>(
    'SELECT * FROM location_queue ORDER BY captured_at ASC LIMIT ?',
    limit,
  );
  return rows.map((row) => ({
    id: row.id,
    tripId: row.trip_id,
    driverId: row.driver_id,
    latitude: row.latitude,
    longitude: row.longitude,
    accuracy: row.accuracy,
    altitude: row.altitude,
    heading: row.heading,
    speed: row.speed,
    capturedAt: row.captured_at,
  }));
}

export async function removePings(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await database();
  const placeholders = ids.map(() => '?').join(',');
  await db.runAsync(`DELETE FROM location_queue WHERE id IN (${placeholders})`, ids);
}

export async function queuedPingCount(): Promise<number> {
  const db = await database();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM location_queue',
  );
  return row?.count ?? 0;
}
