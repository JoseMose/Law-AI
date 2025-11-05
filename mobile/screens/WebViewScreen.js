import React, { useEffect } from 'react';
import { View, StyleSheet, Linking } from 'react-native';
import { Appbar, Paragraph } from 'react-native-paper';

export default function WebViewScreen({ route, navigation }) {
  const { url, title } = route?.params || {};

  useEffect(() => {
    if (url) {
      Linking.openURL(url).catch((err) => console.error('Failed to open URL', err));
      // close the screen after opening external browser
      navigation.goBack();
    }
  }, [url]);

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={title || 'Open Link'} />
      </Appbar.Header>
      <View style={{padding:16}}>
        <Paragraph>Opening link: {url}</Paragraph>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({ container: { flex:1, backgroundColor:'#fff' } });
