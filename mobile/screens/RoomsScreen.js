import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, RefreshControl, TextInput, Alert, Image,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getRooms } from '../services/api';

const BASE_URL = 'http://10.0.2.2:5001';

const RoomsScreen = () => {
  const navigation = useNavigation();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');

  const TYPES = ['All', 'Single', 'Double', 'Deluxe', 'Suite', 'Family'];

  const fetchRooms = async () => {
    try {
      const params = {};
      if (typeFilter !== 'All') params.roomType = typeFilter;
      const response = await getRooms(params);
      setRooms(response.data.rooms || []);
    } catch (err) {
      Alert.alert('Error', 'Could not load rooms. Please check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchRooms(); }, [typeFilter]));

  const onRefresh = () => { setRefreshing(true); fetchRooms(); };

  const filtered = rooms.filter(r =>
    r.roomNumber?.toLowerCase().includes(filter.toLowerCase()) ||
    r.roomType?.toLowerCase().includes(filter.toLowerCase()) ||
    r.description?.toLowerCase().includes(filter.toLowerCase())
  );

  const statusColor = (s) => ({ Available: '#22c55e', Occupied: '#ef4444', Maintenance: '#f59e0b' }[s] || '#aaa');

  const renderRoom = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('RoomDetail', { room: item })}>
      {item.imageUrl ? (
        <Image
          source={{ uri: item.imageUrl.startsWith('/') ? `${BASE_URL}${item.imageUrl}` : item.imageUrl }}
          style={styles.cardImage}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.cardImagePlaceholder}>
          <Text style={styles.cardImageIcon}>🛏️</Text>
        </View>
      )}
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <Text style={styles.roomType}>{item.roomType}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor(item.availabilityStatus) + '33' }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor(item.availabilityStatus) }]} />
            <Text style={[styles.statusText, { color: statusColor(item.availabilityStatus) }]}>{item.availabilityStatus}</Text>
          </View>
        </View>
        <Text style={styles.roomNumber}>Room #{item.roomNumber}</Text>
        <Text style={styles.roomPrice}>Rs. {item.pricePerMonth?.toLocaleString()}/month</Text>
        <View style={styles.meta}>
          <Text style={styles.metaItem}>👥 {item.capacity} guests</Text>
          {item.view ? <Text style={styles.metaItem}>🌅 {item.view}</Text> : null}
        </View>
        {item.amenities?.length > 0 && (
          <View style={styles.amenitiesRow}>
            {item.amenities.slice(0, 3).map((a, i) => (
              <Text key={i} style={styles.amenityTag}>{a}</Text>
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Search rooms..."
          placeholderTextColor="#888"
          value={filter}
          onChangeText={setFilter}
        />
      </View>

      <View style={styles.typeFilters}>
        {TYPES.map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.typeBtn, typeFilter === t && styles.typeBtnActive]}
            onPress={() => setTypeFilter(t)}
          >
            <Text style={[styles.typeBtnText, typeFilter === t && styles.typeBtnTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#d4af37" />
          <Text style={styles.loadingText}>Loading rooms...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🛏️</Text>
          <Text style={styles.emptyText}>No rooms found</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item._id}
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
  searchInput: { backgroundColor: '#1a1a2e', color: '#fff', padding: 12, borderRadius: 8, fontSize: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  typeFilters: { flexDirection: 'row', paddingHorizontal: 15, paddingBottom: 10, flexWrap: 'wrap', gap: 8 },
  typeBtn: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(212,175,55,0.4)' },
  typeBtnActive: { backgroundColor: '#d4af37' },
  typeBtnText: { color: '#d4af37', fontSize: 12 },
  typeBtnTextActive: { color: '#1a1a2e', fontWeight: 'bold' },
  list: { padding: 15, gap: 15 },
  card: { backgroundColor: '#1a1a2e', borderRadius: 12, overflow: 'hidden' },
  cardImage: { width: '100%', height: 160 },
  cardImagePlaceholder: { height: 160, backgroundColor: '#2a2a4e', justifyContent: 'center', alignItems: 'center' },
  cardImageIcon: { fontSize: 50 },
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
  amenityTag: { backgroundColor: 'rgba(212,175,55,0.15)', color: '#d4af37', fontSize: 10, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: 'rgba(255,255,255,0.5)', marginTop: 10 },
  emptyIcon: { fontSize: 50, marginBottom: 10 },
  emptyText: { color: 'rgba(255,255,255,0.5)', fontSize: 16 },
});

export default RoomsScreen;