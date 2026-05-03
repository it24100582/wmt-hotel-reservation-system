import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { getMyBookings, cancelBooking } from '../services/api';
import colors from '../theme/colors';

const ProfileScreen = () => {
  const navigation = useNavigation();
  const { user, logout, isAdmin } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!user) {
        setLoading(false);
        return;
      }

      const fetchBookings = async () => {
        try {
          const res = await getMyBookings();
          setBookings(res.data.bookings || []);
        } catch (err) {
          console.log('Profile bookings error:', err?.message || err);
        } finally {
          setLoading(false);
        }
      };

      fetchBookings();
    }, [user])
  );

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          navigation.navigate('Home');
        },
      },
    ]);
  };

  const handleCancel = (id) => {
    Alert.alert('Cancel Booking', 'Are you sure you want to cancel this booking?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelBooking(id);
            setBookings((current) => current.filter((booking) => booking._id !== id));
            Alert.alert('Cancelled', 'Your booking has been cancelled.');
          } catch (err) {
            Alert.alert('Error', err.message || 'Could not cancel booking');
          }
        },
      },
    ]);
  };

  const statusColor = (status) => {
    const map = {
      Pending: '#f59e0b',
      Approved: '#22c55e',
      Rejected: '#ef4444',
      Cancelled: '#6b7280',
    };

    return map[status] || '#aaaaaa';
  };

  const formatDate = (value) =>
    new Date(value).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  if (!user) {
    return (
      <View style={styles.notLoggedIn}>
        <Text style={styles.notLoggedInIcon}>LOCK</Text>
        <Text style={styles.notLoggedInTitle}>Not signed in</Text>
        <Text style={styles.notLoggedInSub}>Please sign in to view your profile and bookings.</Text>
        <TouchableOpacity style={styles.btnGold} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.btnGoldText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user.name?.charAt(0).toUpperCase()}</Text>
        </View>

        <View>
          <Text style={styles.profileName}>{user.name}</Text>
          <Text style={styles.profileEmail}>{user.email}</Text>
          <View style={[styles.roleBadge, { backgroundColor: isAdmin ? '#2a3460' : '#1a1f32' }]}>
            <Text style={styles.roleText}>{isAdmin ? 'Admin' : 'Guest'}</Text>
          </View>
        </View>
      </View>

      {isAdmin && (
        <TouchableOpacity style={styles.adminBtn} onPress={() => navigation.navigate('Admin')}>
          <Text style={styles.adminBtnText}>Hotel Canvas Admin Dashboard</Text>
        </TouchableOpacity>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Bookings ({bookings.length})</Text>

        {loading ? (
          <ActivityIndicator color={colors.gold500} style={{ marginTop: 20 }} />
        ) : bookings.length === 0 ? (
          <View style={styles.emptyBookings}>
            <Text style={styles.emptyIcon}>ROOMS</Text>
            <Text style={styles.emptyText}>No bookings yet</Text>
            <TouchableOpacity style={styles.btnGold} onPress={() => navigation.navigate('Rooms')}>
              <Text style={styles.btnGoldText}>Browse Rooms</Text>
            </TouchableOpacity>
          </View>
        ) : (
          bookings.map((item) => (
            <View key={item._id} style={styles.bookingCard}>
              <View style={styles.bookingHeader}>
                <Text style={styles.bookingRoom}>
                  Room #{item.roomId?.roomNumber || '-'} - {item.roomId?.roomType || '-'}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: `${statusColor(item.status)}22` }]}>
                  <Text style={[styles.statusText, { color: statusColor(item.status) }]}>{item.status}</Text>
                </View>
              </View>

              <Text style={styles.bookingDates}>
                Stay: {formatDate(item.startDate)} to {formatDate(item.endDate)}
              </Text>
              <Text style={styles.bookingAmount}>Rs. {Number(item.totalAmount).toLocaleString()}</Text>

              {item.status === 'Pending' && (
                <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancel(item._id)}>
                  <Text style={styles.cancelBtnText}>Cancel Booking</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutBtnText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.navy900,
  },
  notLoggedIn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.navy900,
    padding: 30,
  },
  notLoggedInIcon: {
    fontSize: 22,
    marginBottom: 15,
    color: colors.gold500,
    fontWeight: '700',
  },
  notLoggedInTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  notLoggedInSub: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 25,
  },
  profileHeader: {
    backgroundColor: colors.navy800,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.gold500,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: colors.navy900,
    fontSize: 26,
    fontWeight: 'bold',
  },
  profileName: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  profileEmail: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    marginBottom: 6,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  roleText: {
    color: colors.gold500,
    fontSize: 12,
    fontWeight: '600',
  },
  adminBtn: {
    margin: 15,
    backgroundColor: colors.gold500,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  adminBtnText: {
    color: colors.navy900,
    fontSize: 15,
    fontWeight: 'bold',
  },
  section: {
    padding: 15,
  },
  sectionTitle: {
    color: colors.gold500,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  bookingCard: {
    backgroundColor: colors.navy800,
    borderRadius: 10,
    padding: 15,
    marginBottom: 12,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bookingRoom: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 15,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  bookingDates: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13,
    marginBottom: 6,
  },
  bookingAmount: {
    color: colors.gold500,
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: '#ef4444',
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#ef4444',
    fontSize: 13,
  },
  emptyBookings: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyIcon: {
    fontSize: 18,
    color: colors.gold500,
    fontWeight: '700',
    marginBottom: 10,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
    marginBottom: 20,
  },
  logoutBtn: {
    margin: 15,
    marginTop: 5,
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ef4444',
    alignItems: 'center',
  },
  logoutBtnText: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: 'bold',
  },
  btnGold: {
    backgroundColor: colors.gold500,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  btnGoldText: {
    color: colors.navy900,
    fontSize: 15,
    fontWeight: 'bold',
  },
});

export default ProfileScreen;
