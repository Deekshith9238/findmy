import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const ServicesScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Services</Text>
      <Text style={styles.subtitle}>Browse and filter service providers</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 8,
  },
});

export default ServicesScreen;