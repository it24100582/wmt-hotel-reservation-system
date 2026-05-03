import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { isValidSriLankanPhone, normalizePhoneInput } from '../utils/phoneUtils';
import { isValidPersonName, normalizeNameInput } from '../utils/nameUtils';

const RegisterField = memo(function RegisterField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboard,
  secure,
  capitalize,
  showPass,
  error,
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, error ? styles.inputError : null]}
        placeholder={placeholder}
        placeholderTextColor="#666"
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboard || 'default'}
        secureTextEntry={secure && !showPass}
        autoCapitalize={capitalize || 'sentences'}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
});

const StepBadge = ({ currentStep }) => (
  <View style={styles.stepRow}>
    <Text style={[styles.stepText, currentStep >= 1 && styles.stepActive]}>1. Email</Text>
    <Text style={[styles.stepText, currentStep >= 2 && styles.stepActive]}>2. OTP</Text>
    <Text style={[styles.stepText, currentStep >= 3 && styles.stepActive]}>3. Password</Text>
  </View>
);

const RegisterScreen = () => {
  const navigation = useNavigation();
  const { requestOtpForRegistration, verifyOtpForRegistration, register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', phone: '' });
  const [otp, setOtp] = useState('');
  const [stage, setStage] = useState('email'); // email -> otp -> password
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const nameError = useMemo(() => {
    if (!form.name) return '';
    const normalizedName = normalizeNameInput(form.name);
    if (!normalizedName) return 'Please enter your name';
    if (normalizedName.length < 2) return 'Name must be at least 2 characters';
    if (!isValidPersonName(normalizedName)) return 'Name can only contain letters and spaces';
    return '';
  }, [form.name]);

  const phoneError = useMemo(() => {
    if (!form.phone) return '';
    if (!isValidSriLankanPhone(form.phone)) {
      return 'Use Sri Lankan format: 0771234567 or +94771234567';
    }
    return '';
  }, [form.phone]);

  const update = useCallback((field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (['name', 'email', 'phone'].includes(field) && stage !== 'email') {
      setStage('email');
      setOtp('');
      setForm((f) => ({ ...f, password: '', confirmPassword: '' }));
    }
  }, [stage]);

  const handleNameChange = useCallback((v) => update('name', v), [update]);
  const handleEmailChange = useCallback((v) => update('email', v), [update]);
  const handlePhoneChange = useCallback((v) => update('phone', v), [update]);
  const handlePasswordChange = useCallback((v) => update('password', v), [update]);
  const handleConfirmPasswordChange = useCallback((v) => update('confirmPassword', v), [update]);

  const validateForOtpRequest = () => {
    const normalizedName = normalizeNameInput(form.name);
    if (!normalizedName) { Alert.alert('Validation Error', 'Please enter your name'); return false; }
    if (normalizedName.length < 2) { Alert.alert('Validation Error', 'Name must be at least 2 characters'); return false; }
    if (!isValidPersonName(normalizedName)) { Alert.alert('Validation Error', 'Name can only contain letters and spaces'); return false; }
    if (!form.email.trim()) { Alert.alert('Validation Error', 'Please enter your email'); return false; }
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) { Alert.alert('Validation Error', 'Please enter a valid email'); return false; }
    if (phoneError) {
      Alert.alert('Validation Error', 'Enter a valid Sri Lankan phone number (e.g. 0771234567 or +94771234567)');
      return false;
    }
    return true;
  };

  const validateForPasswordStep = () => {
    if (!form.password) { Alert.alert('Validation Error', 'Please enter a password'); return false; }
    if (form.password.length < 6) { Alert.alert('Validation Error', 'Password must be at least 6 characters'); return false; }
    if (form.password !== form.confirmPassword) { Alert.alert('Validation Error', 'Passwords do not match'); return false; }
    return true;
  };

  const handleSendOtp = async () => {
    if (!validateForOtpRequest()) return;

    const normalizedName = normalizeNameInput(form.name);
    setLoading(true);
    try {
      const response = await requestOtpForRegistration(normalizedName, form.email.trim().toLowerCase());
      setStage('otp');

      const baseMessage = response?.message || 'OTP sent to your email';
      if (response?.devOtp) {
        Alert.alert('OTP Ready', `${baseMessage}\n\nDev OTP: ${response.devOtp}`);
      } else {
        Alert.alert('OTP Sent', `${baseMessage}\nPlease check your email and enter the OTP.`);
      }
    } catch (err) {
      Alert.alert('OTP Error', err.message || 'Could not send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      Alert.alert('Validation Error', 'Please enter OTP');
      return;
    }

    setLoading(true);
    try {
      await verifyOtpForRegistration(form.email.trim().toLowerCase(), otp.trim());
      setStage('password');
      Alert.alert('Verified', 'OTP verified successfully. Now set your password.');
    } catch (err) {
      Alert.alert('Verification Failed', err.message || 'Could not verify OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    if (!validateForPasswordStep()) return;

    setLoading(true);
    try {
      const user = await register(
        normalizeNameInput(form.name),
        form.email.trim().toLowerCase(),
        form.password,
        form.phone.trim()
      );
      Alert.alert('Account Created!', `Welcome, ${user.name}!`, [
        { text: 'Go to Home', onPress: () => navigation.navigate('Home') },
      ]);
    } catch (err) {
      Alert.alert('Registration Failed', err.message || 'Could not create account');
    } finally {
      setLoading(false);
    }
  };

  const currentStep = stage === 'email' ? 1 : stage === 'otp' ? 2 : 3;
  const emailOk = /^\S+@\S+\.\S+$/.test(form.email.trim());
  const canSendOtp = !loading && !nameError && !phoneError && !!form.name.trim() && emailOk;

  return (
    <KeyboardAvoidingView style={styles.flex1} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Create Account</Text>
          <Text style={styles.headerSubtitle}>Join us and enjoy exclusive member benefits</Text>
        </View>

        <View style={styles.formSection}>
          <StepBadge currentStep={currentStep} />

          <RegisterField
            label="Full Name"
            value={form.name}
            onChangeText={handleNameChange}
            placeholder="Enter your full name"
            showPass={showPass}
            error={nameError}
          />

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <View style={styles.emailRow}>
              <TextInput
                style={[styles.inputEmail, !form.email ? null : !emailOk ? styles.inputError : null]}
                placeholder="Enter your email"
                placeholderTextColor="#666"
                value={form.email}
                onChangeText={handleEmailChange}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={[styles.sendOtpInlineButton, !canSendOtp && styles.buttonDisabled]}
                onPress={handleSendOtp}
                disabled={!canSendOtp}
              >
                {loading && stage === 'email'
                  ? <ActivityIndicator color="#1a1a2e" />
                  : <Text style={styles.sendOtpInlineText}>{stage === 'email' ? 'Send OTP' : 'Resend'}</Text>}
              </TouchableOpacity>
            </View>
            {!form.email ? null : !emailOk ? <Text style={styles.errorText}>Please enter a valid email</Text> : null}
          </View>

          <RegisterField
            label="Phone Number (optional)"
            value={form.phone}
            onChangeText={(value) => handlePhoneChange(normalizePhoneInput(value))}
            placeholder="Enter your phone number"
            keyboard="phone-pad"
            showPass={showPass}
            error={phoneError}
          />

          {stage === 'otp' ? (
            <>
              <RegisterField
                label="Email OTP"
                value={otp}
                onChangeText={setOtp}
                placeholder="Enter 6-digit OTP"
                keyboard="number-pad"
                capitalize="none"
                showPass={showPass}
              />
              <TouchableOpacity
                style={[styles.registerButton, loading && styles.buttonDisabled]}
                onPress={handleVerifyOtp}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#1a1a2e" />
                  : <Text style={styles.registerButtonText}>Verify OTP</Text>}
              </TouchableOpacity>
            </>
          ) : null}

          {stage === 'password' ? (
            <>
              <View style={styles.noticeBox}>
                <Text style={styles.noticeText}>OTP verified. Now set your password to complete account creation.</Text>
              </View>

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
                    <Text style={styles.eyeText}>{showPass ? 'Hide' : 'Show'}</Text>
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
                onPress={handleCreateAccount}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#1a1a2e" />
                  : <Text style={styles.registerButtonText}>Create Account</Text>}
              </TouchableOpacity>
            </>
          ) : null}

          {stage === 'email' ? (
            <View style={styles.noticeBox}>
              <Text style={styles.noticeText}>First step: tap Send OTP. Password comes after OTP verification.</Text>
            </View>
          ) : null}

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
  headerTitle: { color: '#fff', fontSize: 26, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  headerSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 14, textAlign: 'center' },
  formSection: { padding: 30 },
  stepRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  stepText: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '700' },
  stepActive: { color: '#d4af37' },
  inputGroup: { marginBottom: 20 },
  label: { color: '#d4af37', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  emailRow: { flexDirection: 'row', alignItems: 'center' },
  inputEmail: {
    backgroundColor: '#1a1a2e',
    color: '#fff',
    padding: 15,
    borderRadius: 8,
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    flex: 1,
  },
  sendOtpInlineButton: {
    backgroundColor: '#d4af37',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginLeft: 8,
    minWidth: 92,
    alignItems: 'center',
  },
  sendOtpInlineText: { color: '#1a1a2e', fontSize: 13, fontWeight: '700' },
  input: {
    backgroundColor: '#1a1a2e',
    color: '#fff',
    padding: 15,
    borderRadius: 8,
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    color: '#f87171',
    fontSize: 12,
    marginTop: 6,
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
  eyeBtn: {
    backgroundColor: '#1a1a2e',
    padding: 15,
    borderRadius: 8,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  eyeText: { color: '#d4af37', fontWeight: '700' },
  registerButton: { backgroundColor: '#d4af37', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 5 },
  noticeBox: {
    backgroundColor: 'rgba(212,175,55,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.35)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  noticeText: { color: '#f2deb0', fontSize: 13, lineHeight: 18 },
  buttonDisabled: { opacity: 0.6 },
  registerButtonText: { color: '#1a1a2e', fontSize: 16, fontWeight: 'bold' },
  loginLink: { alignItems: 'center', marginTop: 20 },
  loginLinkText: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  loginLinkBold: { color: '#d4af37', fontWeight: 'bold' },
});

export default RegisterScreen;
