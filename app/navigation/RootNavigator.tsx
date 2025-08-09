import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TabsNavigator } from './TabsNavigator';
import { SubCategoryEditScreen } from '../screens/modals/SubCategoryEditScreen';
import { CategoryEditScreen } from '../screens/modals/CategoryEditScreen';
import routes from './routes';

export type RootStackParamList = {
  Main: undefined;
  SubCategoryEditScreen: { sub?: any; expandedCategory: number } | undefined;
  CategoryEditScreen: { cat?: any } | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      {/* Ekrany główne */}
      <Stack.Screen name="Main" component={TabsNavigator} />

      {/* Ekrany modalne jako przeźroczyste overlaye */}
      <Stack.Screen
        name={routes.MODAL_SUBCATEGORY_EDIT}
        component={SubCategoryEditScreen}
        options={{
          presentation: 'transparentModal',
          contentStyle: { backgroundColor: 'transparent' },
          animation: 'fade',
        }}
      />
      <Stack.Screen
        name={routes.MODAL_CATEGORY_EDIT}
        component={CategoryEditScreen}
        options={{
          presentation: 'transparentModal',
          contentStyle: { backgroundColor: 'transparent' },
          animation: 'fade',
        }}
      />
    </Stack.Navigator>
  );
};
