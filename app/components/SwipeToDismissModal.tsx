// SwipeToDismissModal.tsx
import React, { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

type Props = {
  children: ReactNode;
  onClose?: () => void;
  /** ile px trzeba zsunąć, by zamknąć */
  threshold?: number;
  /** max opacity tła */
  backdropOpacity?: number;
  /** zaokrąglenie górnych rogów */
  cornerRadius?: number;
};

export default function SwipeToDismissModal({
  children,
  onClose,
  threshold = 120,
  backdropOpacity = 0.5,
  cornerRadius = 16,
}: Props) {
  const navigation = useNavigation<any>();
  const close = onClose ?? (() => navigation.goBack());

  const translateY = useSharedValue(0);

  // PAN tylko na uchwycie – brak konfliktu ze scrollem listy
  const panOnHandle = Gesture.Pan()
    .activeOffsetY(10)
    .failOffsetY([-10, 0])
    .onUpdate(e => {
      translateY.value = Math.max(0, e.translationY);
    })
    .onEnd(e => {
      const shouldClose = translateY.value > threshold || e.velocityY > 900;
      if (shouldClose) runOnJS(close)();
      else translateY.value = withSpring(0, { damping: 22, stiffness: 220 });
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    borderTopLeftRadius: cornerRadius,
    borderTopRightRadius: cornerRadius,
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.value, [0, threshold], [backdropOpacity, 0]),
  }));

  return (
    <View style={styles.root}>
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, backdropStyle]} />
      <Pressable style={StyleSheet.absoluteFill} onPress={close} />

      {/* Karta */}
      <Animated.View style={[styles.card, cardStyle]}>
        {/* UCHWYT z pan-gestem */}
        <GestureDetector gesture={panOnHandle}>
          <View style={styles.handleHitbox}>
            <View style={styles.handle} />
          </View>
        </GestureDetector>

        {/* Treść – żadnych gestów, scroll pozostaje natywny */}
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'black' },
  card: {
    backgroundColor: '#1F2128',
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    minHeight: '35%',
    maxHeight: '92%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  handleHitbox: {
    alignItems: 'center',
    paddingVertical: 20,     // większe „pole łapania”
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
});
