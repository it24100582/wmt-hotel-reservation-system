import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { createBooking, uploadBankTransferProof, validatePromotionCode } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { isValidSriLankanPhone, normalizePhoneInput } from '../utils/phoneUtils';
import { isValidPersonName, normalizeNameInput } from '../utils/nameUtils';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const CARDHOLDER_NAME_REGEX = /^[A-Za-z]+(?:\s+[A-Za-z]+)*$/;
// Sri Lankan NIC:
// - New NIC: 12 digits (e.g. 200012345678)
// - Old NIC: 9 digits + V (e.g. 991234567V)
const NIC_REGEX = /^(?:\d{12}|\d{9}V)$/;

const isValidDateValue = (value) => DATE_REGEX.test(value) && !Number.isNaN(new Date(value).getTime());
const onlyDigits = (value) => value.replace(/\D/g, '');
const formatCardNumber = (value) => {
  const digits = onlyDigits(value).slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
};
const formatExpiry = (value) => {
  const digits = onlyDigits(value).slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
};
const formatCardholderName = (value) =>
  value
    .replace(/[^A-Za-z\s]/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^\s+/, '');

const getExpiryValidationMessage = (value) => {
  if (!value) return '';

  if (value.length >= 2) {
    const month = Number(value.slice(0, 2));
    if (month < 1 || month > 12) return 'Expiry month must be between 01 and 12.';
  }

  if (value.length < 5) return '';
  if (!/^\d{2}\/\d{2}$/.test(value)) return 'Please enter expiry as MM/YY.';

  const [monthText, yearText] = value.split('/');
  const month = Number(monthText);
  const year = Number(yearText);
  const now = new Date();
  const currentYear = now.getFullYear() % 100;
  const currentMonth = now.getMonth() + 1;

  if (year < currentYear || (year === currentYear && month < currentMonth)) {
    return 'Card expiry date cannot be in the past.';
  }

  return '';
};

const BookingScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const room = route.params?.room;
  const searchCriteria = route.params?.searchCriteria || {};

  const today = new Date();
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const fmtDate = (d) => d.toISOString().split('T')[0];
  const defaultStartDate = isValidDateValue(searchCriteria?.checkIn) ? searchCriteria.checkIn : fmtDate(today);
  const rawDefaultEndDate = isValidDateValue(searchCriteria?.checkOut) ? searchCriteria.checkOut : fmtDate(nextWeek);
  const defaultEndDate =
    new Date(rawDefaultEndDate) > new Date(defaultStartDate)
      ? rawDefaultEndDate
      : fmtDate(new Date(new Date(defaultStartDate).getTime() + 24 * 60 * 60 * 1000));

  const nameParts = String(user?.name || '').trim().split(/\s+/).filter(Boolean);
  const initialFirstName = nameParts[0] || '';
  const initialLastName = nameParts.slice(1).join(' ') || '';

  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const [guestFirstName, setGuestFirstName] = useState(initialFirstName);
  const [guestLastName, setGuestLastName] = useState(initialLastName);
  const [guestEmail, setGuestEmail] = useState(String(user?.email || '').trim().toLowerCase());
  const [guestPhone, setGuestPhone] = useState(normalizePhoneInput(String(user?.phone || '')));
  const [nicPassport, setNicPassport] = useState('');
  const [adults, setAdults] = useState(Math.max(1, Number(searchCriteria?.guests) || 2));
  const [children, setChildren] = useState(0);
  const [specialRequests, setSpecialRequests] = useState({
    earlyCheckIn: false,
    lateCheckOut: false,
    babyCot: false,
    extraTowels: false,
  });

  const [paymentMethod, setPaymentMethod] = useState('Card');
  const [cardName, setCardName] = useState(String(user?.name || ''));
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [expiryError, setExpiryError] = useState('');
  const [promotionCode, setPromotionCode] = useState(String(searchCriteria?.promotionCode || '').trim().toUpperCase());
  const [promotionApplied, setPromotionApplied] = useState(null);
  const [promotionError, setPromotionError] = useState('');
  const [promotionApplyLoading, setPromotionApplyLoading] = useState(false);
  const [proofUploadLoading, setProofUploadLoading] = useState(false);
  const [bankTransferProof, setBankTransferProof] = useState(null);
  const [showCheckInPicker, setShowCheckInPicker] = useState(false);
  const [showCheckOutPicker, setShowCheckOutPicker] = useState(false);

  if (!room) {
    return (
      <View style={styles.center}>
        <Text style={styles.errText}>No room selected.</Text>
      </View>
    );
  }

  const calcDays = () => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return 1;
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  };

  const days = calcDays();
  const dailyRate = Number(room.pricePerDay ?? room.pricePerMonth) || 0;
  const subtotalAmount = Number((days * dailyRate).toFixed(2));
  const discountAmount = Number(promotionApplied?.discountAmount || 0);
  const totalAmount = Number(Math.max(subtotalAmount - discountAmount, 0).toFixed(2));
  const totalGuests = Number(adults) + Number(children);

  const validateDate = (str) => DATE_REGEX.test(str) && !Number.isNaN(new Date(str).getTime());
  const todayStr = fmtDate(today);
  const checkInDateObj = validateDate(startDate) ? new Date(startDate) : new Date(todayStr);
  const checkOutDateObj = validateDate(endDate)
    ? new Date(endDate)
    : new Date(checkInDateObj.getTime() + 24 * 60 * 60 * 1000);

  const firstNameError = useMemo(() => {
    if (!guestFirstName) return '';
    const normalized = normalizeNameInput(guestFirstName);
    if (!isValidPersonName(normalized)) return 'First name must contain only letters and spaces.';
    return '';
  }, [guestFirstName]);

  const lastNameError = useMemo(() => {
    if (!guestLastName) return '';
    const normalized = normalizeNameInput(guestLastName);
    if (!isValidPersonName(normalized)) return 'Last name must contain only letters and spaces.';
    return '';
  }, [guestLastName]);

  const emailError = useMemo(() => {
    if (!guestEmail) return '';
    if (!/^\S+@\S+\.\S+$/.test(String(guestEmail).trim().toLowerCase())) {
      return 'Please enter a valid email address.';
    }
    return '';
  }, [guestEmail]);

  const phoneError = useMemo(() => {
    if (!guestPhone) return '';
    if (!isValidSriLankanPhone(normalizePhoneInput(guestPhone))) {
      return 'Use Sri Lankan format: 0771234567 or +94771234567';
    }
    return '';
  }, [guestPhone]);

  const nicError = useMemo(() => {
    if (!nicPassport) return '';
    if (!NIC_REGEX.test(String(nicPassport).trim().toUpperCase())) {
      return 'NIC must be 12 digits or 9 digits followed by V.';
    }
    return '';
  }, [nicPassport]);

  const checkInError = useMemo(() => {
    if (!startDate) return '';
    if (!validateDate(startDate)) return 'Use YYYY-MM-DD format.';
    if (new Date(startDate) < new Date(todayStr)) return 'Check-in cannot be in the past.';
    return '';
  }, [startDate, todayStr]);

  const checkOutError = useMemo(() => {
    if (!endDate) return '';
    if (!validateDate(endDate)) return 'Use YYYY-MM-DD format.';
    return '';
  }, [endDate]);

  const stayRangeError = useMemo(() => {
    if (!validateDate(startDate) || !validateDate(endDate)) return '';
    if (new Date(endDate) <= new Date(startDate)) return 'Check-out must be after check-in.';
    return '';
  }, [startDate, endDate]);

  const guestCapacityError = useMemo(() => {
    if (totalGuests > Number(room.capacity)) {
      return `This room supports up to ${room.capacity} guests.`;
    }
    return '';
  }, [totalGuests, room.capacity]);

  const validateGuestInfo = () => {
    const first = normalizeNameInput(guestFirstName);
    const last = normalizeNameInput(guestLastName);
    const email = String(guestEmail || '').trim().toLowerCase();
    const phone = normalizePhoneInput(guestPhone);
    const nic = String(nicPassport || '').trim().toUpperCase();

    if (!first || !isValidPersonName(first)) {
      Alert.alert('Validation Error', 'First name must contain only letters and spaces.');
      return false;
    }
    if (!last || !isValidPersonName(last)) {
      Alert.alert('Validation Error', 'Last name must contain only letters and spaces.');
      return false;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      Alert.alert('Validation Error', 'Please enter a valid email address.');
      return false;
    }
    if (!isValidSriLankanPhone(phone)) {
      Alert.alert('Validation Error', 'Enter a valid Sri Lankan phone number (e.g. 0771234567 or +94771234567).');
      return false;
    }
    if (!NIC_REGEX.test(nic)) {
      Alert.alert('Validation Error', 'NIC must be 12 digits or 9 digits followed by V.');
      return false;
    }
    return true;
  };

  const validateBookingDetails = () => {
    if (!validateGuestInfo()) return false;

    if (!validateDate(startDate)) {
      Alert.alert('Invalid Date', 'Please enter check-in as YYYY-MM-DD');
      return false;
    }
    if (!validateDate(endDate)) {
      Alert.alert('Invalid Date', 'Please enter check-out as YYYY-MM-DD');
      return false;
    }
    if (new Date(endDate) <= new Date(startDate)) {
      Alert.alert('Invalid Dates', 'Check-out must be after check-in');
      return false;
    }
    if (new Date(startDate) < new Date(fmtDate(today))) {
      Alert.alert('Invalid Date', 'Check-in cannot be in the past');
      return false;
    }
    if (totalGuests > Number(room.capacity)) {
      Alert.alert('Guest Limit', `This room supports up to ${room.capacity} guests.`);
      return false;
    }
    return true;
  };

  const validatePayment = () => {
    if (paymentMethod === 'Bank Transfer' && !bankTransferProof?.proofUrl) {
      Alert.alert('Payment Details', 'Please upload transfer proof (photo or PDF) for Bank Transfer.');
      return false;
    }

    if (paymentMethod !== 'Card') return true;

    if (!CARDHOLDER_NAME_REGEX.test(cardName.trim())) {
      Alert.alert('Payment Details', 'Cardholder name must contain letters only.');
      return false;
    }

    const digits = cardNumber.replace(/\s+/g, '');
    if (!/^\d{16}$/.test(digits)) {
      Alert.alert('Payment Details', 'Card number must be exactly 16 digits.');
      return false;
    }

    const expiryValidationMessage = getExpiryValidationMessage(expiry);
    if (expiryValidationMessage) {
      Alert.alert('Payment Details', expiryValidationMessage);
      return false;
    }

    if (!/^\d{3}$/.test(cvv)) {
      Alert.alert('Payment Details', 'CVV must be exactly 3 digits.');
      return false;
    }

    return true;
  };

  const specialRequestList = useMemo(() => {
    const selected = [];
    if (specialRequests.earlyCheckIn) selected.push('Early check-in (subject to availability)');
    if (specialRequests.lateCheckOut) selected.push('Late check-out');
    if (specialRequests.babyCot) selected.push('Baby cot setup');
    if (specialRequests.extraTowels) selected.push('Extra towels / pillows');
    return selected;
  }, [specialRequests]);

  const handleUploadBankTransferProof = async () => {
    if (paymentMethod !== 'Bank Transfer') return;

    setProofUploadLoading(true);
    try {
      let pickedFile = null;

      let DocumentPicker = null;
      try {
        DocumentPicker = require('expo-document-picker');
      } catch (_error) {
        DocumentPicker = null;
      }

      if (DocumentPicker?.getDocumentAsync) {
        const result = await DocumentPicker.getDocumentAsync({
          type: ['image/*', 'application/pdf'],
          multiple: false,
          copyToCacheDirectory: true,
        });

        if (result?.canceled) {
          setProofUploadLoading(false);
          return;
        }

        const file = result?.assets?.[0];
        if (file?.uri) {
          pickedFile = {
            uri: file.uri,
            name: file.name || `proof-${Date.now()}`,
            mimeType: file.mimeType || 'application/octet-stream',
          };
        }
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permission Required', 'Please allow media library access to upload transfer proof.');
          setProofUploadLoading(false);
          return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.9,
        });

        if (result.canceled) {
          setProofUploadLoading(false);
          return;
        }

        const file = result.assets?.[0];
        if (file?.uri) {
          pickedFile = {
            uri: file.uri,
            name: file.fileName || `proof-${Date.now()}.jpg`,
            mimeType: file.mimeType || 'image/jpeg',
          };
        }
      }

      if (!pickedFile?.uri) {
        Alert.alert('Upload Failed', 'Could not read selected file.');
        setProofUploadLoading(false);
        return;
      }

      const uploaded = await uploadBankTransferProof(pickedFile);
      setBankTransferProof(uploaded);

      if (!DocumentPicker?.getDocumentAsync) {
        Alert.alert('Uploaded', 'Transfer proof image uploaded. Install expo-document-picker to upload PDFs too.');
      } else {
        Alert.alert('Uploaded', 'Transfer proof uploaded successfully.');
      }
    } catch (error) {
      Alert.alert('Upload Failed', error.message || 'Could not upload transfer proof');
    } finally {
      setProofUploadLoading(false);
    }
  };

  const handleBook = async () => {
    if (!validateBookingDetails() || !validatePayment()) return;

    setLoading(true);
    try {
      const codeToSubmit = promotionApplied?.promotion?.code || promotionCode.trim().toUpperCase();
      const cardLast4 = cardNumber.replace(/\s+/g, '').slice(-4);
      const paymentSummary =
        paymentMethod === 'Card' ? `Payment Method: Card (****${cardLast4})` : `Payment Method: ${paymentMethod}`;
      const promoSummary = codeToSubmit ? `Promotion Applied: ${codeToSubmit}` : '';
      const guestSummary = [
        `Guest: ${normalizeNameInput(guestFirstName)} ${normalizeNameInput(guestLastName)}`,
        `Email: ${String(guestEmail || '').trim().toLowerCase()}`,
        `Phone: ${normalizePhoneInput(guestPhone)}`,
        `NIC/Passport: ${String(nicPassport || '').trim().toUpperCase()}`,
        `Guests: ${adults} Adults, ${children} Children`,
      ].join('\n');
      const requestsSummary = specialRequestList.length ? `Special Requests: ${specialRequestList.join(', ')}` : '';
      const proofSummary = bankTransferProof?.proofUrl
        ? `Bank Transfer Proof: ${bankTransferProof.originalName || bankTransferProof.filename || bankTransferProof.proofUrl}`
        : '';
      const combinedNotes = [notes.trim(), guestSummary, requestsSummary, paymentSummary, promoSummary]
        .filter(Boolean)
        .join('\n');
      const combinedNotesWithProof = [combinedNotes, proofSummary].filter(Boolean).join('\n');

      const response = await createBooking({
        roomId: room._id,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        promotionCode: codeToSubmit,
        paymentMethod,
        paymentProofUrl: bankTransferProof?.proofUrl || '',
        paymentProofName: bankTransferProof?.originalName || bankTransferProof?.filename || '',
        paymentProofMime: bankTransferProof?.mimeType || '',
        notes: combinedNotesWithProof,
      });

      navigation.replace('Confirmation', { booking: response.data.booking, room });
    } catch (err) {
      Alert.alert('Booking Failed', err.message || 'Could not create booking');
    } finally {
      setLoading(false);
    }
  };

  const fmt = (str) => {
    if (!validateDate(str)) return str;
    return new Date(str).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleApplyPromotion = async () => {
    if (!promotionCode.trim()) {
      setPromotionError('Enter a promotion code first.');
      setPromotionApplied(null);
      return;
    }
    if (!validateBookingDetails()) return;

    setPromotionApplyLoading(true);
    setPromotionError('');
    try {
      const response = await validatePromotionCode({
        code: promotionCode.trim().toUpperCase(),
        amount: subtotalAmount,
      });
      setPromotionApplied(response.data);
      setPromotionCode(response.data.promotion.code);
      Alert.alert('Promotion Applied', `${response.data.promotion.code} is active and discount has been applied.`);
    } catch (error) {
      setPromotionApplied(null);
      setPromotionError(error.message || 'Could not apply promotion code');
    } finally {
      setPromotionApplyLoading(false);
    }
  };

  const toggleRequest = (key) => {
    setSpecialRequests((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCheckInDateChange = (_event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowCheckInPicker(false);
    }

    if (!selectedDate) return;

    const newStart = fmtDate(selectedDate);
    setStartDate(newStart);
    setPromotionApplied(null);
    setPromotionError('');

    const existingEnd = validateDate(endDate) ? new Date(endDate) : null;
    const nextMinimumEnd = new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000);
    if (!existingEnd || existingEnd <= selectedDate) {
      setEndDate(fmtDate(nextMinimumEnd));
    }
  };

  const handleCheckOutDateChange = (_event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowCheckOutPicker(false);
    }

    if (!selectedDate) return;

    setEndDate(fmtDate(selectedDate));
    setPromotionApplied(null);
    setPromotionError('');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.roomSummary}>
          <Text style={styles.roomSummaryLabel}>Booking for</Text>
          <Text style={styles.roomSummaryTitle}>
            Room #{room.roomNumber} - {room.roomType}
          </Text>
          <Text style={styles.roomSummaryPrice}>Rs. {(room.pricePerDay ?? room.pricePerMonth)?.toLocaleString()}/day</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.stepHeader}>
            <Text style={[styles.stepPill, step === 1 ? styles.stepPillActive : null]}>1. Stay Details</Text>
            <Text style={[styles.stepPill, step === 2 ? styles.stepPillActive : null]}>2. Payment</Text>
          </View>

          {step === 1 ? (
            <>
              <View style={styles.sectionCard}>
                <Text style={styles.sectionHeading}>Guest Information</Text>

                <View style={styles.twoColRow}>
                  <View style={styles.colField}>
                    <Text style={styles.label}>First Name *</Text>
                    <TextInput
                      style={[styles.input, firstNameError ? styles.inputErrorBorder : null]}
                      placeholder="First name"
                      placeholderTextColor="#666"
                      value={guestFirstName}
                      onChangeText={setGuestFirstName}
                    />
                    {firstNameError ? <Text style={styles.inputErrorText}>{firstNameError}</Text> : null}
                  </View>
                  <View style={styles.colField}>
                    <Text style={styles.label}>Last Name *</Text>
                    <TextInput
                      style={[styles.input, lastNameError ? styles.inputErrorBorder : null]}
                      placeholder="Last name"
                      placeholderTextColor="#666"
                      value={guestLastName}
                      onChangeText={setGuestLastName}
                    />
                    {lastNameError ? <Text style={styles.inputErrorText}>{lastNameError}</Text> : null}
                  </View>
                </View>

                <View style={styles.twoColRow}>
                  <View style={styles.colField}>
                    <Text style={styles.label}>Email *</Text>
                    <TextInput
                      style={[styles.input, emailError ? styles.inputErrorBorder : null]}
                      placeholder="you@example.com"
                      placeholderTextColor="#666"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={guestEmail}
                      onChangeText={setGuestEmail}
                    />
                    {emailError ? <Text style={styles.inputErrorText}>{emailError}</Text> : null}
                  </View>
                  <View style={styles.colField}>
                    <Text style={styles.label}>Phone Number *</Text>
                    <TextInput
                      style={[styles.input, phoneError ? styles.inputErrorBorder : null]}
                      placeholder="e.g. 0771234567"
                      placeholderTextColor="#666"
                      keyboardType="phone-pad"
                      value={guestPhone}
                      onChangeText={(value) => setGuestPhone(normalizePhoneInput(value))}
                    />
                    {phoneError ? <Text style={styles.inputErrorText}>{phoneError}</Text> : null}
                  </View>
                </View>

                <Text style={styles.label}>NIC / Passport Number *</Text>
                <TextInput
                  style={[styles.input, nicError ? styles.inputErrorBorder : null]}
                  placeholder="e.g. 200012345678 or 991234567V"
                  placeholderTextColor="#666"
                  autoCapitalize="characters"
                  value={nicPassport}
                  onChangeText={(value) => {
                    const cleaned = String(value || '')
                      .replace(/[^0-9a-zA-Z]/g, '')
                      .toUpperCase()
                      .slice(0, 12);
                    setNicPassport(cleaned);
                  }}
                  maxLength={12}
                />
                {nicError ? <Text style={styles.inputErrorText}>{nicError}</Text> : null}
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionHeading}>Stay Details</Text>

                <Text style={styles.label}>Room Type *</Text>
                <View style={styles.readOnlyInput}>
                  <Text style={styles.readOnlyText}>
                    Room #{room.roomNumber} - {room.roomType} (Capacity {room.capacity})
                  </Text>
                </View>

                <View style={styles.twoColRow}>
                  <View style={styles.colField}>
                    <Text style={styles.label}>Check-In Date *</Text>
                    <TouchableOpacity
                      style={[styles.datePickerTrigger, checkInError ? styles.inputErrorBorder : null]}
                      onPress={() => setShowCheckInPicker(true)}
                    >
                      <Text style={styles.datePickerTriggerText}>{startDate}</Text>
                      <Text style={styles.datePickerIcon}>CAL</Text>
                    </TouchableOpacity>
                    {checkInError ? <Text style={styles.inputErrorText}>{checkInError}</Text> : null}
                    <Text style={styles.dateParsed}>{fmt(startDate)}</Text>
                    {showCheckInPicker ? (
                      <View style={styles.datePickerInlineWrap}>
                        <DateTimePicker
                          value={checkInDateObj}
                          mode="date"
                          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                          minimumDate={new Date(todayStr)}
                          onChange={handleCheckInDateChange}
                        />
                        {Platform.OS === 'ios' ? (
                          <TouchableOpacity style={styles.datePickerDoneBtn} onPress={() => setShowCheckInPicker(false)}>
                            <Text style={styles.datePickerDoneText}>Done</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.colField}>
                    <Text style={styles.label}>Check-Out Date *</Text>
                    <TouchableOpacity
                      style={[styles.datePickerTrigger, checkOutError || stayRangeError ? styles.inputErrorBorder : null]}
                      onPress={() => setShowCheckOutPicker(true)}
                    >
                      <Text style={styles.datePickerTriggerText}>{endDate}</Text>
                      <Text style={styles.datePickerIcon}>CAL</Text>
                    </TouchableOpacity>
                    {checkOutError ? <Text style={styles.inputErrorText}>{checkOutError}</Text> : null}
                    <Text style={styles.dateParsed}>{fmt(endDate)}</Text>
                    {showCheckOutPicker ? (
                      <View style={styles.datePickerInlineWrap}>
                        <DateTimePicker
                          value={checkOutDateObj}
                          mode="date"
                          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                          minimumDate={new Date(checkInDateObj.getTime() + 24 * 60 * 60 * 1000)}
                          onChange={handleCheckOutDateChange}
                        />
                        {Platform.OS === 'ios' ? (
                          <TouchableOpacity style={styles.datePickerDoneBtn} onPress={() => setShowCheckOutPicker(false)}>
                            <Text style={styles.datePickerDoneText}>Done</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                </View>
                {stayRangeError ? <Text style={styles.inputErrorText}>{stayRangeError}</Text> : null}

                <Text style={styles.label}>Adults *</Text>
                <View style={styles.countRow}>
                  {[1, 2, 3, 4].map((count) => (
                    <TouchableOpacity
                      key={`ad-${count}`}
                      style={[styles.countBtn, adults === count ? styles.countBtnActive : null]}
                      onPress={() => setAdults(count)}
                    >
                      <Text style={[styles.countBtnText, adults === count ? styles.countBtnTextActive : null]}>{count}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>Children</Text>
                <View style={styles.countRow}>
                  {[0, 1, 2, 3].map((count) => (
                    <TouchableOpacity
                      key={`ch-${count}`}
                      style={[styles.countBtn, children === count ? styles.countBtnActive : null]}
                      onPress={() => setChildren(count)}
                    >
                      <Text style={[styles.countBtnText, children === count ? styles.countBtnTextActive : null]}>{count}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {guestCapacityError ? <Text style={styles.inputErrorText}>{guestCapacityError}</Text> : null}
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionHeading}>Special Requests</Text>
                {[
                  ['earlyCheckIn', 'Early check-in (subject to availability)'],
                  ['lateCheckOut', 'Late check-out'],
                  ['babyCot', 'Baby cot setup'],
                  ['extraTowels', 'Extra towels / pillows'],
                ].map(([key, label]) => (
                  <TouchableOpacity key={key} style={styles.requestRow} onPress={() => toggleRequest(key)}>
                    <Text style={styles.requestCheck}>{specialRequests[key] ? '[x]' : '[ ]'}</Text>
                    <Text style={styles.requestText}>{label}</Text>
                  </TouchableOpacity>
                ))}

                <Text style={styles.label}>Additional Notes</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Any special requirements or notes for our team..."
                  placeholderTextColor="#666"
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.summary}>
                <Text style={styles.summaryTitle}>Booking Summary</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Check-in</Text>
                  <Text style={styles.summaryValue}>{startDate}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Check-out</Text>
                  <Text style={styles.summaryValue}>{endDate}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Nights</Text>
                  <Text style={styles.summaryValue}>{days}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Guests</Text>
                  <Text style={styles.summaryValue}>
                    {adults} Adults, {children} Children
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Room Rate</Text>
                  <Text style={styles.summaryValue}>Rs. {dailyRate.toLocaleString()}/day</Text>
                </View>
                <View style={[styles.summaryRow, styles.summaryTotal]}>
                  <Text style={styles.summaryTotalLabel}>Subtotal</Text>
                  <Text style={styles.summaryTotalValue}>Rs. {subtotalAmount.toLocaleString()}</Text>
                </View>
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.altBtn} onPress={() => navigation.navigate('Rooms')}>
                  <Text style={styles.altBtnText}>Choose Different Room</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.bookBtn}
                  onPress={() => {
                    if (!validateBookingDetails()) return;
                    setStep(2);
                  }}
                >
                  <Text style={styles.bookBtnText}>Continue to Payment</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.sectionTitle}>Payment Details</Text>
              <Text style={styles.dateHint}>Add payment information to complete your room booking.</Text>

              <Text style={styles.label}>Payment Method</Text>
              <View style={styles.methodRow}>
                {['Card', 'Bank Transfer', 'Pay at Hotel'].map((method) => (
                  <TouchableOpacity
                    key={method}
                    style={[styles.methodBtn, paymentMethod === method ? styles.methodBtnActive : null]}
                    onPress={() => setPaymentMethod(method)}
                  >
                    <Text style={[styles.methodBtnText, paymentMethod === method ? styles.methodBtnTextActive : null]}>
                      {method}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {paymentMethod === 'Card' ? (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Cardholder Name</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Name on card"
                      placeholderTextColor="#666"
                      value={cardName}
                      onChangeText={(value) => setCardName(formatCardholderName(value))}
                      autoCapitalize="words"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Card Number</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="1234 5678 9012 3456"
                      placeholderTextColor="#666"
                      value={cardNumber}
                      onChangeText={(value) => setCardNumber(formatCardNumber(value))}
                      keyboardType="number-pad"
                      maxLength={19}
                    />
                  </View>

                  <View style={styles.paymentRow}>
                    <View style={styles.paymentHalf}>
                      <Text style={styles.label}>Expiry (MM/YY)</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="08/28"
                        placeholderTextColor="#666"
                        value={expiry}
                        onChangeText={(value) => {
                          const formattedExpiry = formatExpiry(value);
                          setExpiry(formattedExpiry);
                          setExpiryError(getExpiryValidationMessage(formattedExpiry));
                        }}
                        onBlur={() => setExpiryError(getExpiryValidationMessage(expiry))}
                        keyboardType="numbers-and-punctuation"
                        maxLength={5}
                      />
                      {expiryError ? <Text style={styles.inputErrorText}>{expiryError}</Text> : null}
                    </View>
                    <View style={styles.paymentHalf}>
                      <Text style={styles.label}>CVV</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="123"
                        placeholderTextColor="#666"
                        value={cvv}
                        onChangeText={(value) => setCvv(onlyDigits(value).slice(0, 3))}
                        keyboardType="number-pad"
                        maxLength={3}
                        secureTextEntry
                      />
                    </View>
                  </View>
                </>
              ) : (
                <View style={styles.paymentInfoBox}>
                  <Text style={styles.paymentInfoText}>
                    {paymentMethod === 'Bank Transfer'
                      ? 'You can submit booking now and complete the transfer later with hotel support.'
                      : 'You can pay at the reception desk during check-in.'}
                  </Text>

                  {paymentMethod === 'Bank Transfer' ? (
                    <View style={styles.bankProofWrap}>
                      <Text style={styles.bankProofTitle}>Transfer Proof (Photo/PDF) *</Text>
                      <TouchableOpacity
                        style={[styles.uploadProofBtn, proofUploadLoading && styles.bookBtnDisabled]}
                        onPress={handleUploadBankTransferProof}
                        disabled={proofUploadLoading}
                      >
                        {proofUploadLoading ? (
                          <ActivityIndicator color="#1a1a2e" />
                        ) : (
                          <Text style={styles.uploadProofBtnText}>
                            {bankTransferProof?.proofUrl ? 'Replace Proof File' : 'Upload Proof File'}
                          </Text>
                        )}
                      </TouchableOpacity>
                      {bankTransferProof?.proofUrl ? (
                        <Text style={styles.uploadProofFileText}>
                          Attached: {bankTransferProof.originalName || bankTransferProof.filename}
                        </Text>
                      ) : (
                        <Text style={styles.uploadProofHintText}>Required for bank transfer confirmation.</Text>
                      )}
                    </View>
                  ) : null}
                </View>
              )}

              <View style={styles.promoBox}>
                <Text style={styles.label}>Promotion Code</Text>
                <View style={styles.promoInputRow}>
                  <TextInput
                    style={[styles.input, styles.promoInput]}
                    placeholder="e.g. SUMMER25"
                    placeholderTextColor="#666"
                    autoCapitalize="characters"
                    value={promotionCode}
                    onChangeText={(value) => {
                      setPromotionCode(value.replace(/\s+/g, '').toUpperCase());
                      setPromotionApplied(null);
                      setPromotionError('');
                    }}
                  />
                  <TouchableOpacity
                    style={[styles.promoApplyBtn, promotionApplyLoading && styles.bookBtnDisabled]}
                    onPress={handleApplyPromotion}
                    disabled={promotionApplyLoading}
                  >
                    {promotionApplyLoading ? <ActivityIndicator color="#1a1a2e" /> : <Text style={styles.promoApplyBtnText}>Apply</Text>}
                  </TouchableOpacity>
                </View>
                {promotionApplied?.promotion?.code ? (
                  <Text style={styles.promoSuccessText}>
                    Applied {promotionApplied.promotion.code}: -Rs. {Number(discountAmount).toLocaleString()}
                  </Text>
                ) : null}
                {promotionError ? <Text style={styles.inputErrorText}>{promotionError}</Text> : null}
              </View>

              <View style={styles.summary}>
                <Text style={styles.summaryTitle}>Amount to Pay</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Subtotal</Text>
                  <Text style={styles.summaryValue}>Rs. {Number(subtotalAmount).toLocaleString()}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Discount</Text>
                  <Text style={[styles.summaryValue, { color: discountAmount > 0 ? '#22c55e' : '#fff' }]}>
                    -Rs. {Number(discountAmount).toLocaleString()}
                  </Text>
                </View>
                <View style={[styles.summaryRow, styles.summaryTotal]}>
                  <Text style={styles.summaryTotalLabel}>Total Amount</Text>
                  <Text style={styles.summaryTotalValue}>Rs. {Number(totalAmount).toLocaleString()}</Text>
                </View>
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)} disabled={loading}>
                  <Text style={styles.backBtnText}>Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.bookBtn, styles.bookBtnFlex, loading && styles.bookBtnDisabled]}
                  onPress={handleBook}
                  disabled={loading}
                >
                  {loading ? <ActivityIndicator color="#1a1a2e" /> : <Text style={styles.bookBtnText}>Pay & Confirm Booking</Text>}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f1a' },
  errText: { color: '#fff' },
  roomSummary: {
    backgroundColor: '#1a1a2e',
    padding: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#d4af37',
  },
  roomSummaryLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 4 },
  roomSummaryTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  roomSummaryPrice: { color: '#d4af37', fontSize: 16, fontWeight: '600' },
  scrollContent: { paddingBottom: 120 },
  form: { padding: 20 },
  stepHeader: { flexDirection: 'row', marginBottom: 18, gap: 10 },
  stepPill: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    color: 'rgba(255,255,255,0.55)',
    paddingVertical: 8,
    borderRadius: 999,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
  },
  stepPillActive: {
    borderColor: '#d4af37',
    color: '#d4af37',
    backgroundColor: 'rgba(212,175,55,0.12)',
  },
  sectionCard: {
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.22)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  sectionHeading: {
    color: '#d4af37',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  twoColRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  colField: { flex: 1 },
  label: { color: '#d4af37', fontSize: 13, fontWeight: '600', marginBottom: 7 },
  input: {
    backgroundColor: '#121226',
    color: '#fff',
    padding: 13,
    borderRadius: 8,
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  datePickerTrigger: {
    backgroundColor: '#121226',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 13,
    paddingVertical: 13,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  datePickerTriggerText: {
    color: '#fff',
    fontSize: 14,
  },
  datePickerIcon: {
    color: '#d4af37',
    fontSize: 11,
    fontWeight: '700',
  },
  datePickerInlineWrap: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 8,
    backgroundColor: '#121226',
    overflow: 'hidden',
  },
  datePickerDoneBtn: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    paddingVertical: 10,
  },
  datePickerDoneText: {
    color: '#d4af37',
    fontWeight: '700',
    fontSize: 13,
  },
  inputErrorBorder: {
    borderColor: '#ef4444',
  },
  readOnlyInput: {
    backgroundColor: '#121226',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 8,
    padding: 13,
    marginBottom: 12,
  },
  readOnlyText: { color: 'rgba(255,255,255,0.9)', fontSize: 14 },
  dateParsed: { color: '#d4af37', fontSize: 10, marginTop: 5 },
  countRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  countBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 8,
    alignItems: 'center',
    paddingVertical: 10,
  },
  countBtnActive: { borderColor: '#d4af37', backgroundColor: 'rgba(212,175,55,0.12)' },
  countBtnText: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600' },
  countBtnTextActive: { color: '#d4af37' },
  requestRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  requestCheck: { color: '#d4af37', width: 28, fontSize: 16, fontWeight: '700' },
  requestText: { color: 'rgba(255,255,255,0.82)', fontSize: 14, flex: 1 },
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  summary: { backgroundColor: '#1a1a2e', borderRadius: 12, padding: 15, marginBottom: 20 },
  summaryTitle: { color: '#d4af37', fontSize: 14, fontWeight: 'bold', marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, gap: 8 },
  summaryLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 14 },
  summaryValue: { color: '#fff', fontSize: 14, textAlign: 'right', flexShrink: 1 },
  summaryTotal: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 12,
    marginTop: 4,
  },
  summaryTotalLabel: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  summaryTotalValue: { color: '#d4af37', fontSize: 18, fontWeight: 'bold' },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  altBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.45)',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  altBtnText: { color: '#d4af37', fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
  sectionTitle: { color: '#d4af37', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  dateHint: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 14 },
  inputGroup: { marginBottom: 20 },
  methodRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  methodBtn: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    paddingVertical: 10,
    alignItems: 'center',
  },
  methodBtnActive: { borderColor: '#d4af37', backgroundColor: 'rgba(212,175,55,0.12)' },
  methodBtnText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  methodBtnTextActive: { color: '#d4af37' },
  paymentRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  paymentHalf: { flex: 1 },
  inputErrorText: { color: '#ef4444', fontSize: 11, marginTop: 6 },
  promoBox: {
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.2)',
    padding: 12,
    marginBottom: 20,
  },
  promoInputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  promoInput: { flex: 1 },
  promoApplyBtn: {
    backgroundColor: '#d4af37',
    borderRadius: 8,
    paddingVertical: 13,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoApplyBtnText: { color: '#1a1a2e', fontWeight: '800', fontSize: 13 },
  promoSuccessText: { color: '#22c55e', fontSize: 12, marginTop: 7 },
  paymentInfoBox: {
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.25)',
    padding: 14,
    marginBottom: 20,
  },
  paymentInfoText: { color: 'rgba(255,255,255,0.75)', fontSize: 13, lineHeight: 20 },
  bankProofWrap: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 12,
  },
  bankProofTitle: {
    color: '#d4af37',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  uploadProofBtn: {
    backgroundColor: '#d4af37',
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadProofBtnText: {
    color: '#1a1a2e',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  uploadProofFileText: {
    color: '#22c55e',
    fontSize: 12,
    marginTop: 8,
  },
  uploadProofHintText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 8,
  },
  backBtn: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 22,
  },
  backBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  bookBtn: { backgroundColor: '#d4af37', padding: 16, borderRadius: 12, alignItems: 'center', flex: 1 },
  bookBtnFlex: { flex: 1 },
  bookBtnDisabled: { opacity: 0.6 },
  bookBtnText: { color: '#1a1a2e', fontSize: 15, fontWeight: 'bold', textTransform: 'uppercase' },
});

export default BookingScreen;
