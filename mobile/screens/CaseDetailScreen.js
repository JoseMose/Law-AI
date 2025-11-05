import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Appbar, Title, Paragraph, Button, List, ActivityIndicator, Divider, Text } from 'react-native-paper';
import casesService from '../api/services/casesService';
import calendarService from '../services/calendarService';
import settingsService from '../services/settingsService';

export default function CaseDetailScreen({ navigation, route }) {
  const caseId = route?.params?.caseId;
  const [caseItem, setCaseItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadCase = useCallback(async () => {
    if (!caseId) return;
    setLoading(true);
    setError(null);
    try {
      const c = await casesService.getCaseById(caseId);
      setCaseItem(c || null);
    } catch (err) {
      console.warn('Error loading case', err);
      setError('Unable to load case');
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    loadCase();
  }, [loadCase]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCase();
    setRefreshing(false);
  }, [loadCase]);

  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  const onSyncCalendar = useCallback(async () => {
    if (!caseItem) return;
    setSyncing(true);
    setSyncResult(null);
    try {
      const minutes = await settingsService.getReminderMinutes();
      const enabled = await settingsService.getNotificationsEnabled();
      const res = await calendarService.syncCaseEvents(caseItem, { minutesBefore: enabled ? minutes : 0 });
      setSyncResult({ success: true, created: res });
    } catch (err) {
      console.warn('Calendar sync failed', err);
      setSyncResult({ success: false, error: err.message || String(err) });
    } finally {
      setSyncing(false);
    }
  }, [caseItem]);

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={caseItem?.title || 'Case Detail'} />
      </Appbar.Header>

      {loading && !caseItem ? (
        <View style={styles.center}>
          <ActivityIndicator animating size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {error ? <Text style={{ color: 'red' }}>{error}</Text> : null}

          <Title>{caseItem?.title || 'Untitled Case'}</Title>
          <Paragraph style={{ marginTop: 8 }}>{caseItem?.description || caseItem?.notes || ''}</Paragraph>

          <Divider style={{ marginVertical: 12 }} />

          <Title style={{ fontSize: 18 }}>Events & Calendar</Title>
          {caseItem?.events && caseItem.events.length > 0 ? (
            caseItem.events.map((ev, idx) => (
              <List.Item
                key={ev.id || ev.title || String(idx)}
                title={ev.title || `Event ${idx + 1}`}
                description={ev.start ? (new Date(ev.start)).toLocaleString() : ''}
                left={(props) => <List.Icon {...props} icon="calendar" />}
              />
            ))
          ) : (
            <Paragraph style={{ marginTop: 8 }}>No events on this case calendar.</Paragraph>
          )}

          <Button mode="outlined" style={{ marginTop: 12 }} onPress={onSyncCalendar} loading={syncing} disabled={syncing || !caseItem || !caseItem.events || caseItem.events.length===0}>
            Sync Case Events to Device Calendar
          </Button>

          {syncResult ? (
            syncResult.success ? (
              <Paragraph style={{ marginTop: 8 }}>Synced {syncResult.created.length} events to your calendar.</Paragraph>
            ) : (
              <Paragraph style={{ marginTop: 8, color: 'red' }}>Sync failed: {syncResult.error}</Paragraph>
            )
          ) : null}


          <Title style={{ fontSize: 18 }}>Documents</Title>
          {caseItem?.documents && caseItem.documents.length > 0 ? (
            caseItem.documents.map((doc) => (
              <List.Item
                key={doc.id || doc.key || doc.filename}
                title={doc.filename || doc.name || doc.key || 'Document'}
                description={doc.mime || doc.type || ''}
                left={(props) => <List.Icon {...props} icon="file" />}
                onPress={() => {
                  // open document: if backend provides a presigned URL, navigate to webview or open with Linking
                  if (doc.url) navigation.navigate('WebViewScreen', { url: doc.url, title: doc.filename || 'Document' });
                }}
              />
            ))
          ) : (
            <Paragraph style={{ marginTop: 8 }}>No documents uploaded.</Paragraph>
          )}

          <Button mode="outlined" style={{ marginTop: 12 }} onPress={() => navigation.navigate('UploadDocument', { caseId })}>
            Upload Document
          </Button>

          <Divider style={{ marginVertical: 12 }} />

          <Title style={{ fontSize: 18 }}>Payment History</Title>
          {caseItem?.payments && caseItem.payments.length > 0 ? (
            caseItem.payments.map((p) => (
              <List.Item
                key={p.id || p.transactionId}
                title={`${p.amount ? `$${(p.amount/100).toFixed(2)}` : p.amount}`}
                description={`${p.description || p.method || ''} — ${p.status || ''}`}
                left={(props) => <List.Icon {...props} icon="credit-card" />}
              />
            ))
          ) : (
            <Paragraph style={{ marginTop: 8 }}>No payments recorded for this case.</Paragraph>
          )}

          <Button mode="contained" style={{ marginTop: 16 }} onPress={() => navigation.navigate('Billing')}>
            View Billing
          </Button>

          <Divider style={{ marginVertical: 12 }} />

          <Button mode="contained" style={{ marginTop: 8 }} onPress={() => navigation.navigate('AIDetail', { caseId })}>
            Generate AI Summary
          </Button>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f8fb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});
