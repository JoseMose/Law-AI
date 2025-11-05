import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Card, Title, Paragraph, Button, ActivityIndicator } from 'react-native-paper';
import billingService from '../api/services/billingService';

export default function BillingScreen({ navigation }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await billingService.getBillingRecords();
        setRecords(data || []);
      } catch (e) {
        console.error('Failed to load billing records', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <View style={styles.center}><ActivityIndicator animating size="large" /></View>;

  return (
    <View style={styles.container}>
      <FlatList
        data={records}
        keyExtractor={p => p.id?.toString() || p.transactionId || Math.random().toString()}
        contentContainerStyle={{padding:16}}
        renderItem={({item}) => (
          <Card style={styles.card}>
            <Card.Content>
              <Title>{item.amount ? `$${(item.amount/100).toFixed(2)}` : item.amount}</Title>
              <Paragraph>{item.caseTitle || item.case || item.description || ''} · {item.date || item.createdAt || ''}</Paragraph>
            </Card.Content>
            <Card.Actions>
              <Button onPress={() => navigation.navigate('BillingDetail', { record: item })}>View</Button>
            </Card.Actions>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({ container: { flex:1, backgroundColor:'#f7f8fb' }, card: { marginBottom:12, borderRadius:12 }, center: { flex:1, justifyContent:'center', alignItems:'center' } });
