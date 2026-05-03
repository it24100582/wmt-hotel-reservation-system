import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import LoadingScreen from '../components/LoadingScreen';

import HomeScreen from '../screens/HomeScreen';
import RoomsScreen from '../screens/RoomsScreen';
import RoomDetailScreen from '../screens/RoomDetailScreen';
import LoginScreen from '../screens/LoginScreen';
import RegistrationScreen from '../screens/RegistrationScreen';
import BookingScreen from '../screens/BookingScreen';
import ConfirmationScreen from '../screens/ConfirmationScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AdminScreen from '../screens/AdminScreen';
import PromotionsScreen from '../screens/PromotionsScreen';
import PromotionAdminScreen from '../screens/PromotionAdminScreen';
import AboutScreen from '../screens/AboutScreen';
import colors from '../theme/colors';

const Stack = createNativeStackNavigator();

const headerOptions = {
  headerStyle: { backgroundColor: colors.navy900 },
  headerTintColor: colors.gold500,
  headerTitleStyle: { fontWeight: 'bold' },
};

const AppNavigator = () => {
  const { loading, isAdmin } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator screenOptions={headerOptions}>
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Rooms" component={RoomsScreen} options={{ title: 'Rooms' }} />
      <Stack.Screen name="RoomDetail" component={RoomDetailScreen} options={{ title: 'Room Details' }} />
      <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Sign In' }} />
      <Stack.Screen name="Register" component={RegistrationScreen} options={{ title: 'Create Account' }} />
      <Stack.Screen name="Booking" component={BookingScreen} options={{ title: 'Book Now' }} />
      <Stack.Screen name="Promotions" component={PromotionsScreen} options={{ title: 'Promotions' }} />
      <Stack.Screen name="About" component={AboutScreen} options={{ title: 'About Us' }} />
      <Stack.Screen name="Confirmation" component={ConfirmationScreen} options={{ title: 'Booking Confirmed' }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'My Profile' }} />
      {isAdmin && <Stack.Screen name="Admin" component={AdminScreen} options={{ title: 'Hotel Canvas Admin' }} />}
      {isAdmin && (
        <Stack.Screen
          name="PromotionAdmin"
          component={PromotionAdminScreen}
          options={{ title: 'Manage Promotions' }}
        />
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;
