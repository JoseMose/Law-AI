import React from 'react';
import { StyleSheet } from 'react-native';
import { Card, Title, Paragraph } from 'react-native-paper';

export default function StatCard({ title, value, subtitle, onPress }) {
  return (
    <Card style={styles.card} onPress={onPress}>
      <Card.Content>
        <Title>{value}</Title>
        <Paragraph style={{ marginTop: 6 }}>{title}</Paragraph>
        {subtitle ? <Paragraph style={{ marginTop: 6, color: '#64748b' }}>{subtitle}</Paragraph> : null}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12, borderRadius: 12 }
});
