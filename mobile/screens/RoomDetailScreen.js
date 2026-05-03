import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { BASE_URL } from '../services/api';

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

const RoomDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const room = route.params?.room;
  const searchCriteria = route.params?.searchCriteria || {};

  if (!room) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Room not found</Text>
      </View>
    );
  }

  const statusColor =
    { Available: '#22c55e', Occupied: '#ef4444', Maintenance: '#f59e0b' }[room.availabilityStatus] || '#aaaaaa';

  const handleBookNow = () => {
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

    navigation.navigate('Booking', { room, searchCriteria });
  };

  const imageUri = getRoomImage(room);

  return (
    <ScrollView style={styles.container}>
      <Image source={{ uri: imageUri }} style={styles.heroImage} resizeMode="cover" />

      <View style={styles.body}>
        <View style={styles.topRow}>
          <View>
            <Text style={styles.roomType}>{room.roomType} Room</Text>
            <Text style={styles.roomNumber}>Room #{room.roomNumber}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}22` }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>{room.availabilityStatus}</Text>
          </View>
        </View>

        <Text style={styles.price}>
          Rs. {(room.pricePerDay ?? room.pricePerMonth)?.toLocaleString()} <Text style={styles.perDay}>/day</Text>
        </Text>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{room.capacity}</Text>
            <Text style={styles.statLabel}>Guests</Text>
          </View>
          {room.view ? (
            <View style={styles.stat}>
              <Text style={styles.statValue}>{room.view}</Text>
              <Text style={styles.statLabel}>View</Text>
            </View>
          ) : null}
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {room.currentOccupancy || 0}/{room.capacity}
            </Text>
            <Text style={styles.statLabel}>Occupancy</Text>
          </View>
        </View>

        {(searchCriteria?.checkIn || searchCriteria?.checkOut || searchCriteria?.guests) ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Selected Stay</Text>
            <View style={styles.stayBox}>
              {searchCriteria?.guests ? (
                <Text style={styles.stayText}>Guests: {searchCriteria.guests}</Text>
              ) : null}
              {searchCriteria?.checkIn ? (
                <Text style={styles.stayText}>Check-In: {searchCriteria.checkIn}</Text>
              ) : null}
              {searchCriteria?.checkOut ? (
                <Text style={styles.stayText}>Check-Out: {searchCriteria.checkOut}</Text>
              ) : null}
              {searchCriteria?.nights ? (
                <Text style={styles.stayText}>
                  Duration: {searchCriteria.nights} night{searchCriteria.nights > 1 ? 's' : ''}
                </Text>
              ) : null}
              {searchCriteria?.promotionCode ? (
                <Text style={styles.stayText}>Promo Code: {String(searchCriteria.promotionCode).toUpperCase()}</Text>
              ) : null}
            </View>
          </View>
        ) : null}

        {room.description ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About this Room</Text>
            <Text style={styles.description}>{room.description}</Text>
          </View>
        ) : null}

        {Array.isArray(room.amenities) && room.amenities.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Amenities</Text>
            <View style={styles.amenitiesGrid}>
              {room.amenities.map((amenity, index) => (
                <View key={`${amenity}-${index}`} style={styles.amenityItem}>
                  <Text style={styles.amenityCheck}>-</Text>
                  <Text style={styles.amenityLabel}>{amenity}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.bookButton, room.availabilityStatus !== 'Available' && styles.bookButtonDisabled]}
          onPress={handleBookNow}
        >
          <Text style={styles.bookButtonText}>
            {room.availabilityStatus === 'Available' ? 'Book This Room' : 'Not Available'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f1a' },
  errorText: { color: '#fff', fontSize: 16 },
  heroImage: { width: '100%', height: 240 },
  body: { padding: 20 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  roomType: { color: '#d4af37', fontSize: 13, fontWeight: '600', marginBottom: 4 },
  roomNumber: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText: { fontSize: 12, fontWeight: '600' },
  price: { color: '#d4af37', fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  perDay: { fontSize: 14, color: 'rgba(212,175,55,0.7)' },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    justifyContent: 'space-around',
  },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { color: '#fff', fontSize: 14, fontWeight: 'bold', textAlign: 'center' },
  statLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2 },
  section: { marginBottom: 20 },
  sectionTitle: { color: '#d4af37', fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  description: { color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 22 },
  stayBox: {
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.2)',
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  stayText: { color: 'rgba(255,255,255,0.75)', fontSize: 13 },
  amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  amenityItem: { flexDirection: 'row', alignItems: 'center', width: '45%' },
  amenityCheck: { color: '#22c55e', marginRight: 8, fontWeight: 'bold' },
  amenityLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  bookButton: { backgroundColor: '#d4af37', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  bookButtonDisabled: { backgroundColor: '#444', opacity: 0.6 },
  bookButtonText: { color: '#1a1a2e', fontSize: 16, fontWeight: 'bold' },
});

export default RoomDetailScreen;
