import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BudgetScreen } from '../screens/BudgetScreen';
import routes from './routes';
import { SQLiteDebug } from '../screens/SqLiteDebug';
import AccountNavigator from './AccountNavigator';
import { HomeScreen } from '../screens/HomeScreen';

const Tab = createBottomTabNavigator();

export const TabsNavigator = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Tab.Navigator>
        <Tab.Screen
          name={routes.HOME}
          component={HomeScreen}
          options={{
            headerShown: false,
            tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name='finance' color={color} size={size} />,
          }}
        />
        <Tab.Screen
          name={routes.BUDGET}
          component={BudgetScreen}
          options={{
            headerShown: false,
            tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name='wallet' color={color} size={size} />,
          }}
        />
        <Tab.Screen
          name={routes.DEBUG}
          component={SQLiteDebug}
          options={{
            headerShown: false,
            tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name='bug' color={color} size={size} />,
          }}
        />
        <Tab.Screen
          name={routes.ACCOUNT}
          component={AccountNavigator}
          options={{
            headerShown: false,
            tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name='account' color={color} size={size} />,
          }}
        />
      </Tab.Navigator>
    </GestureHandlerRootView>
  );
};
