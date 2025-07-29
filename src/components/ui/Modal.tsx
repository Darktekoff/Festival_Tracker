import React from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
  size?: 'small' | 'medium' | 'large' | 'full';
  scrollable?: boolean;
}

export function Modal({
  visible,
  onClose,
  title,
  children,
  showCloseButton = true,
  size = 'medium',
  scrollable = false
}: ModalProps) {
  const { colors, theme, isDark } = useTheme();

  const getModalSize = () => {
    switch (size) {
      case 'small':
        return { maxHeight: '40%', width: '85%', maxWidth: 320 };
      case 'large':
        return { maxHeight: '85%', width: '95%', maxWidth: 500 };
      case 'full':
        return { height: '100%', width: '100%' };
      default:
        return { maxHeight: '60%', width: '90%', maxWidth: 400 };
    }
  };

  const content = (
    <View
      style={[
        styles.modalContent,
        {
          backgroundColor: colors.surface,
          borderRadius: size === 'full' ? 0 : theme.borderRadius.lg,
          padding: theme.spacing.lg,
          ...getModalSize()
        }
      ]}
    >
      {(title || showCloseButton) && (
        <View style={styles.header}>
          {title && (
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          )}
          {showCloseButton && (
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeButton, { padding: theme.spacing.sm }]}
            >
              <Ionicons name="close" size={24} color={colors.textLight} />
            </TouchableOpacity>
          )}
        </View>
      )}
      
      {scrollable ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        children
      )}
    </View>
  );

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          {Platform.OS === 'ios' ? (
            <BlurView intensity={20} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />
          )}
          
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
          >
            <TouchableWithoutFeedback>
              {content}
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16
  },
  modalContent: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1
  },
  closeButton: {
    marginLeft: 16
  }
});