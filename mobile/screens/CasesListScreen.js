import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Card, Title, Paragraph, Avatar, IconButton } from 'react-native-paper';
import casesService from '../api/services/casesService';

export default function CasesListScreen({ navigation }) {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await casesService.getCases();
        setCases(data || []);
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
        data={cases}
        keyExtractor={(item) => item.id?.toString() || item._id || Math.random().toString()}
        renderItem={({item}) => (
          <Card style={styles.card} onPress={() => navigation.navigate('CaseDetail', { caseId: item.id })}>
            <Card.Title
              title={item.title || `Case ${item.id}`}
              subtitle={item.status || 'Active'}
              left={(props) => <Avatar.Text {...props} label={(item.title||'C').charAt(0)} />}
              right={(props) => <IconButton {...props} icon="dots-vertical" />}
            />
            <Card.Content>
              <Paragraph numberOfLines={2}>{item.description || item.summary || 'No description'}</Paragraph>
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
