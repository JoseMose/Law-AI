import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Card, Paragraph, Title, Button, ActivityIndicator } from 'react-native-paper';
import casesService from '../api/services/casesService';

export default function DocumentsScreen({ navigation }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const cases = await casesService.getCases();
        // flatten documents from cases
        const docs = (cases || []).flatMap(c => (c.documents || []).map(d => ({ ...d, caseId: c.id, caseTitle: c.title })));
        setDocuments(docs);
      } catch (e) {
        console.error('Failed to load documents', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <View style={styles.container}>
      <Title style={{margin:16}}>Documents</Title>

      {loading ? (
        <ActivityIndicator animating size="large" style={{marginTop:32}} />
      ) : (
        <FlatList
          data={documents}
          keyExtractor={(item, idx) => item.id?.toString() || item.key || idx.toString()}
          renderItem={({item}) => (
            <Card style={{marginHorizontal:16, marginBottom:12}}>
              <Card.Title title={item.filename || item.name || item.key} subtitle={item.caseTitle} />
              <Card.Content>
                <Paragraph>{item.mime || item.type || ''}</Paragraph>
              </Card.Content>
              <Card.Actions>
                <Button onPress={() => navigation.navigate('UploadDocument', { caseId: item.caseId })}>Upload New</Button>
              </Card.Actions>
            </Card>
          )}
          ListEmptyComponent={<Paragraph style={{margin:16}}>No documents yet. Upload one to get started.</Paragraph>}
        />
      )}

      <Button mode="contained" style={{margin:16}} onPress={() => navigation.navigate('UploadDocument')}>
        Upload Document
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({ container: { flex:1, backgroundColor:'#f7f8fb' } });
