import React, { useEffect } from 'react';

import {
  View,
  Text,
  StyleSheet,
} from 'react-native';

const SplashScreen = ({ navigation }: any) => {

  useEffect(() => {

    setTimeout(() => {

      navigation.replace('Login');

    }, 2500);

  }, []);

  return (

    <View style={styles.container}>

      <Text style={styles.logo}>
        FaceAuth AI 🚀
      </Text>

      <Text style={styles.subtitle}>
        Secure Identity Verification
      </Text>

    </View>

  );
};

const styles = StyleSheet.create({

  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111827',
  },

  logo: {
    color: 'white',
    fontSize: 38,
    fontWeight: 'bold',
  },

  subtitle: {
    color: '#9ca3af',
    fontSize: 18,
    marginTop: 10,
  },

});

export default SplashScreen;