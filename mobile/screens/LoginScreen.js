import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

const showMessage = (title, message, onDone) => {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && typeof window.alert === 'function') {
      window.alert(`${title}\n\n${message}`);
    }
    if (onDone) onDone();
    return;
  }

  if (onDone) {
    Alert.alert(title, message, [{ text: 'OK', onPress: onDone }]);
    return;
  }

  Alert.alert(title, message);
};

const LoginScreen = () => {
  const navigation = useNavigation();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const validate = () => {
    if (!email.trim()) {
      showMessage('Validation Error', 'Please enter your email');
      return false;
    }

    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      showMessage('Validation Error', 'Please enter a valid email');
      return false;
    }

    if (!password) {
      showMessage('Validation Error', 'Please enter your password');
      return false;
    }

    if (password.length < 6) {
      showMessage('Validation Error', 'Password must be at least 6 characters');
      return false;
    }

    return true;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    setLoading(true);

    try {
      const user = await login(email.trim().toLowerCase(), password);

      showMessage('Welcome back!', `Hello, ${user.name}!`, () => {
        navigation.navigate('Home');
      });
    } catch (err) {
      showMessage('Login Failed', err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.visualSection}>
          <Text style={styles.logo}>WMT</Text>
          <Text style={styles.visualTitle}>Welcome Back</Text>
          <Text style={styles.visualSubtitle}>
            Sign in to manage your bookings and enjoy exclusive member rates.
          </Text>
          <View style={styles.benefitsRow}>
            {[['20%', 'Member Discount'], ['Free', 'Breakfast'], ['24/7', 'Support']].map(([val, label]) => (
              <View key={label} style={styles.benefitItem}>
                <Text style={styles.benefitValue}>{val}</Text>
                <Text style={styles.benefitLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.formTitle}>Sign In</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor="#666"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Enter your password"
                placeholderTextColor="#666"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword((prev) => !prev)}>
                <Text style={styles.eyeText}>{showPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#1a1a2e" /> : <Text style={styles.loginButtonText}>Sign In</Text>}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={styles.registerButton} onPress={() => navigation.navigate('Register')}>
            <Text style={styles.registerButtonText}>
              Don't have an account? <Text style={styles.registerLink}>Sign Up</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  visualSection: { backgroundColor: '#1a1a2e', padding: 30, alignItems: 'center' },
  logo: { color: '#d4af37', fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  visualTitle: { color: '#fff', fontSize: 26, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  visualSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 25,
  },
  benefitsRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
  benefitItem: { alignItems: 'center' },
  benefitValue: { color: '#d4af37', fontSize: 20, fontWeight: 'bold' },
  benefitLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 4 },
  formSection: { padding: 30 },
  formTitle: { color: '#fff', fontSize: 28, fontWeight: 'bold', marginBottom: 25 },
  inputGroup: { marginBottom: 20 },
  label: { color: '#d4af37', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: {
    backgroundColor: '#1a1a2e',
    color: '#fff',
    padding: 15,
    borderRadius: 8,
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center' },
  eyeBtn: {
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 14,
    paddingVertical: 15,
    borderRadius: 8,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  eyeText: { color: '#d4af37', fontSize: 12, fontWeight: '700' },
  loginButton: { backgroundColor: '#d4af37', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 5 },
  buttonDisabled: { opacity: 0.6 },
  loginButtonText: { color: '#1a1a2e', fontSize: 16, fontWeight: 'bold' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 25 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  dividerText: { color: 'rgba(255,255,255,0.5)', marginHorizontal: 15 },
  registerButton: { alignItems: 'center' },
  registerButtonText: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  registerLink: { color: '#d4af37', fontWeight: 'bold' },
});

export default LoginScreen;
