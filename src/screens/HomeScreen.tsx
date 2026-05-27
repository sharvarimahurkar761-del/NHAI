import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
} from 'react-native';

const HomeScreen = ({ navigation }: any) => {

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
      }}>

      <Text
        style={{
          fontSize: 30,
          marginBottom: 20,
        }}>
        Home Screen 🏠
      </Text>

      <TouchableOpacity
        onPress={() =>
          navigation.navigate('Profile')
        }
        style={{
          backgroundColor: '#2c2f6b',
          padding: 15,
          borderRadius: 10,
        }}>

        <Text
          style={{
            color: 'white',
            fontSize: 18,
          }}>
          Go to Profile
        </Text>

      </TouchableOpacity>

    </View>
  );
};

export default HomeScreen;