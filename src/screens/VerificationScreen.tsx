
import React, {
  useState,
  useEffect,
  useRef,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';

const VerificationScreen = ({ navigation }: any) => {

  const [verified, setVerified] = useState(false);
  const scanAnim = useRef(
  new Animated.Value(0)
).current;
useEffect(() => {

  Animated.loop(

    Animated.sequence([

      Animated.timing(scanAnim, {
        toValue: 180,
        duration: 1500,
        useNativeDriver: true,
      }),

      Animated.timing(scanAnim, {
        toValue: 0,
        duration: 1500,
        useNativeDriver: true,
      }),

    ])

  ).start();

}, []);

  const handleVerification = () => {

    setTimeout(() => {

      setVerified(true);

      setTimeout(() => {

        navigation.navigate('Dashboard');

      }, 1500);

    }, 2000);
  };

  return (

    <View style={styles.container}>

      <Text style={styles.title}>
        AI Face Verification
      </Text>

      <Text style={styles.processing}>
        Scanning Face with AI...
      </Text>

      <View
        style={[
          styles.faceBox,
          {
            borderColor: verified
              ? '#22c55e'
              : '#2563eb',
          },
        ]}
      >

        <Text style={styles.faceText}>
          👤
        </Text>

      </View>
      <Animated.View
  style={[
    styles.scanLine,
    {
      transform: [
        {
          translateY: scanAnim,
        },
      ],
    },
  ]}
/>

      <TouchableOpacity
        style={styles.button}
        onPress={handleVerification}
      >

        <Text style={styles.buttonText}>
          Scan Face
        </Text>

      </TouchableOpacity>

      {verified && (

        <Text style={styles.success}>
          Face Verified Successfully ✅
        </Text>

      )}

    </View>

  );
};

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  title: {
    color: 'white',
    fontSize: 30,
    fontWeight: 'bold',
    marginBottom: 20,
  },

  processing: {
    color: '#9ca3af',
    fontSize: 16,
    marginBottom: 30,
  },

  faceBox: {
    width: 220,
    height: 220,
    borderWidth: 3,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },

  faceText: {
    fontSize: 90,
  },

  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 14,
  },

  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },

  success: {
    color: '#22c55e',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 40,
  },
  scanLine: {
  position: 'absolute',
  width: '100%',
  height: 4,
  backgroundColor: '#22c55e',
},

});

export default VerificationScreen;