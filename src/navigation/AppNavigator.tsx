import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { RootStackParamList } from './types';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useAuthContext } from '../context/AuthContext';
import { useGroupContext } from '../context/GroupContext';
import { useTheme } from '../context/ThemeContext';

const Stack = createStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const { colors } = useTheme();
  const { user, isLoading: authLoading } = useAuthContext();
  const { group, isLoading: groupLoading } = useGroupContext();

  // 🔍 DEBUG LOGS
  console.log('🔍 AppNavigator DEBUG:');
  console.log('  - user:', user ? { id: user.id, name: user.name, hasProfile: !!user.profile } : null);
  console.log('  - group:', group ? { id: group.id, name: group.name } : null);
  console.log('  - authLoading:', authLoading);
  console.log('  - groupLoading:', groupLoading);
  console.log('  - Decision:', user && user.profile && group ? 'MAIN APP' : 'AUTH FLOW');

  // Afficher le loading pendant l'initialisation
  if (authLoading || groupLoading) {
    return <LoadingSpinner text="Chargement des données..." fullScreen />;
  }

  return (
    <NavigationContainer
      theme={{
        dark: false,
        colors: {
          primary: colors.primary,
          background: colors.background,
          card: colors.surface,
          text: colors.text,
          border: colors.border,
          notification: colors.danger,
        },
        fonts: {
          regular: {
            fontFamily: 'System',
            fontWeight: '400',
          },
          medium: {
            fontFamily: 'System',
            fontWeight: '500',
          },
          bold: {
            fontFamily: 'System',
            fontWeight: '700',
          },
          heavy: {
            fontFamily: 'System',
            fontWeight: '800',
          },
        },
      }}
    >
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: colors.background }
        }}
      >
        {user && user.profile && group ? (
          // Utilisateur authentifié avec profil complet et groupe → Application principale
          <Stack.Screen name="Main" component={MainNavigator} />
        ) : (
          // Pas d'utilisateur OU profil incomplet OU pas de groupe → Écrans d'authentification
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}