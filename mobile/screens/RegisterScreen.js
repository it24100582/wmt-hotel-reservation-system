import React, { memo, useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

const RegisterField = memo(function RegisterField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboard,
  secure,
  capitalize,
  showPass,
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#666"
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboard || 'default'}
        secureTextEntry={secure && !showPass}
        autoCapitalize={capitalize || 'sentences'}
      />
    </View>
  );
});

const RegisterScreen = () => {
  const navigation = useNavigation();
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const update = useCallback((field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
  }, []);

  const handleNameChange = useCallback((v) => update('name', v), [update]);
  const handleEmailChange = useCallback((v) => update('email', v), [update]);
  const handlePhoneChange = useCallback((v) => update('phone', v), [update]);
  const handlePasswordChange = useCallback((v) => update('password', v), [update]);
  const handleConfirmPasswordChange = useCallback((v) => update('confirmPassword', v), [update]);

  const validate = () => {
    if (!form.name.trim()) { Alert.alert('Validation Error', 'Please enter your name'); return false; }
    if (form.name.trim().length < 2) { Alert.alert('Validation Error', 'Name must be at least 2 characters'); return false; }
    if (!form.email.trim()) { Alert.alert('Validation Error', 'Please enter your email'); return false; }
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) { Alert.alert('Validation Error', 'Please enter a valid email'); return false; }
    if (!form.password) { Alert.alert('Validation Error', 'Please enter a password'); return false; }
    if (form.password.length < 6) { Alert.alert('Validation Error', 'Password must be at least 6 characters'); return false; }
    if (form.password !== form.confirmPassword) { Alert.alert('Validation Error', 'Passwords do not match'); return false; }
    return true;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const user = await register(form.name.trim(), form.email.trim().toLowerCase(), form.password, form.phone.trim());
      Alert.alert('Account Created! 🎉', `Welcome, ${user.name}! Your account has been created successfully.`, [
        { text: 'Go to Home', onPress: () => navigation.navigate('Home') },
      ]);
    } catch (err) {
      Alert.alert('Registration Failed', err.message || 'Could not create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex1} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.logo}>🏨 WMT</Text>
          <Text style={styles.headerTitle}>Create Account</Text>
          <Text style={styles.headerSubtitle}>Join us and enjoy exclusive member benefits</Text>
        </View>

        <View style={styles.formSection}>
          <RegisterField
            label="Full Name"
            value={form.name}
            onChangeText={handleNameChange}
            placeholder="Enter your full name"
            showPass={showPass}
          />
          <RegisterField
            label="Email Address"
            value={form.email}
            onChangeText={handleEmailChange}
            placeholder="Enter your email"
            keyboard="email-address"
            capitalize="none"
            showPass={showPass}
          />
          <RegisterField
            label="Phone Number (optional)"
            value={form.phone}
            onChangeText={handlePhoneChange}
            placeholder="Enter your phone number"
            keyboard="phone-pad"
            showPass={showPass}
          />

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={styles.inputFlex}
                placeholder="At least 6 characters"
                placeholderTextColor="#666"
                value={form.password}
                onChangeText={handlePasswordChange}
                secureTextEntry={!showPass}
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPass((p) => !p)}>
                <Text style={styles.eyeText}>{showPass ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <RegisterField
            label="Confirm Password"
            value={form.confirmPassword}
            onChangeText={handleConfirmPasswordChange}
            placeholder="Re-enter your password"
            secure
            capitalize="none"
            showPass={showPass}
          />

          <TouchableOpacity
            style={[styles.registerButton, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#1a1a2e" />
              : <Text style={styles.registerButtonText}>Create Account</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity style={styles.loginLink} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginLinkText}>
              Already have an account? <Text style={styles.loginLinkBold}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  header: { backgroundColor: '#1a1a2e', padding: 30, alignItems: 'center' },
  logo: { color: '#d4af37', fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  headerTitle: { color: '#fff', fontSize: 26, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  headerSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 14, textAlign: 'center' },
  formSection: { padding: 30 },
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
  inputFlex: {
    backgroundColor: '#1a1a2e',
    color: '#fff',
    padding: 15,
    borderRadius: 8,
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    flex: 1,
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center' },
  eyeBtn: { backgroundColor: '#1a1a2e', padding: 15, borderRadius: 8, marginLeft: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  eyeText: { fontSize: 18 },
  registerButton: { backgroundColor: '#d4af37', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 5 },
  buttonDisabled: { opacity: 0.6 },
  registerButtonText: { color: '#1a1a2e', fontSize: 16, fontWeight: 'bold' },
  loginLink: { alignItems: 'center', marginTop: 20 },
  loginLinkText: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  loginLinkBold: { color: '#d4af37', fontWeight: 'bold' },
});

export default RegisterScreen;
