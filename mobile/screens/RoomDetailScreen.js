import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

const BASE_URL = 'http://10.0.2.2:5001';

const RoomDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const room = route.params?.room;

  if (!room) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Room not found</Text>
      </View>
    );
  }

  const statusColor = { Available: '#22c55e', Occupied: '#ef4444', Maintenance: '#f59e0b' }[room.availabilityStatus] || '#aaa';

  const handleBookNow = () => {
    if (!user) {
      Alert.alert(
        'Sign In Required',
        'Please sign in to book this room.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => navigation.navigate('Login') },
        ]
      );
      return;
    }
    if (room.availabilityStatus !== 'Available') {
      Alert.alert('Unavailable', 'Sorry, this room is not available for booking right now.');
      return;
    }
    navigation.navigate('Booking', { room });
  };

  const imageUri = room.imageUrl
    ? (room.imageUrl.startsWith('/') ? `${BASE_URL}${room.imageUrl}` : room.imageUrl)
    : null;

  return (
    <ScrollView style={styles.container}>
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.heroImage} resizeMode="cover" />
      ) : (
        <View style={styles.heroPlaceholder}>
          <Text style={styles.heroIcon}>🛏️</Text>
        </View>
      )}

      <View style={styles.body}>
        <View style={styles.topRow}>
          <View>
            <Text style={styles.roomType}>{room.roomType} Room</Text>
            <Text style={styles.roomNumber}>Room #{room.roomNumber}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '22' }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>{room.availabilityStatus}</Text>
          </View>
        </View>

        <Text style={styles.price}>Rs. {room.pricePerMonth?.toLocaleString()} <Text style={styles.perMonth}>/month</Text></Text>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statIcon}>👥</Text>
            <Text style={styles.statValue}>{room.capacity}</Text>
            <Text style={styles.statLabel}>Guests</Text>
          </View>
          {room.view && (
            <View style={styles.stat}>
              <Text style={styles.statIcon}>🌅</Text>
              <Text style={styles.statValue}>{room.view}</Text>
              <Text style={styles.statLabel}>View</Text>
            </View>
          )}
          <View style={styles.stat}>
            <Text style={styles.statIcon}>🏠</Text>
            <Text style={styles.statValue}>{room.currentOccupancy || 0}/{room.capacity}</Text>
            <Text style={styles.statLabel}>Occupancy</Text>
          </View>
        </View>

        {room.description ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About this Room</Text>
            <Text style={styles.description}>{room.description}</Text>
          </View>
        ) : null}

        {room.amenities?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Amenities</Text>
            <View style={styles.amenitiesGrid}>
              {room.amenities.map((a, i) => (
                <View key={i} style={styles.amenityItem}>
                  <Text style={styles.amenityCheck}>✓</Text>
                  <Text style={styles.amenityLabel}>{a}</Text>
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
            {room.availabilityStatus === 'Available' ? '📅 Book This Room' : '🚫 Not Available'}
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
  heroPlaceholder: { height: 240, backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center' },
  heroIcon: { fontSize: 70 },
  body: { padding: 20 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  roomType: { color: '#d4af37', fontSize: 13, fontWeight: '600', marginBottom: 4 },
  roomNumber: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText: { fontSize: 12, fontWeight: '600' },
  price: { color: '#d4af37', fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  perMonth: { fontSize: 14, color: 'rgba(212,175,55,0.7)' },
  statsRow: { flexDirection: 'row', backgroundColor: '#1a1a2e', borderRadius: 12, padding: 15, marginBottom: 20, justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  statIcon: { fontSize: 20, marginBottom: 4 },
  statValue: { color: '#fff', fontSize: 14, fontWeight: 'bold', textAlign: 'center' },
  statLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2 },
  section: { marginBottom: 20 },
  sectionTitle: { color: '#d4af37', fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  description: { color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 22 },
  amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  amenityItem: { flexDirection: 'row', alignItems: 'center', width: '45%' },
  amenityCheck: { color: '#22c55e', marginRight: 8, fontWeight: 'bold' },
  amenityLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  bookButton: { backgroundColor: '#d4af37', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  bookButtonDisabled: { backgroundColor: '#444', opacity: 0.6 },
  bookButtonText: { color: '#1a1a2e', fontSize: 16, fontWeight: 'bold' },
});

export default RoomDetailScreen;