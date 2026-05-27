import React from 'react';

import { NavigationContainer }
from '@react-navigation/native';

import { createNativeStackNavigator }
from '@react-navigation/native-stack';

import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import VerificationScreen from '../screens/VerificationScreen';
const Stack = createNativeStackNavigator();

const AppNavigator = () => {

  return (

    <NavigationContainer>

      <Stack.Navigator>

        <Stack.Screen
          name="Splash"
          component={SplashScreen}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
  name="Verification"
  component={VerificationScreen}
/>

      </Stack.Navigator>

    </NavigationContainer>

  );
};

export default AppNavigator;