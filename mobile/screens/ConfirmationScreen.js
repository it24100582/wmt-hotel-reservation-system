import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

const ConfirmationScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { booking, room } = route.params || {};

  if (!booking) {
    return (
      <View style={styles.center}>
        <Text style={styles.errText}>No booking data.</Text>
      </View>
    );
  }

  const fmt = (dateStr) => {
    const parsed = new Date(dateStr);
    if (Number.isNaN(parsed.getTime())) return '-';
    return parsed.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const bookingShortId = booking?._id ? String(booking._id).slice(-8).toUpperCase() : 'N/A';

  const statusColor = {
    Pending: '#f59e0b',
    Approved: '#22c55e',
    Rejected: '#ef4444',
    Cancelled: '#6b7280',
  }[booking.status] || '#aaa';

  return (
    <ScrollView style={styles.container}>
      <View style={styles.successBanner}>
        <Text style={styles.successIcon}>OK</Text>
        <Text style={styles.successTitle}>Booking Submitted!</Text>
        <Text style={styles.successSubtitle}>
          Your booking request has been received. Hotel staff will approve it shortly.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Booking Confirmation</Text>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Booking ID</Text>
          <Text style={styles.rowValue}>#{bookingShortId}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Room</Text>
          <Text style={styles.rowValue}>
            #{booking.roomId?.roomNumber || room?.roomNumber} - {booking.roomId?.roomType || room?.roomType}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Check-In</Text>
          <Text style={styles.rowValue}>{fmt(booking.startDate)}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Check-Out</Text>
          <Text style={styles.rowValue}>{fmt(booking.endDate)}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Total Amount</Text>
          <Text style={[styles.rowValue, { color: '#d4af37', fontWeight: 'bold' }]}>
            Rs. {Number(booking.totalAmount).toLocaleString()}
          </Text>
        </View>

        {Number(booking.discountAmount || 0) > 0 ? (
          <>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Subtotal</Text>
              <Text style={styles.rowValue}>Rs. {Number(booking.subtotalAmount || booking.totalAmount).toLocaleString()}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.rowLabel}>Discount</Text>
              <Text style={[styles.rowValue, { color: '#22c55e', fontWeight: 'bold' }]}>
                - Rs. {Number(booking.discountAmount).toLocaleString()}
              </Text>
            </View>
          </>
        ) : null}

        {booking.promotionCode ? (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Promo Code</Text>
            <Text style={styles.rowValue}>{booking.promotionCode}</Text>
          </View>
        ) : null}

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Status</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '22' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{booking.status}</Text>
          </View>
        </View>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoIcon}>i</Text>
        <Text style={styles.infoText}>
          Your booking is currently <Text style={{ color: '#f59e0b', fontWeight: 'bold' }}>Pending</Text> approval.
          You will be notified once management reviews your request.
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.btnGold} onPress={() => navigation.navigate('Profile')}>
          <Text style={styles.btnGoldText}>View My Bookings</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnOutline} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.btnOutlineText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f1a' },
  errText: { color: '#fff' },
  successBanner: {
    backgroundColor: '#1a1a2e',
    padding: 30,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#d4af37',
  },
  successIcon: { fontSize: 28, marginBottom: 15, color: '#22c55e', fontWeight: '700' },
  successTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  successSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 14, textAlign: 'center', lineHeight: 22 },
  card: { margin: 20, backgroundColor: '#1a1a2e', borderRadius: 12, padding: 20 },
  cardTitle: { color: '#d4af37', fontSize: 16, fontWeight: 'bold', marginBottom: 15 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  rowLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 14 },
  rowValue: { color: '#fff', fontSize: 14, fontWeight: '500', textAlign: 'right', flex: 1, marginLeft: 10 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  statusText: { fontSize: 13, fontWeight: 'bold' },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(245,158,11,0.1)',
    margin: 20,
    marginTop: 0,
    borderRadius: 8,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
  },
  infoIcon: { fontSize: 20, marginRight: 10, color: '#f59e0b', fontWeight: '700' },
  infoText: { color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 20, flex: 1 },
  actions: { padding: 20, gap: 12 },
  btnGold: { backgroundColor: '#d4af37', padding: 16, borderRadius: 10, alignItems: 'center' },
  btnGoldText: { color: '#1a1a2e', fontSize: 16, fontWeight: 'bold' },
  btnOutline: {
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnOutlineText: { color: '#fff', fontSize: 16 },
});

export default ConfirmationScreen;
