import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
  Image,
  Platform,
} from 'react-native';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { API_BASE_URL, BASE_URL, getRooms } from '../services/api';
import { useAuth } from '../context/AuthContext';

const TYPES = ['All', 'Single', 'Double', 'Deluxe', 'Suite', 'Family'];

const ROOM_TYPE_IMAGES = {
  single: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=80',
  double: 'https://images.unsplash.com/photo-1616594039964-3d5d6f4f0f5a?auto=format&fit=crop&w=1200&q=80',
  deluxe: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=80',
  suite: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
  family: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
};

const getRoomImage = (room) => {
  if (room?.imageUrl) {
    return room.imageUrl.startsWith('/') ? `${BASE_URL}${room.imageUrl}` : room.imageUrl;
  }

  return ROOM_TYPE_IMAGES[(room?.roomType || '').toLowerCase()] || ROOM_TYPE_IMAGES.single;
};

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const parseDateString = (value) => {
  if (!DATE_REGEX.test(value)) return null;

  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() + 1 !== month ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
};

const startOfToday = () => {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
};

const formatDateValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const RoomsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [guestInput, setGuestInput] = useState('');
  const [checkInInput, setCheckInInput] = useState('');
  const [checkOutInput, setCheckOutInput] = useState('');
  const [filterError, setFilterError] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({
    guests: null,
    checkIn: '',
    checkOut: '',
    nights: 0,
  });
  const [showCheckInPicker, setShowCheckInPicker] = useState(false);
  const [showCheckOutPicker, setShowCheckOutPicker] = useState(false);
  const [selectedPromoCode, setSelectedPromoCode] = useState(String(route.params?.promotionCode || '').trim().toUpperCase());

  useEffect(() => {
    const incomingCode = String(route.params?.promotionCode || '').trim().toUpperCase();
    if (incomingCode) {
      setSelectedPromoCode(incomingCode);
    }
  }, [route.params?.promotionCode]);

  const fetchRooms = async () => {
    try {
      const params = {};
      if (typeFilter !== 'All') params.roomType = typeFilter;
      const response = await getRooms(params);
      setRooms(response.data.rooms || []);
    } catch (err) {
      const fallbackMessage = `Could not load rooms. Server: ${API_BASE_URL}`;
      Alert.alert('Error', err?.message || fallbackMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchRooms();
    }, [typeFilter])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchRooms();
  };

  const validateAndBuildFilters = () => {
    const guests = guestInput.trim() ? Number(guestInput.trim()) : null;

    if (guests !== null) {
      if (!Number.isInteger(guests) || guests <= 0) {
        return { error: 'Guests must be a valid number greater than 0.' };
      }
      if (guests > 20) {
        return { error: 'Guests cannot be more than 20.' };
      }
    }

    const hasDateRange = checkInInput.trim() || checkOutInput.trim();
    if (hasDateRange) {
      if (!checkInInput.trim() || !checkOutInput.trim()) {
        return { error: 'Please enter both check-in and check-out dates.' };
      }

      const checkInDate = parseDateString(checkInInput.trim());
      const checkOutDate = parseDateString(checkOutInput.trim());
      if (!checkInDate || !checkOutDate) {
        return { error: 'Dates must be in YYYY-MM-DD format.' };
      }

      if (checkInDate < startOfToday()) {
        return { error: 'Check-in date cannot be in the past.' };
      }

      if (checkOutDate <= checkInDate) {
        return { error: 'Check-out date must be after check-in date.' };
      }

      const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));

      return {
        guests,
        checkIn: checkInInput.trim(),
        checkOut: checkOutInput.trim(),
        nights,
      };
    }

    return { guests, checkIn: '', checkOut: '', nights: 0 };
  };

  const applyAdvancedFilters = () => {
    const result = validateAndBuildFilters();
    if (result.error) {
      setFilterError(result.error);
      return;
    }
    setFilterError('');
    setAppliedFilters(result);
  };

  const clearAdvancedFilters = () => {
    setGuestInput('');
    setCheckInInput('');
    setCheckOutInput('');
    setFilterError('');
    setAppliedFilters({ guests: null, checkIn: '', checkOut: '', nights: 0 });
  };

  const handleCheckInDateChange = (_event, selectedDate) => {
    setShowCheckInPicker(false);
    if (!selectedDate) return;

    const value = formatDateValue(selectedDate);
    setCheckInInput(value);

    if (checkOutInput) {
      const currentCheckout = parseDateString(checkOutInput);
      if (currentCheckout && currentCheckout <= selectedDate) {
        setCheckOutInput('');
      }
    }
    setFilterError('');
  };

  const handleCheckOutDateChange = (_event, selectedDate) => {
    setShowCheckOutPicker(false);
    if (!selectedDate) return;

    const value = formatDateValue(selectedDate);
    setCheckOutInput(value);
    setFilterError('');
  };

  const filtered = rooms.filter((room) => {
    const text = filter.toLowerCase();
    const matchesText =
      room.roomNumber?.toLowerCase().includes(text) ||
      room.roomType?.toLowerCase().includes(text) ||
      room.description?.toLowerCase().includes(text);

    if (!matchesText) return false;

    if (appliedFilters.guests !== null && Number(room.capacity) < appliedFilters.guests) {
      return false;
    }

    if (appliedFilters.checkIn && appliedFilters.checkOut && room.availabilityStatus !== 'Available') {
      return false;
    }

    return true;
  });

  const statusColor = (status) =>
    ({ Available: '#22c55e', Occupied: '#ef4444', Maintenance: '#f59e0b' }[status] || '#aaaaaa');

  const selectedStay = {
    guests: appliedFilters.guests,
    checkIn: appliedFilters.checkIn,
    checkOut: appliedFilters.checkOut,
    nights: appliedFilters.nights,
    promotionCode: selectedPromoCode,
  };

  const goToRoomDetail = (room) => {
    navigation.navigate('RoomDetail', { room, searchCriteria: selectedStay });
  };

  const goToBooking = (room) => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to book this room.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign In', onPress: () => navigation.navigate('Login') },
      ]);
      return;
    }

    if (room.availabilityStatus !== 'Available') {
      Alert.alert('Unavailable', 'Sorry, this room is not available for booking right now.');
      return;
    }

    navigation.navigate('Booking', { room, searchCriteria: selectedStay });
  };

  const renderRoom = ({ item }) => (
    <View style={styles.card}>
      <TouchableOpacity activeOpacity={0.9} onPress={() => goToRoomDetail(item)}>
      <Image source={{ uri: getRoomImage(item) }} style={styles.cardImage} resizeMode="cover" />

      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <Text style={styles.roomType}>{item.roomType}</Text>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor(item.availabilityStatus)}33` }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor(item.availabilityStatus) }]} />
            <Text style={[styles.statusText, { color: statusColor(item.availabilityStatus) }]}>
              {item.availabilityStatus}
            </Text>
          </View>
        </View>

        <Text style={styles.roomNumber}>Room #{item.roomNumber}</Text>
        <Text style={styles.roomPrice}>Rs. {(item.pricePerDay ?? item.pricePerMonth)?.toLocaleString()}/day</Text>

        <View style={styles.meta}>
          <Text style={styles.metaItem}>{item.capacity} guests</Text>
          {item.view ? <Text style={styles.metaItem}>{item.view}</Text> : null}
        </View>

        {Array.isArray(item.amenities) && item.amenities.length > 0 && (
          <View style={styles.amenitiesRow}>
            {item.amenities.slice(0, 3).map((amenity, index) => (
              <Text key={`${amenity}-${index}`} style={styles.amenityTag}>
                {amenity}
              </Text>
            ))}
          </View>
        )}
      </View>
      </TouchableOpacity>

      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.detailsBtn} onPress={() => goToRoomDetail(item)}>
          <Text style={styles.detailsBtnText}>View Details</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.bookCardBtn,
            item.availabilityStatus !== 'Available' && styles.bookCardBtnDisabled,
          ]}
          onPress={() => goToBooking(item)}
          disabled={item.availabilityStatus !== 'Available'}
        >
          <Text style={styles.bookCardBtnText}>
            {item.availabilityStatus === 'Available' ? 'Book This Room' : 'Not Available'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search rooms..."
          placeholderTextColor="#888"
          value={filter}
          onChangeText={setFilter}
        />
      </View>

      <View style={styles.typeFilters}>
        {TYPES.map((type) => (
          <TouchableOpacity
            key={type}
            style={[styles.typeBtn, typeFilter === type && styles.typeBtnActive]}
            onPress={() => setTypeFilter(type)}
          >
            <Text style={[styles.typeBtnText, typeFilter === type && styles.typeBtnTextActive]}>{type}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.advancedFilterBox}>
        <Text style={styles.advancedTitle}>Booking Filters</Text>
        <Text style={styles.advancedHint}>Use YYYY-MM-DD for dates</Text>
        {selectedPromoCode ? (
          <View style={styles.promoInfoRow}>
            <Text style={styles.promoInfoText}>
              Promotion selected: <Text style={styles.promoInfoCode}>{selectedPromoCode}</Text>
            </Text>
            <TouchableOpacity onPress={() => setSelectedPromoCode('')}>
              <Text style={styles.promoClearText}>Clear</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.advancedRow}>
          <View style={styles.fieldCol}>
            <Text style={styles.fieldLabel}>Guests</Text>
            <TextInput
              style={styles.filterInput}
              placeholder="e.g. 2"
              placeholderTextColor="#888"
              keyboardType="numeric"
              value={guestInput}
              onChangeText={setGuestInput}
              maxLength={2}
            />
          </View>
          <View style={styles.fieldCol}>
            <Text style={styles.fieldLabel}>Check-In</Text>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowCheckInPicker(true)}
              activeOpacity={0.8}
            >
              <Text style={[styles.datePickerText, !checkInInput && styles.datePickerPlaceholder]}>
                {checkInInput || 'Select date'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.fieldCol}>
            <Text style={styles.fieldLabel}>Check-Out</Text>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowCheckOutPicker(true)}
              activeOpacity={0.8}
            >
              <Text style={[styles.datePickerText, !checkOutInput && styles.datePickerPlaceholder]}>
                {checkOutInput || 'Select date'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {showCheckInPicker && (
          <DateTimePicker
            value={parseDateString(checkInInput) || startOfToday()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            minimumDate={startOfToday()}
            onChange={handleCheckInDateChange}
          />
        )}
        {showCheckOutPicker && (
          <DateTimePicker
            value={parseDateString(checkOutInput) || parseDateString(checkInInput) || startOfToday()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            minimumDate={parseDateString(checkInInput) || startOfToday()}
            onChange={handleCheckOutDateChange}
          />
        )}

        {filterError ? <Text style={styles.filterError}>{filterError}</Text> : null}

        <View style={styles.filterActions}>
          <TouchableOpacity style={styles.applyBtn} onPress={applyAdvancedFilters}>
            <Text style={styles.applyBtnText}>Apply</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.clearBtn} onPress={clearAdvancedFilters}>
            <Text style={styles.clearBtnText}>Clear</Text>
          </TouchableOpacity>
        </View>

        {appliedFilters.nights > 0 ? (
          <Text style={styles.appliedInfo}>
            {appliedFilters.nights} night{appliedFilters.nights > 1 ? 's' : ''} selected
          </Text>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#d4af37" />
          <Text style={styles.loadingText}>Loading rooms...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No rooms found</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          renderItem={renderRoom}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#d4af37" />}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  searchBar: { padding: 15, paddingBottom: 8 },
  searchInput: {
    backgroundColor: '#1a1a2e',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  typeFilters: { flexDirection: 'row', paddingHorizontal: 15, paddingBottom: 10, flexWrap: 'wrap', gap: 8 },
  typeBtn: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(212,175,55,0.4)' },
  typeBtnActive: { backgroundColor: '#d4af37' },
  typeBtnText: { color: '#d4af37', fontSize: 12 },
  typeBtnTextActive: { color: '#1a1a2e', fontWeight: 'bold' },
  advancedFilterBox: {
    marginHorizontal: 15,
    marginBottom: 10,
    backgroundColor: '#131327',
    borderColor: 'rgba(212,175,55,0.25)',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  advancedTitle: { color: '#d4af37', fontWeight: '700', fontSize: 13, marginBottom: 2 },
  advancedHint: { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 10 },
  advancedRow: { flexDirection: 'row', gap: 8 },
  fieldCol: { flex: 1 },
  fieldLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginBottom: 5 },
  filterInput: {
    backgroundColor: '#1a1a2e',
    color: '#fff',
    borderColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 10,
    fontSize: 12,
  },
  datePickerButton: {
    backgroundColor: '#1a1a2e',
    borderColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 10,
    minHeight: 39,
    justifyContent: 'center',
  },
  datePickerText: {
    color: '#fff',
    fontSize: 12,
  },
  datePickerPlaceholder: {
    color: '#888',
  },
  filterError: { color: '#ef4444', marginTop: 8, fontSize: 12 },
  filterActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  applyBtn: {
    flex: 1,
    backgroundColor: '#d4af37',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  applyBtnText: { color: '#1a1a2e', fontWeight: '700', fontSize: 13 },
  clearBtn: {
    flex: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.45)',
  },
  clearBtnText: { color: '#d4af37', fontWeight: '700', fontSize: 13 },
  appliedInfo: { color: '#22c55e', marginTop: 8, fontSize: 12 },
  promoInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  promoInfoText: { color: '#d4af37', fontSize: 12 },
  promoInfoCode: { color: '#fff', fontWeight: '700' },
  promoClearText: { color: '#ef4444', fontSize: 12, fontWeight: '700' },
  list: { padding: 15, gap: 15 },
  card: { backgroundColor: '#1a1a2e', borderRadius: 12, overflow: 'hidden' },
  cardImage: { width: '100%', height: 160 },
  cardBody: { padding: 15 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  roomType: { color: '#d4af37', fontSize: 12, fontWeight: '600' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  statusText: { fontSize: 11, fontWeight: '600' },
  roomNumber: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  roomPrice: { color: '#d4af37', fontSize: 15, fontWeight: 'bold', marginBottom: 8 },
  meta: { flexDirection: 'row', gap: 15, marginBottom: 10 },
  metaItem: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  amenitiesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  amenityTag: {
    backgroundColor: 'rgba(212,175,55,0.15)',
    color: '#d4af37',
    fontSize: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 15,
    paddingBottom: 15,
  },
  detailsBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.45)',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  detailsBtnText: { color: '#d4af37', fontWeight: '700', fontSize: 12 },
  bookCardBtn: {
    flex: 1.4,
    backgroundColor: '#d4af37',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  bookCardBtnDisabled: { backgroundColor: '#444', opacity: 0.6 },
  bookCardBtnText: { color: '#1a1a2e', fontWeight: '700', fontSize: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: 'rgba(255,255,255,0.5)', marginTop: 10 },
  emptyText: { color: 'rgba(255,255,255,0.5)', fontSize: 16 },
});

export default RoomsScreen;
