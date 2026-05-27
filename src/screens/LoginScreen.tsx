import React, { useState } from 'react';

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

const LoginScreen = ({ navigation }: any) => {

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {

    navigation.navigate('Verification');
  };

  return (

    <View style={styles.container}>

      <Text style={styles.title}>
        Welcome Back 👋
      </Text>

      <TextInput
        placeholder="Enter Email"
        placeholderTextColor="#9ca3af"
        style={styles.input}
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        placeholder="Enter Password"
        placeholderTextColor="#9ca3af"
        style={styles.input}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleLogin}
      >

        <Text style={styles.buttonText}>
          Login
        </Text>

      </TouchableOpacity>

    </View>
  );
};

const styles = StyleSheet.create({

  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 25,
    backgroundColor: '#111827',
  },

  title: {
    color: 'white',
    fontSize: 34,
    fontWeight: 'bold',
    marginBottom: 40,
  },

  input: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 15,
    color: 'white',
    marginBottom: 20,
    fontSize: 16,
  },

  button: {
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },

  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },

});

export default LoginScreen;