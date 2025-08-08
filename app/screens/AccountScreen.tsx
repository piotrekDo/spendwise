import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { Button, StyleSheet, View } from 'react-native';
import routes from '../navigation/routes';

export const AccountScreen = () => {
  const navigator = useNavigation<any>();

  return (
    <View style={styles.container}>
      <Button title='scheme' onPress={() => navigator.navigate(routes.ACCOUNT_EDIT_SCHEME)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {},
});
