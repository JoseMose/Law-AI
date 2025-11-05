import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Title, Switch, Paragraph, Button, Text } from 'react-native-paper';
import settingsService from '../services/settingsService';

export default function SettingsScreen() {
  const [minutes, setMinutes] = useState(30);
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const m = await settingsService.getReminderMinutes();
      const e = await settingsService.getNotificationsEnabled();
      setMinutes(m);
      setEnabled(e);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    await settingsService.setReminderMinutes(minutes);
    await settingsService.setNotificationsEnabled(enabled);
    setSaving(false);
  };

  return (
    <View style={styles.container}>
      <Title style={{margin:16}}>Settings</Title>

      <View style={{padding:16}}>
        <Paragraph>Notifications</Paragraph>
        <View style={{flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginTop:8}}>
          <Text>Enable reminders</Text>
          <Switch value={enabled} onValueChange={setEnabled} />
        </View>

        <Paragraph style={{marginTop:16}}>Default reminder offset (minutes before event)</Paragraph>
        <View style={{flexDirection:'row', gap:8, marginTop:8}}>
          <Button mode={minutes===15 ? 'contained' : 'outlined'} onPress={() => setMinutes(15)}>15</Button>
          <Button mode={minutes===30 ? 'contained' : 'outlined'} onPress={() => setMinutes(30)}>30</Button>
          <Button mode={minutes===60 ? 'contained' : 'outlined'} onPress={() => setMinutes(60)}>60</Button>
        </View>

        <Button mode="contained" onPress={save} loading={saving} style={{marginTop:20}}>Save</Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({ container: { flex:1, backgroundColor:'#f7f8fb' } });
