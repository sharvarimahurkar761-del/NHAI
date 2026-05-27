import React from 'react';

import {
  View,
  Text,
  StyleSheet,
} from 'react-native';

const App = () => {

  return (

    <View style={styles.container}>

      <Text style={styles.text}>
        FaceAuth AI 🚀
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

  text: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
  },

});

export default App;