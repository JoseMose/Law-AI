import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Avatar, Title, Paragraph, Card, Button, ActivityIndicator } from 'react-native-paper';
import clientsService from '../api/services/clientsService';

export default function ClientProfileScreen({ route, navigation }) {
  const clientParam = route?.params?.client;
  const clientId = route?.params?.clientId || clientParam?.id;
  const [client, setClient] = useState(clientParam || null);
  const [loading, setLoading] = useState(!clientParam);

  useEffect(() => {
    (async () => {
      if (!clientId) return setLoading(false);
      try {
        const data = await clientsService.getClientById(clientId);
        setClient(data || null);
      } catch (e) {
        console.error('Failed to load client', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [clientId]);

  if (loading) return <View style={styles.center}><ActivityIndicator animating size="large" /></View>;

  if (!client) return <View style={styles.container}><Paragraph style={{margin:16}}>Client not found.</Paragraph></View>;

  return (
    <View style={styles.container}>
      <Card style={{margin:16, borderRadius:12}}>
        <Card.Content style={{alignItems:'center'}}>
          <Avatar.Text size={80} label={(client.name||'J').charAt(0)} />
          <Title style={{marginTop:12}}>{client.name}</Title>
          <Paragraph>{client.phone || client.email}</Paragraph>
        </Card.Content>
        <Card.Actions style={{justifyContent:'center'}}>
          <Button mode="outlined">Call</Button>
          <Button mode="contained" style={{marginLeft:8}}>Message</Button>
        </Card.Actions>
      </Card>

      <Card style={{margin:16, borderRadius:12}}>
        <Card.Title title="Cases" />
        <Card.Content>
          {client.cases && client.cases.length > 0 ? (
            <FlatList
              data={client.cases}
              keyExtractor={(i) => i.id?.toString() || i._id || Math.random().toString()}
              renderItem={({item}) => (
                <Button onPress={() => navigation.navigate('CaseDetail', { caseId: item.id })}>
                  {item.title}
                </Button>
              )}
            />
          ) : (
            <Paragraph>No linked cases yet</Paragraph>
          )}
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({ container: { flex:1, backgroundColor:'#f7f8fb' }, center: { flex:1, justifyContent:'center', alignItems:'center' } });
