import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Title, Paragraph, Button } from 'react-native-paper';

export default function AIDetailScreen({ route }) {
  const { query, caseId } = route?.params || {};

  return (
    <ScrollView style={styles.container} contentContainerStyle={{padding:16}}>
      <Title>AI Analysis</Title>
      <Paragraph style={{marginTop:8}}>{query ? `Query: ${query}` : caseId ? `Case: ${caseId}` : 'No input provided'}</Paragraph>

      <Paragraph style={{marginTop:12}}>This screen will show results from the AI research/summarization endpoints. Implement wiring to /case-law/:id or your Bedrock endpoints to fetch summaries and embeddings.</Paragraph>

      <Button mode="contained" style={{marginTop:16}}>Run Analysis</Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({ container: { flex:1, backgroundColor:'#f7f8fb' } });
