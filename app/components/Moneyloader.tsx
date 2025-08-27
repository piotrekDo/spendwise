import LottieView from 'lottie-react-native';
import React from 'react';
import { View, StyleSheet } from 'react-native';

export const Moneyloader = () => {
  return (
    <LottieView
      style={{
        width: 200,
        height: 200,
        alignSelf: 'center',
        backgroundColor: 'transparent'
      }}
      autoPlay
      loop
      source={require('../../assets/Money.json')}
    />
  );
};

const styles = StyleSheet.create({
  container: {},
});
