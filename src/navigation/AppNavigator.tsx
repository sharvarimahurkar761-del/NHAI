import React from 'react';

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from '../screens/HomeScreen';
import CameraScreen from '../screens/CameraScreen';
import EnrollmentScreen from '../screens/EnrollmentScreen';
const Stack = createNativeStackNavigator();

const AppNavigator = () => {

  return (

    <NavigationContainer>

      <Stack.Navigator initialRouteName="Home">

        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="Camera"
          component={CameraScreen}
          options={{ title: 'Face Capture' }}
        />

        <Stack.Screen
          name="Enrollment"
          component={EnrollmentScreen}
          options={{ title: 'Face Enrollment' }}
        />

      </Stack.Navigator>

    </NavigationContainer>

  );
};

export default AppNavigator;