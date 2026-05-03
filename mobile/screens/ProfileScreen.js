import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { getMyBookings, cancelBooking } from '../services/api';
import colors from '../theme/colors';
import { isValidSriLankanPhone, normalizePhoneInput } from '../utils/phoneUtils';
import { isValidPersonName, normalizeNameInput } from '../utils/nameUtils';

const ProfileScreen = () => {
  const navigation = useNavigation();
  const { user, logout, isAdmin, updateProfile } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editVisible, setEditVisible] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '' });

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

  const openEditModal = () => {
    setEditForm({
      name: String(user?.name || ''),
      email: String(user?.email || ''),
      phone: String(user?.phone || ''),
    });
    setEditVisible(true);
  };

  const handleSaveProfile = async () => {
    const normalizedName = normalizeNameInput(editForm.name);
    const normalizedEmail = String(editForm.email || '').trim().toLowerCase();
    const normalizedPhone = String(editForm.phone || '').trim();

    if (!normalizedName) {
      Alert.alert('Validation Error', 'Name is required');
      return;
    }

    if (!isValidPersonName(normalizedName)) {
      Alert.alert('Validation Error', 'Name can only contain letters and spaces');
      return;
    }

    if (!normalizedEmail || !/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      Alert.alert('Validation Error', 'Please enter a valid email');
      return;
    }

    if (!isValidSriLankanPhone(normalizedPhone)) {
      Alert.alert('Validation Error', 'Enter a valid Sri Lankan phone number (e.g. 0771234567 or +94771234567)');
      return;
    }

    setSavingEdit(true);
    try {
      await updateProfile({
        name: normalizedName,
        email: normalizedEmail,
        phone: normalizedPhone,
      });
      setEditVisible(false);
      Alert.alert('Saved', 'Profile updated successfully');
    } catch (error) {
      Alert.alert('Update Failed', error.message || 'Could not update profile');
    } finally {
      setSavingEdit(false);
    }
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

        <View style={styles.profileDetails}>
          <Text style={styles.profileName}>{user.name}</Text>
          <Text style={styles.profileEmail}>{user.email}</Text>
          {user.phone ? <Text style={styles.profilePhone}>{user.phone}</Text> : null}
          <View style={[styles.roleBadge, { backgroundColor: isAdmin ? '#2a3460' : '#1a1f32' }]}>
            <Text style={styles.roleText}>{isAdmin ? 'Admin' : 'Guest'}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.editBtn} onPress={openEditModal}>
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
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
              {item.promotionCode ? (
                <Text style={styles.bookingPromo}>Promo: {item.promotionCode}</Text>
              ) : null}
              {Number(item.discountAmount || 0) > 0 ? (
                <Text style={styles.bookingDiscount}>Discount: -Rs. {Number(item.discountAmount).toLocaleString()}</Text>
              ) : null}
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

      <Modal visible={editVisible} transparent animationType="slide" onRequestClose={() => setEditVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Profile</Text>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Name</Text>
              <TextInput
                style={styles.modalInput}
                value={editForm.name}
                onChangeText={(value) => setEditForm((prev) => ({ ...prev, name: value }))}
                placeholder="Your name"
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Email</Text>
              <TextInput
                style={styles.modalInput}
                value={editForm.email}
                onChangeText={(value) => setEditForm((prev) => ({ ...prev, email: value }))}
                placeholder="you@example.com"
                placeholderTextColor="#666"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Phone</Text>
              <TextInput
                style={styles.modalInput}
                value={editForm.phone}
                onChangeText={(value) => setEditForm((prev) => ({ ...prev, phone: normalizePhoneInput(value) }))}
                placeholder="Optional phone number"
                placeholderTextColor="#666"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setEditVisible(false)}
                disabled={savingEdit}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, savingEdit && styles.btnDisabled]}
                onPress={handleSaveProfile}
                disabled={savingEdit}
              >
                {savingEdit ? <ActivityIndicator color={colors.navy900} /> : <Text style={styles.modalSaveText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  profileDetails: {
    flex: 1,
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
    marginBottom: 3,
  },
  profilePhone: {
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
  editBtn: {
    borderWidth: 1,
    borderColor: colors.gold500,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editBtnText: {
    color: colors.gold500,
    fontSize: 13,
    fontWeight: '700',
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
  bookingPromo: {
    color: '#d4af37',
    fontSize: 12,
    marginBottom: 3,
  },
  bookingDiscount: {
    color: '#22c55e',
    fontSize: 12,
    marginBottom: 3,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: colors.navy800,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.25)',
  },
  modalTitle: {
    color: colors.gold500,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  modalField: {
    marginBottom: 10,
  },
  modalLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginBottom: 5,
  },
  modalInput: {
    backgroundColor: colors.navy900,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    color: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  modalCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
  },
  modalCancelText: {
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
  },
  modalSaveBtn: {
    flex: 1,
    backgroundColor: colors.gold500,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
  },
  modalSaveText: {
    color: colors.navy900,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.7,
  },
});

export default ProfileScreen;
