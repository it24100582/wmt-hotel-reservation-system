import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { createBooking } from '../services/api';
import { useAuth } from '../context/AuthContext';

const BookingScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const room = route.params?.room;

  // Simple text-based date inputs (YYYY-MM-DD) – compatible with Expo Go
  const today = new Date();
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const fmtDate = (d) => d.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(fmtDate(today));
  const [endDate, setEndDate] = useState(fmtDate(nextWeek));
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  if (!room) {
    return <View style={styles.center}><Text style={styles.errText}>No room selected.</Text></View>;
  }

  const calcDays = () => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start) || isNaN(end) || end <= start) return 1;
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  };

  const days = calcDays();
  const dailyRate = Math.round(room.pricePerMonth / 30);
  const totalAmount = (days * dailyRate).toFixed(2);

  const validateDate = (str) => /^\d{4}-\d{2}-\d{2}$/.test(str) && !isNaN(new Date(str));

  const handleBook = async () => {
    if (!validateDate(startDate)) {
      Alert.alert('Invalid Date', 'Please enter check-in as YYYY-MM-DD');
      return;
    }
    if (!validateDate(endDate)) {
      Alert.alert('Invalid Date', 'Please enter check-out as YYYY-MM-DD');
      return;
    }
    if (new Date(endDate) <= new Date(startDate)) {
      Alert.alert('Invalid Dates', 'Check-out must be after check-in');
      return;
    }
    if (new Date(startDate) < new Date(fmtDate(today))) {
      Alert.alert('Invalid Date', 'Check-in cannot be in the past');
      return;
    }

    setLoading(true);
    try {
      const response = await createBooking({
        roomId: room._id,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        notes,
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
    return new Date(str).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.roomSummary}>
        <Text style={styles.roomSummaryLabel}>Booking for</Text>
        <Text style={styles.roomSummaryTitle}>Room #{room.roomNumber} – {room.roomType}</Text>
        <Text style={styles.roomSummaryPrice}>Rs. {room.pricePerMonth?.toLocaleString()}/month</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.sectionTitle}>Select Dates</Text>
        <Text style={styles.dateHint}>Enter dates in YYYY-MM-DD format (e.g. 2026-06-01)</Text>

        <View style={styles.datesRow}>
          <View style={styles.dateField}>
            <Text style={styles.dateLabel}>📅 Check-In</Text>
            <TextInput
              style={styles.dateInput}
              value={startDate}
              onChangeText={setStartDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#555"
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />
            <Text style={styles.dateParsed}>{fmt(startDate)}</Text>
          </View>

          <View style={styles.dateSep}>
            <Text style={styles.dateSepText}>→</Text>
          </View>

          <View style={styles.dateField}>
            <Text style={styles.dateLabel}>📅 Check-Out</Text>
            <TextInput
              style={styles.dateInput}
              value={endDate}
              onChangeText={setEndDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#555"
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />
            <Text style={styles.dateParsed}>{fmt(endDate)}</Text>
          </View>
        </View>

        {/* Quick duration presets */}
        <View style={styles.presets}>
          {[7, 14, 30].map(d => (
            <TouchableOpacity
              key={d}
              style={styles.presetBtn}
              onPress={() => {
                const s = new Date();
                const e = new Date(s.getTime() + d * 24 * 60 * 60 * 1000);
                setStartDate(fmtDate(s));
                setEndDate(fmtDate(e));
              }}
            >
              <Text style={styles.presetBtnText}>{d} days</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Special Requests (optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Any special requirements..."
            placeholderTextColor="#666"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Price Breakdown</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Daily rate</Text>
            <Text style={styles.summaryValue}>Rs. {dailyRate.toLocaleString()}/day</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Duration</Text>
            <Text style={styles.summaryValue}>{days} night{days !== 1 ? 's' : ''}</Text>
          </View>
          <View style={[styles.summaryRow, styles.summaryTotal]}>
            <Text style={styles.summaryTotalLabel}>Total Amount</Text>
            <Text style={styles.summaryTotalValue}>Rs. {Number(totalAmount).toLocaleString()}</Text>
          </View>
        </View>

        <View style={styles.guestInfo}>
          <Text style={styles.guestInfoTitle}>Guest Information</Text>
          <Text style={styles.guestInfoText}>👤 {user?.name}</Text>
          <Text style={styles.guestInfoText}>📧 {user?.email}</Text>
        </View>

        <TouchableOpacity
          style={[styles.bookBtn, loading && styles.bookBtnDisabled]}
          onPress={handleBook}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#1a1a2e" />
            : <Text style={styles.bookBtnText}>Confirm Booking</Text>
          }
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f1a' },
  errText: { color: '#fff' },
  roomSummary: { backgroundColor: '#1a1a2e', padding: 20, borderBottomWidth: 2, borderBottomColor: '#d4af37' },
  roomSummaryLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 4 },
  roomSummaryTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  roomSummaryPrice: { color: '#d4af37', fontSize: 16, fontWeight: '600' },
  form: { padding: 20 },
  sectionTitle: { color: '#d4af37', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  dateHint: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 14 },
  datesRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14, gap: 8 },
  dateField: { flex: 1 },
  dateLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 6 },
  dateInput: { backgroundColor: '#1a1a2e', color: '#fff', padding: 12, borderRadius: 8, fontSize: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', textAlign: 'center' },
  dateParsed: { color: '#d4af37', fontSize: 10, marginTop: 5, textAlign: 'center' },
  dateSep: { justifyContent: 'center', paddingTop: 30 },
  dateSepText: { color: '#d4af37', fontSize: 20 },
  presets: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  presetBtn: { flex: 1, paddingVertical: 7, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(212,175,55,0.4)', alignItems: 'center' },
  presetBtnText: { color: '#d4af37', fontSize: 12 },
  inputGroup: { marginBottom: 20 },
  label: { color: '#d4af37', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { backgroundColor: '#1a1a2e', color: '#fff', padding: 15, borderRadius: 8, fontSize: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  textArea: { height: 80, textAlignVertical: 'top' },
  summary: { backgroundColor: '#1a1a2e', borderRadius: 12, padding: 15, marginBottom: 20 },
  summaryTitle: { color: '#d4af37', fontSize: 14, fontWeight: 'bold', marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 14 },
  summaryValue: { color: '#fff', fontSize: 14 },
  summaryTotal: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 12, marginTop: 4 },
  summaryTotalLabel: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  summaryTotalValue: { color: '#d4af37', fontSize: 18, fontWeight: 'bold' },
  guestInfo: { backgroundColor: '#1a1a2e', borderRadius: 12, padding: 15, marginBottom: 20 },
  guestInfoTitle: { color: '#d4af37', fontSize: 14, fontWeight: 'bold', marginBottom: 10 },
  guestInfoText: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 6 },
  bookBtn: { backgroundColor: '#d4af37', padding: 18, borderRadius: 12, alignItems: 'center' },
  bookBtnDisabled: { opacity: 0.6 },
  bookBtnText: { color: '#1a1a2e', fontSize: 16, fontWeight: 'bold' },
});

export default BookingScreen;