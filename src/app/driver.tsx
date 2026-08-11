import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { flushLocationQueue } from '../api/locationApi';
import { queuedPingCount } from '../storage/locationQueue';
import { getSession, saveAccessToken } from '../storage/sessionStore';
import { isTracking, startTracking, stopTracking } from '../tracking/trackingService';

export default function App() {
  const [tripId, setTripId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [token, setToken] = useState('');
  const [tracking, setTracking] = useState(false);
  const [queued, setQueued] = useState(0);
  const [busy, setBusy] = useState(true);

  const refresh = useCallback(async () => {
    const [active, session, count] = await Promise.all([
      isTracking(),
      getSession(),
      queuedPingCount(),
    ]);
    setTracking(active);
    setQueued(count);
    if (session) {
      setTripId(session.tripId);
      setDriverId(session.driverId);
    }
  }, []);

  useEffect(() => {
    refresh().catch((error) => Alert.alert('Startup error', String(error))).finally(() => setBusy(false));
    const interval = setInterval(() => refresh().catch(() => undefined), 10_000);
    return () => clearInterval(interval);
  }, [refresh]);

  async function handleStart() {
    if (!tripId.trim() || !driverId.trim()) {
      Alert.alert('Missing details', 'Enter both a trip ID and driver ID.');
      return;
    }

    setBusy(true);
    try {
      if (token.trim()) await saveAccessToken(token.trim());
      await startTracking({
        tripId: tripId.trim(),
        driverId: driverId.trim(),
        startedAt: new Date().toISOString(),
      });
      await refresh();
    } catch (error) {
      Alert.alert('Could not start tracking', error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleStop() {
    setBusy(true);
    try {
      await stopTracking();
      try {
        await flushLocationQueue();
      } catch {
        // Keep queued samples for the next authenticated online session.
      }
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleSync() {
    setBusy(true);
    try {
      if (token.trim()) await saveAccessToken(token.trim());
      await flushLocationQueue();
      await refresh();
    } catch (error) {
      Alert.alert('Sync failed', error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  if (busy && !tripId && !driverId) {
    return <View style={styles.loading}><ActivityIndicator size="large" /></View>;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.eyebrow}>FLEET OPERATIONS</Text>
        <Text style={styles.title}>Driver Tracker</Text>
        <View style={styles.statusRow}>
          <View style={[styles.dot, tracking ? styles.dotActive : styles.dotIdle]} />
          <Text style={styles.statusText}>{tracking ? 'Trip tracking is active' : 'Tracking is stopped'}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Driver ID</Text>
        <TextInput
          style={styles.input}
          value={driverId}
          onChangeText={setDriverId}
          editable={!tracking}
          placeholder="e.g. DRIVER-014"
          autoCapitalize="characters"
        />

        <Text style={styles.label}>Trip ID / Business Central document</Text>
        <TextInput
          style={styles.input}
          value={tripId}
          onChangeText={setTripId}
          editable={!tracking}
          placeholder="e.g. TRIP-2026-00142"
          autoCapitalize="characters"
        />

        <Text style={styles.label}>Temporary API access token</Text>
        <TextInput
          style={styles.input}
          value={token}
          onChangeText={setToken}
          placeholder="Replace this field with Microsoft sign-in"
          secureTextEntry
          autoCapitalize="none"
        />

        <Pressable
          style={[styles.primaryButton, tracking && styles.stopButton, busy && styles.disabled]}
          disabled={busy}
          onPress={tracking ? handleStop : handleStart}
        >
          {busy ? <ActivityIndicator color="#fff" /> : (
            <Text style={styles.primaryButtonText}>{tracking ? 'End trip' : 'Start trip'}</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.queueCard}>
        <View>
          <Text style={styles.queueNumber}>{queued}</Text>
          <Text style={styles.queueLabel}>location points awaiting upload</Text>
        </View>
        <Pressable style={styles.secondaryButton} onPress={handleSync} disabled={busy}>
          <Text style={styles.secondaryButtonText}>Sync now</Text>
        </Pressable>
      </View>

      <Text style={styles.privacy}>
        Location is collected only during an active trip. Android displays a persistent notification;
        iOS displays its background-location indicator.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  safeArea: { flex: 1, backgroundColor: '#f2f5f4' },
  header: { backgroundColor: '#103d35', paddingHorizontal: 24, paddingTop: 36, paddingBottom: 32 },
  eyebrow: { color: '#89cab9', fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  title: { color: '#fff', fontSize: 34, fontWeight: '800', marginTop: 5 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 18 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  dotActive: { backgroundColor: '#50e3a4' },
  dotIdle: { backgroundColor: '#bdc9c6' },
  statusText: { color: '#e7f1ee', fontSize: 15 },
  card: { backgroundColor: '#fff', margin: 18, padding: 20, borderRadius: 18, elevation: 3 },
  label: { color: '#33514b', fontSize: 13, fontWeight: '700', marginBottom: 7 },
  input: { borderWidth: 1, borderColor: '#d8e1df', backgroundColor: '#fafcfb', borderRadius: 10, padding: 13, marginBottom: 17, color: '#183a33' },
  primaryButton: { backgroundColor: '#147d66', minHeight: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  stopButton: { backgroundColor: '#a33b3b' },
  disabled: { opacity: 0.65 },
  primaryButtonText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  queueCard: { marginHorizontal: 18, padding: 18, borderRadius: 14, backgroundColor: '#e1ebe8', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  queueNumber: { color: '#103d35', fontSize: 27, fontWeight: '800' },
  queueLabel: { color: '#4c6861', fontSize: 12 },
  secondaryButton: { borderWidth: 1, borderColor: '#147d66', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 9 },
  secondaryButtonText: { color: '#147d66', fontWeight: '800' },
  privacy: { color: '#687b76', fontSize: 12, lineHeight: 18, margin: 22, textAlign: 'center' },
});
