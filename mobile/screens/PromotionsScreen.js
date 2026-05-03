import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  ToastAndroid,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { getActivePromotions } from '../services/api';

const formatDate = (value) =>
  new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const PromotionsScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [promotions, setPromotions] = useState([]);
  const [lastError, setLastError] = useState('');

  const copyPromoCode = async (code) => {
    const normalized = String(code || '').trim();
    if (!normalized) return;

    await Clipboard.setStringAsync(normalized);
    if (Platform.OS === 'android') {
      ToastAndroid.show(`Copied ${normalized}`, ToastAndroid.SHORT);
      return;
    }
    Alert.alert('Copied', `${normalized} copied to clipboard`);
  };

  const loadPromotions = useCallback(async (withLoader = false) => {
    if (withLoader) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const response = await getActivePromotions();
      setPromotions(response.data.promotions || []);
      setLastError('');
    } catch (error) {
      // Retry once for transient mobile network hiccups.
      try {
        await new Promise((resolve) => setTimeout(resolve, 800));
        const retryResponse = await getActivePromotions();
        setPromotions(retryResponse.data.promotions || []);
        setLastError('');
      } catch (retryError) {
        const message = retryError?.message || error?.message || 'Could not load promotions';
        setLastError(message);
        Alert.alert(
          'Promotion Error',
          `${message}\n\nPlease ensure:\n1) Backend server is running\n2) Phone and laptop are on same Wi-Fi`
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPromotions(true);
    }, [loadPromotions])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#d4af37" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadPromotions(false)} tintColor="#d4af37" />}
    >
      <Text style={styles.title}>Exclusive Offers</Text>
      <Text style={styles.subtitle}>Use one of these promo codes in booking to get a discount.</Text>
      {lastError ? <Text style={styles.errorHint}>Connection issue: pull down to retry.</Text> : null}

      {promotions.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No active promotions available right now.</Text>
        </View>
      ) : (
        promotions.map((item) => (
          <View key={item._id} style={styles.promoCard}>
            <Text style={styles.promoTitle}>{item.title}</Text>
            <Text style={styles.discountText}>
              {item.discountType === 'fixed' ? `Rs. ${Number(item.discountValue).toLocaleString()}` : `${item.discountValue}%`} off
            </Text>
            {item.description ? <Text style={styles.promoDesc}>{item.description}</Text> : null}
            <Text style={styles.promoDate}>Valid until {formatDate(item.validUntil)}</Text>

            <TouchableOpacity style={styles.codeBox} activeOpacity={0.85} onPress={() => copyPromoCode(item.code)}>
              <Text style={styles.codeLabel}>CODE</Text>
              <Text style={styles.codeText}>{item.code}</Text>
              <Text style={styles.tapHint}>Tap to copy</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.bookBtn}
              onPress={() => {
                navigation.navigate('Rooms', { promotionCode: item.code });
                Alert.alert('Promotion Selected', `Code ${item.code} will be pre-filled in your booking.`);
              }}
            >
              <Text style={styles.bookBtnText}>Book with this code</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  content: { padding: 16, paddingBottom: 30 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f1a' },
  title: { color: '#fff', fontSize: 26, fontWeight: '800', marginBottom: 6, textAlign: 'center' },
  subtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 13, textAlign: 'center', marginBottom: 18 },
  errorHint: { color: '#f59e0b', fontSize: 12, textAlign: 'center', marginBottom: 10 },
  emptyCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.25)',
    padding: 18,
  },
  emptyText: { color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
  promoCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.35)',
    padding: 16,
    marginBottom: 14,
  },
  promoTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  discountText: { color: '#d4af37', fontSize: 29, fontWeight: '800', marginTop: 8 },
  promoDesc: { color: 'rgba(255,255,255,0.75)', marginTop: 8, fontSize: 13, lineHeight: 19 },
  promoDate: { color: 'rgba(255,255,255,0.6)', marginTop: 10, fontSize: 12 },
  codeBox: {
    marginTop: 12,
    backgroundColor: '#11172a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.3)',
    paddingVertical: 10,
    alignItems: 'center',
  },
  codeLabel: { color: '#d4af37', fontSize: 11, fontWeight: '700' },
  codeText: { color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 2, letterSpacing: 1.2 },
  tapHint: { color: 'rgba(255,255,255,0.55)', fontSize: 11, marginTop: 6 },
  bookBtn: {
    marginTop: 12,
    borderRadius: 8,
    backgroundColor: '#d4af37',
    paddingVertical: 12,
    alignItems: 'center',
  },
  bookBtnText: { color: '#1a1a2e', fontWeight: '800', fontSize: 14 },
});

export default PromotionsScreen;
