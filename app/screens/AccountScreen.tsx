import { useNavigation } from '@react-navigation/native'
import React, { useEffect, useState } from 'react'
import { View, StyleSheet, Button } from 'react-native'
import routes from '../navigation/routes'
import { AppIcon, getIconNames } from '../services/iconsService'
import { MaterialCommunityIcons } from '@expo/vector-icons';
import colors from '../config/colors'

export const AccountScreen = () => {
  const navigator = useNavigation<any>();
  const [icons, seticons] = useState<AppIcon[]>([]);

  useEffect(() => {
    getIconNames().then(seticons)
  }, []) 

  return (
    <View style={styles.container} >
      <Button title='scheme' onPress={() => navigator.navigate(routes.ACCOUNT_EDIT_SCHEME)}/>

        {icons.map((icon, index) => (
         <MaterialCommunityIcons key={icon.id} name={icon.name} size={28} color={colors.primary} />

        ) )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    
  }
})