import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { BASE_URL, getRooms } from '../services/api';

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

const HomeScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const firstName = (user?.name || 'User').split(' ')[0];
  const [featuredRooms, setFeaturedRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);

  useEffect(() => {
    getRooms({ availabilityStatus: 'Available' })
      .then((res) => setFeaturedRooms((res.data.rooms || []).slice(0, 3)))
      .catch(() => {})
      .finally(() => setLoadingRooms(false));
  }, []);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.heroOverlay}>
          <Text style={styles.heroTag}>Luxury Hotel and Resort</Text>
          <Text style={styles.heroTitle}>Your Unforgettable{'\n'}Getaway Awaits</Text>
          <Text style={styles.heroSubtitle}>
            Where the ocean meets luxury. Experience world-class hospitality, stunning views, and memories that last a lifetime.
          </Text>
          <View style={styles.heroButtons}>
            <TouchableOpacity style={styles.btnGold} onPress={() => navigation.navigate('Rooms')}>
              <Text style={styles.btnGoldText}>Explore Rooms</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnDark} onPress={() => navigation.navigate('Promotions')}>
              <Text style={styles.btnDarkText}>Promotions</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnDark} onPress={() => navigation.navigate('About')}>
              <Text style={styles.btnDarkText}>About Us</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnOutline} onPress={() => navigation.navigate(user ? 'Profile' : 'Login')}>
              <Text style={styles.btnOutlineText}>{user ? `Hi, ${firstName}` : 'Sign In'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.ratingStrip}>
        {[['5-Star', 'Rating'], ['4,200+', 'Happy Guests'], ['25 Yrs', 'Experience']].map(([val, label], i) => (
          <React.Fragment key={label}>
            {i > 0 && <View style={styles.ratingDivider} />}
            <View style={styles.ratingItem}>
              <Text style={styles.ratingNumber}>{val}</Text>
              <Text style={styles.ratingLabel}>{label}</Text>
            </View>
          </React.Fragment>
        ))}
      </View>

      <View style={styles.featuresStrip}>
        {['Beach Access', 'Free Breakfast', 'Pool and Spa', 'Free Parking'].map((label) => (
          <View key={label} style={styles.featureItem}>
            <Text style={styles.featureText}>{label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Featured Rooms</Text>
        <Text style={styles.sectionSubtitle}>Discover our most popular accommodations</Text>

        {loadingRooms ? (
          <ActivityIndicator color="#d4af37" style={{ marginVertical: 20 }} />
        ) : featuredRooms.length === 0 ? (
          <Text style={styles.emptyText}>No rooms available right now.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.roomsScroll}>
            {featuredRooms.map((room) => (
              <TouchableOpacity
                key={room._id}
                style={styles.roomCard}
                onPress={() => navigation.navigate('RoomDetail', { room })}
              >
                <Image source={{ uri: getRoomImage(room) }} style={styles.roomCardImage} resizeMode="cover" />
                <View style={styles.roomInfo}>
                  <Text style={styles.roomType}>{room.roomType}</Text>
                  <Text style={styles.roomName}>Room #{room.roomNumber}</Text>
                  <Text style={styles.roomPrice}>Rs. {(room.pricePerDay ?? room.pricePerMonth)?.toLocaleString()}/day</Text>
                  {Array.isArray(room.amenities) && room.amenities.length > 0 && (
                    <View style={styles.amenitiesRow}>
                      {room.amenities.slice(0, 3).map((a, i) => (
                        <Text key={`${a}-${i}`} style={styles.amenityTag}>{a}</Text>
                      ))}
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Welcome to Canvas Hotel</Text>
        <Text style={styles.sectionSubtitle}>
          Experience luxury like never before at our beachfront resort.{'\n'}
          With 25 years of excellence in hospitality, we offer world-class amenities, exquisite dining, and unparalleled service.
        </Text>
      </View>

      <View style={styles.contactStrip}>
        <Text style={styles.contactTitle}>Ready to book your stay?</Text>
        <Text style={styles.contactSubtitle}>Phone: +94 77 123 4567</Text>
        <TouchableOpacity style={styles.btnGold} onPress={() => navigation.navigate('Rooms')}>
          <Text style={styles.btnGoldText}>Book Now</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerLogo}>Hotel Canvas</Text>
        <Text style={styles.footerText}>Copyright 2026 Hotel Canvas. All rights reserved.</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  hero: { height: 500, backgroundColor: '#1a1a2e' },
  heroOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  heroTag: { color: '#d4af37', fontSize: 14, fontWeight: '600', marginBottom: 10 },
  heroTitle: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
    fontFamily: 'serif',
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 22,
  },
  heroButtons: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', justifyContent: 'center' },
  btnGold: { backgroundColor: '#d4af37', paddingVertical: 14, paddingHorizontal: 30, borderRadius: 8 },
  btnGoldText: { color: '#1a1a2e', fontSize: 15, fontWeight: 'bold' },
  btnDark: {
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.6)',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  btnDarkText: { color: '#d4af37', fontSize: 15, fontWeight: 'bold' },
  btnOutline: {
    borderWidth: 2,
    borderColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 8,
  },
  btnOutlineText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  ratingStrip: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(212,175,55,0.3)',
  },
  ratingItem: { alignItems: 'center' },
  ratingNumber: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  ratingLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 4 },
  ratingDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.2)' },
  featuresStrip: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#d4af37',
    paddingVertical: 15,
    flexWrap: 'wrap',
    rowGap: 8,
  },
  featureItem: { alignItems: 'center' },
  featureText: { color: '#1a1a2e', fontSize: 11, fontWeight: '600' },
  section: { padding: 20 },
  sectionTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: 'serif',
  },
  sectionSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  emptyText: { color: 'rgba(255,255,255,0.4)', textAlign: 'center', paddingVertical: 20 },
  roomsScroll: { marginTop: 10 },
  roomCard: {
    width: 240,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    marginRight: 15,
    overflow: 'hidden',
  },
  roomCardImage: { width: '100%', height: 140 },
  roomInfo: { padding: 12 },
  roomType: { color: '#d4af37', fontSize: 11, fontWeight: '600', marginBottom: 3 },
  roomName: { color: '#fff', fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
  roomPrice: { color: '#d4af37', fontSize: 14, fontWeight: 'bold', marginBottom: 8 },
  amenitiesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  amenityTag: {
    backgroundColor: 'rgba(212,175,55,0.2)',
    color: '#d4af37',
    fontSize: 9,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  contactStrip: { backgroundColor: '#1a1a2e', padding: 30, alignItems: 'center' },
  contactTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  contactSubtitle: { color: '#d4af37', fontSize: 16, marginBottom: 20 },
  footer: { backgroundColor: '#0a0a14', padding: 20, alignItems: 'center' },
  footerLogo: { color: '#d4af37', fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  footerText: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
});

export default HomeScreen;
