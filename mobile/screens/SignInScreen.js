import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, Text, Title } from 'react-native-paper';
import { useAuth } from '../auth/AuthContext';

export default function SignInScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleSignIn = async () => {
    setLoading(true);
    try {
      await signIn(email, password);
      navigation.replace('Dashboard');
    } catch (e) {
      console.error(e);
      alert(e.message || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Title style={styles.title}>Law AI</Title>
      <Text style={styles.subtitle}>Mobile legal practice assistant</Text>

      <TextInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        label="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={styles.input}
      />

      <Button mode="contained" onPress={handleSignIn} loading={loading} style={styles.button}>
        Sign in
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  input: { marginTop: 12, backgroundColor: 'transparent' },
  button: { marginTop: 20, paddingVertical: 6, borderRadius: 8 },
  title: { textAlign: 'center', marginBottom: 6 },
  subtitle: { textAlign: 'center', color: '#64748b', marginBottom: 20 }
});
