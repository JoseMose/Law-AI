import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Appbar, Title, Paragraph } from 'react-native-paper';

export default function BillingDetailScreen({ route, navigation }) {
  const { record } = route?.params || {};

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Billing Detail" />
      </Appbar.Header>
      <ScrollView contentContainerStyle={{padding:16}}>
        <Title>{record?.amount ? `$${(record.amount/100).toFixed(2)}` : record?.amount}</Title>
        <Paragraph style={{marginTop:8}}>{record?.description || record?.caseTitle}</Paragraph>
        <Paragraph style={{marginTop:8}}>Status: {record?.status || 'unknown'}</Paragraph>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({ container: { flex:1, backgroundColor:'#fff' } });
