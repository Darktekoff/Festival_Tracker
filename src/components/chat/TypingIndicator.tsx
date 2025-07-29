import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface TypingIndicatorProps {
  typingUsers: string[];
}

export function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
  const { colors } = useTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (typingUsers.length > 0) {
      // Animation de pulsation
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true
          }),
          Animated.timing(animatedValue, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true
          })
        ])
      );
      
      pulse.start();
      
      return () => {
        pulse.stop();
      };
    }
  }, [typingUsers.length, animatedValue]);

  if (typingUsers.length === 0) {
    return null;
  }

  const getTypingText = () => {
    if (typingUsers.length === 1) {
      return `${typingUsers[0]} est en train d'écrire...`;
    } else if (typingUsers.length === 2) {
      return `${typingUsers[0]} et ${typingUsers[1]} sont en train d'écrire...`;
    } else {
      return `${typingUsers[0]} et ${typingUsers.length - 1} autres sont en train d'écrire...`;
    }
  };

  const renderDots = () => (
    <View style={styles.dotsContainer}>
      {[0, 1, 2].map((index) => (
        <Animated.View
          key={index}
          style={[
            styles.dot,
            { backgroundColor: colors.primary },
            {
              opacity: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0.3, 1]
              }),
              transform: [
                {
                  translateY: animatedValue.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, -4, 0]
                  })
                }
              ]
            }
          ]}
        />
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.bubble, { backgroundColor: colors.surface }]}>
        <Text style={[styles.text, { color: colors.textLight }]}>
          {getTypingText()}
        </Text>
        {renderDots()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '80%'
  },
  text: {
    fontSize: 12,
    fontStyle: 'italic',
    marginRight: 8
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2
  }
});