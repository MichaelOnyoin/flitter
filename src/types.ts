export type TrackingSession = {
  tripId: string;
  driverId: string;
  startedAt: string;
};

export type LocationPing = {
  id: string;
  tripId: string;
  driverId: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  heading: number | null;
  speed: number | null;
  capturedAt: string;
};
