import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import {
  createAdminPromotion,
  getAdminPromotions,
  updateAdminPromotion,
} from '../services/api';

const EMPTY_FORM = {
  title: '',
  description: '',
  code: '',
  discountType: 'percentage',
  discountValue: '',
  validFrom: '',
  validUntil: '',
  usageLimit: '',
  isActive: true,
};

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatDateInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateInput = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const PromotionAdminScreen = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [promotions, setPromotions] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showValidFromPicker, setShowValidFromPicker] = useState(false);
  const [showValidUntilPicker, setShowValidUntilPicker] = useState(false);

  const loadPromotions = useCallback(async (withLoader = false) => {
    if (withLoader) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const response = await getAdminPromotions();
      setPromotions(response.data.promotions || []);
    } catch (error) {
      Alert.alert('Promotion Error', error.message || 'Could not load promotions');
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

  const activeCount = useMemo(() => promotions.filter((item) => item.isActive).length, [promotions]);

  const openCreateModal = () => {
    setEditingPromotion(null);
    setForm(EMPTY_FORM);
    setShowValidFromPicker(false);
    setShowValidUntilPicker(false);
    setModalVisible(true);
  };

  const openEditModal = (promotion) => {
    setEditingPromotion(promotion);
    setForm({
      title: promotion.title || '',
      description: promotion.description || '',
      code: promotion.code || '',
      discountType: promotion.discountType || 'percentage',
      discountValue: String(promotion.discountValue || ''),
      validFrom: (promotion.validFrom || '').slice(0, 10),
      validUntil: (promotion.validUntil || '').slice(0, 10),
      usageLimit: promotion.usageLimit === null || promotion.usageLimit === undefined ? '' : String(promotion.usageLimit),
      isActive: Boolean(promotion.isActive),
    });
    setShowValidFromPicker(false);
    setShowValidUntilPicker(false);
    setModalVisible(true);
  };

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const savePromotion = async () => {
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      code: form.code.trim().toUpperCase(),
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      validFrom: form.validFrom,
      validUntil: form.validUntil,
      usageLimit: form.usageLimit.trim() ? Number(form.usageLimit) : null,
      isActive: form.isActive,
    };

    if (!payload.title || !payload.code || !payload.validFrom || !payload.validUntil || !form.discountValue.trim()) {
      Alert.alert('Validation', 'Title, code, discount, valid from and valid until are required.');
      return;
    }

    const validFromDate = parseDateInput(payload.validFrom);
    const validUntilDate = parseDateInput(payload.validUntil);
    if (!validFromDate || !validUntilDate) {
      Alert.alert('Validation', 'Dates must be valid and in YYYY-MM-DD format.');
      return;
    }
    if (validUntilDate < validFromDate) {
      Alert.alert('Validation', 'Valid Until cannot be earlier than Valid From.');
      return;
    }

    setSaving(true);
    try {
      if (editingPromotion?._id) {
        await updateAdminPromotion(editingPromotion._id, payload);
        Alert.alert('Updated', 'Promotion updated successfully');
      } else {
        await createAdminPromotion(payload);
        Alert.alert('Created', 'Promotion created successfully');
      }
      setModalVisible(false);
      await loadPromotions(false);
    } catch (error) {
      Alert.alert('Promotion Error', error.message || 'Could not save promotion');
    } finally {
      setSaving(false);
    }
  };

  const handleValidFromChange = (_event, selectedDate) => {
    if (Platform.OS !== 'ios') {
      setShowValidFromPicker(false);
    }
    if (!selectedDate) return;

    const validFrom = formatDateInput(selectedDate);
    updateField('validFrom', validFrom);

    const currentUntil = parseDateInput(form.validUntil);
    if (currentUntil && currentUntil < selectedDate) {
      updateField('validUntil', validFrom);
    }
  };

  const handleValidUntilChange = (_event, selectedDate) => {
    if (Platform.OS !== 'ios') {
      setShowValidUntilPicker(false);
    }
    if (!selectedDate) return;
    updateField('validUntil', formatDateInput(selectedDate));
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#d4af37" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadPromotions(false)} tintColor="#d4af37" />}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Promotion Manager</Text>
            <Text style={styles.subtitle}>
              {activeCount} active of {promotions.length} total
            </Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={openCreateModal}>
            <Text style={styles.addBtnText}>Add Promotion</Text>
          </TouchableOpacity>
        </View>

        {promotions.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No promotions in database yet.</Text>
          </View>
        ) : (
          promotions.map((item) => (
            <TouchableOpacity key={item._id} style={styles.card} onPress={() => openEditModal(item)} activeOpacity={0.9}>
              <View style={styles.cardHead}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <View style={[styles.badge, item.isActive ? styles.badgeActive : styles.badgeInactive]}>
                  <Text style={styles.badgeText}>{item.isActive ? 'Active' : 'Inactive'}</Text>
                </View>
              </View>
              <Text style={styles.cardCode}>CODE: {item.code}</Text>
              <Text style={styles.cardDetail}>
                Discount: {item.discountType === 'fixed' ? `Rs. ${Number(item.discountValue).toLocaleString()}` : `${item.discountValue}%`}
              </Text>
              <Text style={styles.cardDetail}>
                Valid: {formatDate(item.validFrom)} - {formatDate(item.validUntil)}
              </Text>
              <Text style={styles.cardDetail}>
                Usage: {item.usedCount}
                {item.usageLimit ? ` / ${item.usageLimit}` : ' (Unlimited)'}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView>
              <Text style={styles.modalTitle}>{editingPromotion ? 'Edit Promotion' : 'Add Promotion'}</Text>

              <Text style={styles.label}>Title</Text>
              <TextInput style={styles.input} value={form.title} onChangeText={(v) => updateField('title', v)} />

              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={form.description}
                onChangeText={(v) => updateField('description', v)}
                multiline
              />

              <Text style={styles.label}>Code</Text>
              <TextInput
                style={styles.input}
                value={form.code}
                autoCapitalize="characters"
                onChangeText={(v) => updateField('code', v.replace(/\s+/g, '').toUpperCase())}
              />

              <Text style={styles.label}>Discount Type</Text>
              <View style={styles.typeRow}>
                {['percentage', 'fixed'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.typeBtn, form.discountType === type && styles.typeBtnActive]}
                    onPress={() => updateField('discountType', type)}
                  >
                    <Text style={[styles.typeBtnText, form.discountType === type && styles.typeBtnTextActive]}>{type}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Discount Value</Text>
              <TextInput
                style={styles.input}
                value={form.discountValue}
                keyboardType="numeric"
                onChangeText={(v) => updateField('discountValue', v.replace(/[^0-9.]/g, ''))}
              />

              <Text style={styles.label}>Valid From (YYYY-MM-DD)</Text>
              <TouchableOpacity style={styles.dateInput} onPress={() => setShowValidFromPicker(true)} activeOpacity={0.85}>
                <Text style={form.validFrom ? styles.dateText : styles.datePlaceholder}>
                  {form.validFrom || '2026-05-03'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.label}>Valid Until (YYYY-MM-DD)</Text>
              <TouchableOpacity style={styles.dateInput} onPress={() => setShowValidUntilPicker(true)} activeOpacity={0.85}>
                <Text style={form.validUntil ? styles.dateText : styles.datePlaceholder}>
                  {form.validUntil || '2026-06-30'}
                </Text>
              </TouchableOpacity>

              {showValidFromPicker && (
                <DateTimePicker
                  value={parseDateInput(form.validFrom) || new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleValidFromChange}
                />
              )}

              {showValidUntilPicker && (
                <DateTimePicker
                  value={parseDateInput(form.validUntil) || parseDateInput(form.validFrom) || new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  minimumDate={parseDateInput(form.validFrom) || undefined}
                  onChange={handleValidUntilChange}
                />
              )}

              <Text style={styles.label}>Usage Limit (optional)</Text>
              <TextInput
                style={styles.input}
                value={form.usageLimit}
                keyboardType="numeric"
                onChangeText={(v) => updateField('usageLimit', v.replace(/\D/g, ''))}
                placeholder="Leave blank for unlimited"
                placeholderTextColor="#7a8399"
              />

              <View style={styles.activeRow}>
                <Text style={styles.label}>Active</Text>
                <Switch
                  value={form.isActive}
                  onValueChange={(value) => updateField('isActive', value)}
                  thumbColor={form.isActive ? '#d4af37' : '#d4d4d8'}
                />
              </View>

              <View style={styles.modalActionRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)} disabled={saving}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={savePromotion} disabled={saving}>
                  {saving ? <ActivityIndicator color="#1a1a2e" /> : <Text style={styles.saveBtnText}>Save</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  content: { padding: 14, paddingBottom: 30 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f0f1a' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 10 },
  title: { color: '#fff', fontSize: 24, fontWeight: '800' },
  subtitle: { color: 'rgba(255,255,255,0.65)', fontSize: 13, marginTop: 4 },
  addBtn: { backgroundColor: '#d4af37', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 14 },
  addBtnText: { color: '#1a1a2e', fontWeight: '800' },
  emptyBox: { borderWidth: 1, borderColor: 'rgba(212,175,55,0.35)', borderRadius: 12, padding: 20, backgroundColor: '#1a1a2e' },
  emptyText: { color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
  card: { backgroundColor: '#1a1a2e', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(212,175,55,0.25)', padding: 13, marginBottom: 10 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, alignItems: 'center', marginBottom: 4 },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: '700', flex: 1 },
  badge: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  badgeActive: { backgroundColor: 'rgba(34,197,94,0.2)' },
  badgeInactive: { backgroundColor: 'rgba(239,68,68,0.2)' },
  badgeText: { color: '#fff', fontWeight: '700', fontSize: 11 },
  cardCode: { color: '#d4af37', fontSize: 14, fontWeight: '700', marginBottom: 6 },
  cardDetail: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginBottom: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 16 },
  modalCard: { backgroundColor: '#11172a', borderRadius: 12, padding: 14, maxHeight: '88%' },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 10 },
  label: { color: '#d4af37', fontSize: 13, fontWeight: '700', marginBottom: 6, marginTop: 6 },
  input: {
    backgroundColor: '#1a1f36',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 8,
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dateInput: {
    backgroundColor: '#1a1f36',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dateText: { color: '#fff' },
  datePlaceholder: { color: '#7a8399' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  typeBtn: { flex: 1, borderWidth: 1, borderColor: 'rgba(212,175,55,0.35)', borderRadius: 8, alignItems: 'center', paddingVertical: 9 },
  typeBtnActive: { backgroundColor: '#d4af37' },
  typeBtnText: { color: '#d4af37', fontWeight: '700' },
  typeBtnTextActive: { color: '#1a1a2e' },
  activeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  modalActionRow: { flexDirection: 'row', gap: 10, marginTop: 15 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 8, alignItems: 'center', paddingVertical: 11 },
  cancelBtnText: { color: '#fff', fontWeight: '700' },
  saveBtn: { flex: 1, backgroundColor: '#d4af37', borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingVertical: 11 },
  saveBtnText: { color: '#1a1a2e', fontWeight: '800' },
});

export default PromotionAdminScreen;
