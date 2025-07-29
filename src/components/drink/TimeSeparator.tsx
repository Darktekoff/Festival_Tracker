import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

interface TimeSeparatorProps {
  minutes: number;
}

export function TimeSeparator({ minutes }: TimeSeparatorProps) {
  const { colors } = useTheme();

  const formatTimeElapsed = (mins: number): string => {
    if (mins < 60) {
      return `${mins} min`;
    } else {
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      if (remainingMins === 0) {
        return `${hours}h`;
      }
      return `${hours}h ${remainingMins}min`;
    }
  };

  // Couleur basée sur le temps écoulé
  const getColor = () => {
    if (minutes < 30) return colors.danger; // Rouge si moins de 30 min
    if (minutes < 60) return colors.warning; // Orange si moins d'1h
    return colors.success; // Vert si plus d'1h
  };

  return (
    <View style={styles.container}>
      <View style={[styles.line, { backgroundColor: colors.border }]} />
      
      <View style={[styles.content, { backgroundColor: colors.background }]}>
        <Ionicons name="chevron-up" size={16} color={getColor()} />
        <Text style={[styles.time, { color: getColor() }]}>
          {formatTimeElapsed(minutes)}
        </Text>
        <Ionicons name="chevron-down" size={16} color={getColor()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4
  },
  line: {
    position: 'absolute',
    width: 1,
    height: '100%',
    opacity: 0.3
  },
  content: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 2
  },
  time: {
    fontSize: 12,
    fontWeight: '600'
  }
});