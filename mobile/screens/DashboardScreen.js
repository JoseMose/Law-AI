import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Title, Paragraph, ActivityIndicator, Card, List } from 'react-native-paper';
import casesService from '../api/services/casesService';
import clientsService from '../api/services/clientsService';
import billingService from '../api/services/billingService';
import StatCard from '../components/StatCard';

export default function DashboardScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ cases: 0, clients: 0, payments: 0 });
  const [upcoming, setUpcoming] = useState([]);
  const [recentPayments, setRecentPayments] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [cases, clients, billing] = await Promise.all([
          casesService.getCases(),
          clientsService.getClients(),
          billingService.getBillingRecords()
        ]);
        setStats({ cases: (cases || []).length, clients: (clients || []).length, payments: (billing || []).length });

        const upcomingEvents = (cases || []).flatMap((c) => (
          (c.events || c.calendar || []).map((ev, idx) => {
            const start = ev.start ? new Date(ev.start) : null;
            const end = ev.end ? new Date(ev.end) : null;
            return {
              id: ev.id || `${c.id || 'case'}-${idx}`,
              title: ev.title || 'Case event',
              caseTitle: c.title || 'Untitled case',
              start,
              end,
              location: ev.location || '',
              notes: ev.notes || ev.description || ''
            };
          })
        )).filter((ev) => ev.start && ev.start >= new Date());

        upcomingEvents.sort((a, b) => a.start.getTime() - b.start.getTime());
        setUpcoming(upcomingEvents.slice(0, 3));

        const paymentsList = (billing || []).slice().sort((a, b) => {
          const da = new Date(a.createdAt || a.date || 0);
          const db = new Date(b.createdAt || b.date || 0);
          return db - da;
        });
        setRecentPayments(paymentsList.slice(0, 3));
      } catch (e) {
        console.warn('Failed to load dashboard stats', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{padding: 16}}>
      <Title style={{marginBottom: 12}}>Welcome back</Title>

      {loading ? (
        <ActivityIndicator animating size="large" />
      ) : (
        <View>
          <Card style={styles.hero}>
            <Card.Content>
              <Paragraph style={styles.heroLabel}>Today&apos;s Focus</Paragraph>
              <Title style={styles.heroTitle}>
                {upcoming.length > 0 ? upcoming[0].title : 'No upcoming deadlines'}
              </Title>
              <Paragraph style={styles.heroSubtitle}>
                {upcoming.length > 0
                  ? `${upcoming[0].caseTitle} · ${upcoming[0].start.toLocaleString()}`
                  : 'You are all caught up for now.'}
              </Paragraph>
            </Card.Content>
          </Card>

          <View style={styles.row}>
            <View style={{flex:1, marginRight:8}}>
              <StatCard title="Open Cases" value={stats.cases} subtitle="Active matters" onPress={() => navigation.navigate('Cases')} />
            </View>
            <View style={{flex:1, marginLeft:8}}>
              <StatCard title="Clients" value={stats.clients} subtitle="Total clients" onPress={() => navigation.navigate('Clients')} />
            </View>
          </View>

          <StatCard title="Payments" value={stats.payments} subtitle="Recent transactions" onPress={() => navigation.navigate('Billing')} />

          <Card style={styles.sectionCard}>
            <Card.Title title="Upcoming Deadlines" subtitle="Next 3 events" titleStyle={{fontSize: 16}} />
            <Card.Content>
              {upcoming.length === 0 ? (
                <Paragraph style={{color:'#64748b'}}>No upcoming events scheduled.</Paragraph>
              ) : (
                upcoming.map((ev) => (
                  <List.Item
                    key={ev.id}
                    title={ev.title}
                    description={`${ev.caseTitle} · ${ev.start.toLocaleString()}`}
                    left={(props) => <List.Icon {...props} icon="calendar" />}
                  />
                ))
              )}
            </Card.Content>
          </Card>

          <Card style={styles.sectionCard}>
            <Card.Title title="Recent Payments" subtitle="Latest transactions" titleStyle={{fontSize: 16}} />
            <Card.Content>
              {recentPayments.length === 0 ? (
                <Paragraph style={{color:'#64748b'}}>No payments recorded yet.</Paragraph>
              ) : (
                recentPayments.map((payment, idx) => (
                  <List.Item
                    key={payment.id || payment.transactionId || idx}
                    title={payment.amount ? `$${(payment.amount/100).toFixed(2)}` : payment.amount}
                    description={`${payment.caseTitle || payment.case || 'Case'} · ${new Date(payment.createdAt || payment.date).toLocaleDateString()}`}
                    left={(props) => <List.Icon {...props} icon="credit-card" />}
                  />
                ))
              )}
            </Card.Content>
          </Card>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f8fb' },
  row: { flexDirection: 'row', marginBottom: 12 },
  hero: { marginBottom: 16, borderRadius: 18, backgroundColor: '#0b67ff' },
  heroLabel: { color: '#bfdbfe', textTransform: 'uppercase', letterSpacing: 1 },
  heroTitle: { color: '#ffffff', marginTop: 4 },
  heroSubtitle: { color: '#e0f2fe', marginTop: 8 },
  sectionCard: { borderRadius: 12, marginTop: 16 }
});
