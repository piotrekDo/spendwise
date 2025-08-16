import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TabsNavigator } from './TabsNavigator';
import { SubCategoryEditScreen } from '../screens/modals/SubCategoryEditScreen';
import { CategoryEditScreen } from '../screens/modals/CategoryEditScreen';
import routes from './routes';
import { EnvelopesHome } from '../screens/modals/EnvelopesHome';
import { EnvelopeDetails } from '../screens/modals/EnvelopeDetails';
import { EnvelopeEdit } from '../screens/modals/EnvelopeEdit';
import { CategoriesStats } from '../screens/modals/CategoriesStats';

export type RootStackParamList = {
  Main: undefined;
  SubCategoryEditScreen: { sub?: any; expandedCategory: number } | undefined;
  CategoryEditScreen: { cat?: any } | undefined;
  EnvelopesHome: {month1: number, year: number} | undefined;
  EnvelopeDetails: { envelopeId: number; year: number; month1: number } | undefined;
  EnvelopeEdit: { envelopeId:number; initialName?:string; initialColor?:string } | undefined
  CategoriesStats: undefined;
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
      <Stack.Screen
        name={routes.MODAL_ENVELOPES_HOME}
        component={EnvelopesHome}
        options={{
          presentation: 'transparentModal',
          contentStyle: { backgroundColor: 'transparent' },
          animation: 'fade',
        }}
      />
      <Stack.Screen
        name={routes.ENVELOPE_DETAILS}
        component={EnvelopeDetails}
        options={{
          presentation: 'transparentModal',
          contentStyle: { backgroundColor: 'transparent' },
          animation: 'fade',
        }}
      />
      <Stack.Screen
        name={routes.ENVELOPE_EDIT}
        component={EnvelopeEdit}
        options={{
          presentation: 'transparentModal',
          contentStyle: { backgroundColor: 'transparent' },
          animation: 'fade',
        }}
      />
      <Stack.Screen
        name={routes.CATEGORIES_STATS}
        component={CategoriesStats}
        options={{
          presentation: 'transparentModal',
          contentStyle: { backgroundColor: 'transparent' },
          animation: 'fade',
        }}
      />
    </Stack.Navigator>
  );
};
