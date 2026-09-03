import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';

const wellcomeLogo = require('../../../assets/images/logo.png');

export function AppLoadingScreen() {
  return (
    <View style={styles.container} accessibilityLabel="Carregando Wellcome">
      <StatusBar style="dark" />
      <View style={styles.brand}>
        <Image
          source={wellcomeLogo}
          resizeMode="contain"
          style={styles.logo}
          accessible
          accessibilityLabel="Wellcome"
        />
        <ActivityIndicator
          size="small"
          color="#C45D22"
          style={styles.indicator}
          accessibilityLabel="Carregando aplicativo"
        />
        <Text style={styles.message}>Preparando sua experiência...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF8F3',
  },
  brand: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logo: {
    width: 260,
    height: 88,
  },
  indicator: {
    marginTop: 28,
  },
  message: {
    marginTop: 12,
    color: '#6B4A3A',
    fontSize: 14,
    fontWeight: '500',
  },
});
