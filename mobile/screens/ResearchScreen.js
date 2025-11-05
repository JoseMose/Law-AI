import React from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, Title, Paragraph } from 'react-native-paper';

export default function ResearchScreen({ navigation }) {
  const [query, setQuery] = React.useState('');

  return (
    <View style={styles.container}>
      <Title style={{margin:16}}>Legal Research</Title>
      <Paragraph style={{marginHorizontal:16}}>Search statutes, cases, and generate AI summaries.</Paragraph>

      <TextInput
        label="Search query"
        value={query}
        onChangeText={setQuery}
        style={{margin:16}}
      />

      <Button mode="contained" style={{marginHorizontal:16}} onPress={() => navigation.navigate('AIDetail', { query })}>
        Search & Analyze
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({ container: { flex:1, backgroundColor:'#f7f8fb' } });
