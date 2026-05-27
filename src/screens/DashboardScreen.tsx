import React from 'react';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

const DashboardScreen = () => {

  return (

    <View style={styles.container}>

      <Text style={styles.title}>
        AI Face Verification ✅
      </Text>

      <Text style={styles.subtitle}>
        Smart AI-powered identity authentication
      </Text>

      <View style={styles.card}>

        <Text style={styles.cardTitle}>
          Verification Details
        </Text>

        <Text style={styles.info}>
          👤 Name: Rahul Sharma
        </Text>

        <Text style={styles.info}>
          🆔 Aadhaar: XXXX XXXX 4589
        </Text>

        <Text style={styles.info}>
          🤖 AI Confidence: 98.7%
        </Text>

        <Text style={styles.info}>
          ⏱ Verified at: 10:42 AM
        </Text>

        <Text style={styles.success}>
          ✅ Identity Verified
        </Text>

      </View>

      <TouchableOpacity style={styles.button}>

        <Text style={styles.buttonText}>
          Start Verification
        </Text>

      </TouchableOpacity>

    </View>

  );
};

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#111827',
    padding: 20,
    justifyContent: 'center',
  },

  title: {
    color: 'white',
    fontSize: 30,
    fontWeight: 'bold',
    marginBottom: 10,
  },

  subtitle: {
    color: '#9ca3af',
    fontSize: 16,
    marginBottom: 30,
  },

  card: {
    backgroundColor: '#1f2937',
    padding: 25,
    borderRadius: 20,
    marginBottom: 30,
  },

  cardTitle: {
    color: '#9ca3af',
    fontSize: 18,
    marginBottom: 20,
  },

  info: {
    color: 'white',
    fontSize: 17,
    marginBottom: 12,
  },

  success: {
    color: '#22c55e',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 15,
  },

  button: {
    backgroundColor: '#2563eb',
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
  },

  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },

});

export default DashboardScreen;