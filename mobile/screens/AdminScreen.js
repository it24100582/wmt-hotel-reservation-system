import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  getAdminUsers,
  getAllBookings,
  getRooms,
  updateAdminUser,
  updateBookingStatus,
} from '../services/api';
import colors from '../theme/colors';
import { isValidSriLankanPhone, normalizePhoneInput } from '../utils/phoneUtils';
import { isValidPersonName, normalizeNameInput } from '../utils/nameUtils';

const MENU_ITEMS = ['Dashboard', 'Rooms', 'Bookings', 'Users', 'Promotions', 'Payments', 'Reports'];
const USER_ROLES = ['guest', 'admin'];
const ROOM_STATUS_ORDER = ['Available', 'Occupied', 'Maintenance'];

const EMPTY_USER_FORM = {
  name: '',
  phone: '',
  role: 'guest',
};

const normalizeStatus = (value) => (value || '').trim().toLowerCase();

const isSameDay = (firstDate, secondDate) => {
  if (!firstDate || !secondDate) return false;

  return (
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getDate() === secondDate.getDate()
  );
};

const getBookingDate = (booking) => {
  if (!booking) return null;

  if (booking.createdAt) return new Date(booking.createdAt);
  if (booking.startDate) return new Date(booking.startDate);

  return null;
};

const getRoomStatusColor = (status) => {
  const normalized = normalizeStatus(status);

  if (normalized === 'available') return '#dcefd8';
  if (normalized === 'occupied') return '#dbe7f6';
  if (normalized === 'maintenance') return '#f4e2df';

  return '#ede7de';
};

const getRoomStatusTextColor = (status) => {
  const normalized = normalizeStatus(status);

  if (normalized === 'available') return '#216e39';
  if (normalized === 'occupied') return '#2a4d8f';
  if (normalized === 'maintenance') return '#9c3318';

  return colors.slate700;
};

const AdminScreen = () => {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();

  const [activeMenu, setActiveMenu] = useState('Dashboard');
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [userModalVisible, setUserModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState(EMPTY_USER_FORM);
  const [savingUser, setSavingUser] = useState(false);

  const isTabletLayout = width >= 980;
  const isMobileLayout = width < 980;

  const loadAdminData = useCallback(async (withLoader = false) => {
    if (withLoader) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const [roomsResponse, bookingsResponse, usersResponse] = await Promise.all([
        getRooms(),
        getAllBookings(),
        getAdminUsers(),
      ]);

      setRooms(roomsResponse.data.rooms || []);
      setBookings(bookingsResponse.data.bookings || []);
      setUsers(usersResponse.data.users || []);
    } catch (error) {
      Alert.alert('Admin Error', error.message || 'Could not load dashboard data');
    } finally {
      if (withLoader) {
        setLoading(false);
      }
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAdminData(true);
    }, [loadAdminData])
  );

  const metrics = useMemo(() => {
    const today = new Date();

    const totalRooms = rooms.length;
    const availableRooms = rooms.filter((room) => normalizeStatus(room.availabilityStatus) === 'available').length;

    const todayBookings = bookings.filter((booking) => {
      const bookingDate = getBookingDate(booking);
      return bookingDate ? isSameDay(bookingDate, today) : false;
    }).length;

    const pendingBookings = bookings.filter((booking) => normalizeStatus(booking.status) === 'pending').length;
    const occupiedRooms = rooms.filter((room) => normalizeStatus(room.availabilityStatus) === 'occupied').length;
    const occupancyRate = totalRooms === 0 ? 0 : Math.round((occupiedRooms / totalRooms) * 100);

    return {
      totalRooms,
      availableRooms,
      todayBookings,
      pendingBookings,
      occupiedRooms,
      occupancyRate,
    };
  }, [rooms, bookings]);

  const roomStatusSummary = useMemo(() => {
    const summary = {
      Available: 0,
      Occupied: 0,
      Maintenance: 0,
    };

    for (const room of rooms) {
      const normalized = normalizeStatus(room.availabilityStatus);

      if (normalized === 'available') summary.Available += 1;
      if (normalized === 'occupied') summary.Occupied += 1;
      if (normalized === 'maintenance') summary.Maintenance += 1;
    }

    return summary;
  }, [rooms]);

  const pendingBookings = useMemo(
    () => bookings.filter((booking) => normalizeStatus(booking.status) === 'pending'),
    [bookings]
  );

  const handleUpdateBookingStatus = async (bookingId, status) => {
    try {
      await updateBookingStatus(bookingId, status);
      await loadAdminData(false);
      Alert.alert('Updated', `Booking marked as ${status}`);
    } catch (error) {
      Alert.alert('Booking Error', error.message || 'Failed to update booking');
    }
  };

  const openUserEditor = (user) => {
    setEditingUser(user);
    setUserForm({
      name: user.name || '',
      phone: user.phone || '',
      role: user.role || 'guest',
    });
    setUserModalVisible(true);
  };

  const handleUserFieldChange = (field, value) => {
    setUserForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;

    const normalizedName = normalizeNameInput(userForm.name);
    if (!normalizedName) {
      Alert.alert('Validation', 'Name is required');
      return;
    }

    if (!isValidPersonName(normalizedName)) {
      Alert.alert('Validation', 'Name can only contain letters and spaces');
      return;
    }

    const normalizedPhone = normalizePhoneInput(userForm.phone);
    if (!isValidSriLankanPhone(normalizedPhone)) {
      Alert.alert('Validation', 'Enter a valid Sri Lankan phone number (e.g. 0771234567 or +94771234567)');
      return;
    }

    setSavingUser(true);

    try {
      await updateAdminUser(editingUser._id, {
        name: normalizedName,
        phone: normalizedPhone,
        role: userForm.role,
      });

      await loadAdminData(false);
      setUserModalVisible(false);
      Alert.alert('Saved', 'User details updated');
    } catch (error) {
      Alert.alert('User Error', error.message || 'Could not update user');
    } finally {
      setSavingUser(false);
    }
  };

  const renderTopBar = () => (
    <View style={styles.topBar}>
      <View style={styles.topBarMainRow}>
        <View style={styles.logoRow}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoBadgeText}>HC</Text>
          </View>
          <View>
            <Text style={styles.logoText}>HOTEL CANVAS</Text>
            <Text style={styles.logoSubText}>Admin Dashboard</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.backButtonCompact} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.backButtonCompactText}>Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSideMenu = () =>
    isTabletLayout ? (
      <View style={[styles.sideMenu, styles.sideMenuTablet]}>
        <Text style={styles.sideMenuTitle}>Hotel Reservation</Text>
        <Text style={styles.sideMenuSubTitle}>Admin Panel</Text>

        <View style={styles.menuListTablet}>
          {MENU_ITEMS.map((item) => (
            <TouchableOpacity
              key={item}
              style={[styles.menuItem, activeMenu === item && styles.menuItemActive]}
              onPress={() => setActiveMenu(item)}
            >
              <Text style={[styles.menuItemText, activeMenu === item && styles.menuItemTextActive]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.backButtonText}>Back To Site</Text>
        </TouchableOpacity>
      </View>
    ) : (
      <View style={styles.mobileMenuWrap}>
        <Text style={styles.mobileMenuTitle}>Quick Navigation</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mobileMenuRow}>
          {MENU_ITEMS.map((item) => (
            <TouchableOpacity
              key={item}
              style={[styles.menuItem, styles.mobileMenuItem, activeMenu === item && styles.menuItemActive]}
              onPress={() => setActiveMenu(item)}
            >
              <Text style={[styles.menuItemText, activeMenu === item && styles.menuItemTextActive]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );

  const renderMetricCards = () => {
    const cardData = [
      { key: 'total', label: 'Total Rooms', value: metrics.totalRooms },
      { key: 'available', label: 'Available Rooms', value: metrics.availableRooms },
      { key: 'today', label: 'Today Bookings', value: metrics.todayBookings },
      { key: 'pending', label: 'Pending Bookings', value: metrics.pendingBookings },
    ];

    return (
      <View style={styles.cardsGrid}>
        {cardData.map((card) => (
          <View
            key={card.key}
            style={[styles.metricCard, isTabletLayout && styles.metricCardTablet, isMobileLayout && styles.metricCardMobile]}
          >
            <Text style={styles.metricValue}>{card.value}</Text>
            <Text style={styles.metricLabel}>{card.label}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderDashboard = () => (
    <View>
      <View style={[styles.dashboardHeaderRow, isMobileLayout && styles.dashboardHeaderRowMobile]}>
        <View style={styles.dashboardHeaderCopy}>
          <Text style={styles.dashboardTitle}>Dashboard</Text>
          <Text style={styles.dashboardSubtitle}>Welcome to Hotel Canvas reservation overview.</Text>
        </View>

        <TouchableOpacity
          style={[styles.primaryActionButton, isMobileLayout && styles.primaryActionButtonMobile]}
          onPress={() => setActiveMenu('Bookings')}
        >
          <Text style={styles.primaryActionButtonText}>New Booking</Text>
        </TouchableOpacity>
      </View>

      {renderMetricCards()}

      <View style={[styles.panelRow, isTabletLayout && styles.panelRowTablet]}>
        <View style={[styles.panelCard, isTabletLayout && styles.panelCardSplit]}>
          <Text style={styles.panelTitle}>Occupancy Rate</Text>
          <Text style={styles.occupancyValue}>{metrics.occupancyRate}%</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressBar, { width: `${metrics.occupancyRate}%` }]} />
          </View>

          <View style={styles.occupancySummaryRow}>
            <View style={styles.summaryPill}>
              <Text style={styles.summaryPillValue}>{metrics.occupiedRooms}</Text>
              <Text style={styles.summaryPillLabel}>Occupied</Text>
            </View>
            <View style={styles.summaryPill}>
              <Text style={styles.summaryPillValue}>{metrics.availableRooms}</Text>
              <Text style={styles.summaryPillLabel}>Available</Text>
            </View>
          </View>
        </View>

        <View style={[styles.panelCard, isTabletLayout && styles.panelCardSplit]}>
          <Text style={styles.panelTitle}>Room Status Overview</Text>

          <View style={styles.statusPillsRow}>
            {ROOM_STATUS_ORDER.map((statusKey) => (
              <View key={statusKey} style={styles.statusLegendPill}>
                <Text style={styles.statusLegendText}>
                  {statusKey}: {roomStatusSummary[statusKey]}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.roomsGrid}>
            {rooms.slice(0, 12).map((room) => (
              <View
                key={room._id}
                style={[
                  styles.roomTile,
                  {
                    backgroundColor: getRoomStatusColor(room.availabilityStatus),
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.roomTileNumber, { color: getRoomStatusTextColor(room.availabilityStatus) }]}>
                  {room.roomNumber}
                </Text>
                <Text style={[styles.roomTileStatus, { color: getRoomStatusTextColor(room.availabilityStatus) }]}>
                  {room.availabilityStatus || 'Unknown'}
                </Text>
              </View>
            ))}
            {rooms.length === 0 && <Text style={styles.emptyPanelText}>No rooms added yet.</Text>}
          </View>
        </View>
      </View>
    </View>
  );

  const renderRoomsMenu = () => (
    <View style={styles.panelCard}>
      <Text style={styles.panelTitle}>Room Management</Text>
      <Text style={styles.panelSubTitle}>Current room inventory and availability status.</Text>

      {rooms.length === 0 ? (
        <Text style={styles.emptyPanelText}>No rooms found in database.</Text>
      ) : (
        rooms.map((room) => (
          <View key={room._id} style={styles.listItemCard}>
            <View>
              <Text style={styles.listItemTitle}>Room {room.roomNumber}</Text>
              <Text style={styles.listItemSubTitle}>{room.roomType || 'Standard'} room</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getRoomStatusColor(room.availabilityStatus) }]}>
              <Text style={[styles.statusBadgeText, { color: getRoomStatusTextColor(room.availabilityStatus) }]}>
                {room.availabilityStatus || 'Unknown'}
              </Text>
            </View>
          </View>
        ))
      )}
    </View>
  );

  const renderBookingsMenu = () => (
    <View style={styles.panelCard}>
      <Text style={styles.panelTitle}>Booking Approvals</Text>
      <Text style={styles.panelSubTitle}>Review and approve pending hotel reservations.</Text>

      {pendingBookings.length === 0 ? (
        <Text style={styles.emptyPanelText}>No pending bookings right now.</Text>
      ) : (
        pendingBookings.map((booking) => (
          <View key={booking._id} style={styles.bookingItemCard}>
            <Text style={styles.listItemTitle}>
              Room {booking.roomId?.roomNumber || '-'} ({booking.roomId?.roomType || 'Room'})
            </Text>
            <Text style={styles.listItemSubTitle}>Guest: {booking.userId?.name || booking.userId?.email || '-'}</Text>
            <Text style={styles.listItemSubTitle}>
              {new Date(booking.startDate).toLocaleDateString()} to {new Date(booking.endDate).toLocaleDateString()}
            </Text>

            <View style={styles.bookingActionRow}>
              <TouchableOpacity
                style={[styles.smallActionButton, styles.approveButton]}
                onPress={() => handleUpdateBookingStatus(booking._id, 'Approved')}
              >
                <Text style={styles.smallActionText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.smallActionButton, styles.rejectButton]}
                onPress={() => handleUpdateBookingStatus(booking._id, 'Rejected')}
              >
                <Text style={styles.smallActionText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </View>
  );

  const renderUsersMenu = () => (
    <View style={styles.panelCard}>
      <Text style={styles.panelTitle}>User Management</Text>
      <Text style={styles.panelSubTitle}>Edit hotel reservation user details and roles.</Text>

      {users.length === 0 ? (
        <Text style={styles.emptyPanelText}>No users available.</Text>
      ) : (
        users.map((user) => (
          <View key={user._id} style={styles.listItemCard}>
            <View style={styles.userInfoWrap}>
              <Text style={styles.listItemTitle}>{user.name}</Text>
              <Text style={styles.listItemSubTitle}>{user.email}</Text>
              <Text style={styles.listItemSubTitle}>Role: {user.role || 'guest'}</Text>
            </View>
            <TouchableOpacity style={styles.editButton} onPress={() => openUserEditor(user)}>
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </View>
  );

  const renderPromotionsMenu = () => (
    <View style={styles.panelCard}>
      <Text style={styles.panelTitle}>Promotions</Text>
      <Text style={styles.panelSubTitle}>Create and update coupon codes, discount values, and valid periods.</Text>

      <TouchableOpacity style={styles.primaryActionButton} onPress={() => navigation.navigate('PromotionAdmin')}>
        <Text style={styles.primaryActionButtonText}>Open Promotion Manager</Text>
      </TouchableOpacity>
    </View>
  );

  const renderPlaceholderMenu = (title, subtitle) => (
    <View style={styles.panelCard}>
      <Text style={styles.panelTitle}>{title}</Text>
      <Text style={styles.panelSubTitle}>{subtitle}</Text>
      <Text style={styles.emptyPanelText}>TODO: Connect {title.toLowerCase()} module to backend APIs.</Text>
    </View>
  );

  const renderContent = () => {
    if (activeMenu === 'Dashboard') return renderDashboard();
    if (activeMenu === 'Rooms') return renderRoomsMenu();
    if (activeMenu === 'Bookings') return renderBookingsMenu();
    if (activeMenu === 'Users') return renderUsersMenu();
    if (activeMenu === 'Promotions') return renderPromotionsMenu();
    if (activeMenu === 'Payments') {
      return renderPlaceholderMenu('Payments', 'Track and reconcile hotel reservation payments.');
    }

    return renderPlaceholderMenu('Reports', 'Generate business and operational performance reports.');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.gold500} />
        <Text style={styles.loadingText}>Loading admin dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {renderTopBar()}

      <View style={[styles.mainBody, isTabletLayout && styles.mainBodyTablet]}>
        {renderSideMenu()}

        <ScrollView
          style={styles.contentArea}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {refreshing && <Text style={styles.refreshText}>Refreshing data...</Text>}
          {renderContent()}
        </ScrollView>
      </View>

      <Modal animationType="slide" visible={userModalVisible} transparent onRequestClose={() => setUserModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit User</Text>

            <Text style={styles.formLabel}>Name</Text>
            <TextInput
              style={styles.formInput}
              value={userForm.name}
              onChangeText={(value) => handleUserFieldChange('name', value)}
              placeholder="User name"
              placeholderTextColor={colors.slate500}
            />

            <Text style={styles.formLabel}>Phone</Text>
            <TextInput
              style={styles.formInput}
              value={userForm.phone}
              onChangeText={(value) => handleUserFieldChange('phone', normalizePhoneInput(value))}
              placeholder="Phone number"
              placeholderTextColor={colors.slate500}
            />

            <Text style={styles.formLabel}>Role</Text>
            <View style={styles.roleOptionsRow}>
              {USER_ROLES.map((role) => (
                <TouchableOpacity
                  key={role}
                  style={[styles.roleOption, userForm.role === role && styles.roleOptionActive]}
                  onPress={() => handleUserFieldChange('role', role)}
                >
                  <Text style={[styles.roleOptionText, userForm.role === role && styles.roleOptionTextActive]}>{role}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalSecondaryButton} onPress={() => setUserModalVisible(false)}>
                <Text style={styles.modalSecondaryButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.modalPrimaryButton} onPress={handleSaveUser} disabled={savingUser}>
                {savingUser ? <ActivityIndicator color={colors.navy900} /> : <Text style={styles.modalPrimaryButtonText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.cream100,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.cream100,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    color: colors.slate700,
    fontSize: 14,
  },
  topBar: {
    backgroundColor: colors.navy900,
    paddingTop: 14,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  topBarMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gold500,
    marginRight: 10,
  },
  logoBadgeText: {
    color: colors.navy900,
    fontWeight: '700',
    fontSize: 14,
  },
  logoText: {
    color: colors.cream100,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  logoSubText: {
    color: '#c8d2e8',
    fontSize: 12,
    marginTop: 2,
  },
  backButtonCompact: {
    borderWidth: 1,
    borderColor: colors.gold500,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  backButtonCompactText: {
    color: colors.gold400,
    fontWeight: '700',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  mainBody: {
    flex: 1,
  },
  mainBodyTablet: {
    flexDirection: 'row',
  },
  sideMenu: {
    backgroundColor: colors.navy800,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.navy700,
  },
  sideMenuTablet: {
    width: 250,
    borderRightWidth: 1,
    borderBottomWidth: 0,
    borderRightColor: colors.navy700,
  },
  sideMenuTitle: {
    color: colors.cream100,
    fontSize: 20,
    fontWeight: '800',
  },
  sideMenuSubTitle: {
    color: colors.gold400,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
    marginBottom: 14,
  },
  mobileMenuWrap: {
    backgroundColor: colors.navy800,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
  },
  mobileMenuTitle: {
    color: '#dbe2ef',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    fontWeight: '700',
  },
  mobileMenuRow: {
    gap: 8,
    paddingRight: 10,
  },
  menuListTablet: {
    gap: 8,
  },
  menuItem: {
    backgroundColor: colors.navy700,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  mobileMenuItem: {
    minWidth: 110,
    alignItems: 'center',
  },
  menuItemActive: {
    backgroundColor: colors.gold500,
    borderColor: colors.gold500,
  },
  menuItemText: {
    color: '#dbe2ef',
    fontSize: 15,
    fontWeight: '700',
  },
  menuItemTextActive: {
    color: colors.navy900,
  },
  backButton: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.gold500,
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 11,
  },
  backButtonText: {
    color: colors.gold400,
    fontWeight: '700',
    fontSize: 13,
    textTransform: 'uppercase',
  },
  contentArea: {
    flex: 1,
  },
  contentContainer: {
    padding: 14,
    paddingBottom: 30,
  },
  refreshText: {
    color: colors.slate600,
    marginBottom: 8,
    fontSize: 12,
  },
  dashboardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
    gap: 10,
  },
  dashboardHeaderRowMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 12,
  },
  dashboardHeaderCopy: {
    flexShrink: 1,
  },
  dashboardTitle: {
    color: colors.navy900,
    fontSize: 48,
    fontWeight: '800',
    lineHeight: 54,
  },
  dashboardSubtitle: {
    color: colors.slate600,
    fontSize: 14,
    marginTop: 4,
  },
  primaryActionButton: {
    backgroundColor: colors.gold500,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  primaryActionButtonMobile: {
    width: '100%',
    alignItems: 'center',
  },
  primaryActionButtonText: {
    color: colors.navy900,
    fontWeight: '800',
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  metricCard: {
    width: '48.5%',
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  metricCardMobile: {
    minHeight: 120,
    justifyContent: 'center',
  },
  metricCardTablet: {
    width: '24%',
  },
  metricValue: {
    color: colors.navy900,
    fontSize: 46,
    fontWeight: '800',
    marginBottom: 4,
    lineHeight: 48,
  },
  metricLabel: {
    color: colors.slate700,
    fontSize: 15,
    fontWeight: '700',
  },
  panelRow: {
    gap: 10,
  },
  panelRowTablet: {
    flexDirection: 'row',
  },
  panelCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 15,
  },
  panelCardSplit: {
    flex: 1,
  },
  panelTitle: {
    color: colors.navy900,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  panelSubTitle: {
    color: colors.slate600,
    fontSize: 13,
    marginBottom: 12,
  },
  occupancyValue: {
    color: colors.navy900,
    fontSize: 58,
    fontWeight: '800',
    marginTop: 8,
    lineHeight: 62,
  },
  progressTrack: {
    marginTop: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.cream200,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.gold500,
  },
  occupancySummaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  summaryPill: {
    flex: 1,
    backgroundColor: colors.cream100,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  summaryPillValue: {
    color: colors.navy900,
    fontSize: 22,
    fontWeight: '700',
  },
  summaryPillLabel: {
    color: colors.slate600,
    fontSize: 13,
  },
  statusPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  statusLegendPill: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 30,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: colors.cream100,
  },
  statusLegendText: {
    color: colors.slate700,
    fontSize: 12,
    fontWeight: '600',
  },
  roomsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roomTile: {
    width: '31%',
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  roomTileNumber: {
    fontSize: 16,
    fontWeight: '700',
  },
  roomTileStatus: {
    fontSize: 11,
    marginTop: 3,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyPanelText: {
    color: colors.slate600,
    fontSize: 14,
  },
  listItemCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  listItemTitle: {
    color: colors.navy900,
    fontSize: 15,
    fontWeight: '700',
  },
  listItemSubTitle: {
    color: colors.slate600,
    marginTop: 3,
    fontSize: 12,
  },
  statusBadge: {
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  bookingItemCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  bookingActionRow: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 8,
  },
  smallActionButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  approveButton: {
    backgroundColor: '#2f8f47',
  },
  rejectButton: {
    backgroundColor: '#c13a1f',
  },
  smallActionText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 13,
  },
  userInfoWrap: {
    flex: 1,
  },
  editButton: {
    backgroundColor: colors.gold500,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  editButtonText: {
    color: colors.navy900,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 16,
  },
  modalTitle: {
    color: colors.navy900,
    fontSize: 21,
    fontWeight: '700',
    marginBottom: 10,
  },
  formLabel: {
    color: colors.slate700,
    fontSize: 12,
    marginBottom: 6,
    marginTop: 6,
    fontWeight: '600',
  },
  formInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.navy900,
  },
  roleOptionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  roleOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  roleOptionActive: {
    backgroundColor: colors.gold500,
    borderColor: colors.gold500,
  },
  roleOptionText: {
    color: colors.slate700,
    fontWeight: '600',
  },
  roleOptionTextActive: {
    color: colors.navy900,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  modalSecondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    alignItems: 'center',
    paddingVertical: 11,
  },
  modalSecondaryButtonText: {
    color: colors.slate700,
    fontWeight: '700',
  },
  modalPrimaryButton: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: colors.gold500,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
  },
  modalPrimaryButtonText: {
    color: colors.navy900,
    fontWeight: '700',
  },
});

export default AdminScreen;
