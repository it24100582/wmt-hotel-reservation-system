import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

const LoadingScreen = () => (
  <View style={styles.container}>
    <ActivityIndicator size="large" color="#d4af37" />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f0f1a',
  },
});

export default LoadingScreen;
