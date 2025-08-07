import { createNativeStackNavigator } from '@react-navigation/native-stack';

import routes from './routes';
import { AccountScreen } from '../screens/AccountScreen';
import { EditSchemeScreen } from '../screens/EditSchemeScreen';

const Stack = createNativeStackNavigator();
const AccountNavigator = () => (
  <Stack.Navigator>
    <Stack.Screen name={routes.ACCOUNT} component={AccountScreen} />
    <Stack.Screen name={routes.ACCOUNT_EDIT_SCHEME} component={EditSchemeScreen} />
  </Stack.Navigator>
);

export default AccountNavigator;
