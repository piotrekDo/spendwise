import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';

import { initDatabase } from './app/database/db';
import navigationTheme from './app/navigation/navigationTheme';
import { RootNavigator } from './app/navigation/RootNavigator';

export default function App() {
  const [isDbReady, setIsDbReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        await initDatabase();
        setIsDbReady(true);
      } catch (err) {
        console.error('DB init failed:', err);
      }
    })();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer theme={navigationTheme}>
          {isDbReady ? (
            <RootNavigator />
          ) : (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111' }}>
              <ActivityIndicator size="large" color="#fff" />
            </View>
          )}
          <StatusBar style="light" />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
