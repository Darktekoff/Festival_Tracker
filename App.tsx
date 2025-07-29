import 'react-native-get-random-values';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './src/context/ThemeContext';
import { AuthProvider } from './src/context/AuthContext';
import { GroupProvider } from './src/context/GroupContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import notificationService from './src/services/notificationService';
import offlineService from './src/services/offlineService';
import { StyleSheet, Platform } from 'react-native';

export default function App() {
  useEffect(() => {
    // Initialiser les services
    const initializeServices = async () => {
      try {
        await notificationService.initialize();
        await offlineService.initialize();
      } catch (error) {
        console.error('Error initializing services:', error);
      }
    };

    initializeServices();

    // Cleanup function
    return () => {
      notificationService.cleanup();
      offlineService.cleanup();
    };
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <GroupProvider>
              <StatusBar 
                style="auto" 
                backgroundColor="transparent" 
                translucent={false} 
              />
              <AppNavigator />
            </GroupProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
