import { DefaultTheme } from '@react-navigation/native';
import colors from '../config/colors';

export default {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.white,
    background: colors.background,
    card: colors.primary, // tło navbaru ustaw na primary
    text: colors.background, // kolor tekstu na navbarze na biały
  },
};
