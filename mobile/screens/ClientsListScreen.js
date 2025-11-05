import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Card, Paragraph, Avatar, IconButton } from 'react-native-paper';
import clientsService from '../api/services/clientsService';

export default function ClientsListScreen({ navigation }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await clientsService.getClients();
        setClients(data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <View style={styles.container}>
      <FlatList
        data={clients}
        keyExtractor={(item) => item.id?.toString() || item._id || Math.random().toString()}
        renderItem={({item}) => (
          <Card style={styles.card} onPress={() => navigation.navigate('ClientProfile', { client: item })}>
            <Card.Title
              title={item.name || `${item.firstName || ''} ${item.lastName || ''}`}
              subtitle={item.email || item.phone || ''}
              left={(props) => <Avatar.Text {...props} label={(item.name||'C').charAt(0)} />}
              right={(props) => <IconButton {...props} icon="chevron-right" />}
            />
            <Card.Content>
              <Paragraph numberOfLines={2}>{item.notes || ''}</Paragraph>
            </Card.Content>
          </Card>
        )}
        refreshing={loading}
        onRefresh={() => {}}
        contentContainerStyle={{padding:16}}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, backgroundColor: '#f7f8fb' },
  card: { marginBottom: 12, borderRadius: 12 }
});
