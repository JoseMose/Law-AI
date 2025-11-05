import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Button, Paragraph, Title } from 'react-native-paper';
import documentsService from '../api/services/documentsService';

export default function UploadDocumentScreen({ route, navigation }) {
  const caseId = route?.params?.caseId;
  const [busy, setBusy] = useState(false);

  const pickAndUpload = async () => {
    const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: false });
    if (res.type !== 'success') return;
    const { uri, name, mimeType } = res;
    const formData = new FormData();
    formData.append('file', {
      uri,
      name,
      type: mimeType || 'application/octet-stream'
    });
    if (caseId) formData.append('caseId', caseId);

    try {
      setBusy(true);
      await documentsService.uploadDocument(formData);
      navigation.goBack();
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <Title style={{margin:16}}>Upload Document</Title>
      <Paragraph style={{marginHorizontal:16}}>Pick a file to upload to the case.</Paragraph>
      <Button mode="contained" onPress={pickAndUpload} loading={busy} style={{margin:16}}>
        Pick & Upload
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({ container: { flex:1, backgroundColor:'#f7f8fb' } });
