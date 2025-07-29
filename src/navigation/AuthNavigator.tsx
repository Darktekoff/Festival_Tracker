import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthStackParamList } from './types';
import { WelcomeScreen } from '../screens/auth/WelcomeScreen';
import { GroupSelectionScreen } from '../screens/auth/GroupSelectionScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { CreateGroupScreen } from '../screens/auth/CreateGroupScreen';
import { JoinGroupScreen } from '../screens/auth/JoinGroupScreen';
import { ProfileSetupScreen } from '../screens/auth/ProfileSetupScreen';
import { useTheme } from '../context/ThemeContext';
import { useAuthContext } from '../context/AuthContext';

const Stack = createStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  const { colors } = useTheme();
  const { user } = useAuthContext();

  // 🔍 DEBUG LOGS
  console.log('🔍 AuthNavigator DEBUG:');
  console.log('  - user:', user ? { id: user.id, name: user.name, hasProfile: !!user.profile } : null);
  console.log('  - Decision:', user && !user.profile ? 'PROFILE_SETUP' : 'WELCOME');

  // Si l'utilisateur est connecté mais n'a pas de profil, montrer directement ProfileSetup
  if (user && !user.profile) {
    return (
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.background,
            elevation: 0,
            shadowOpacity: 0,
          },
          headerTintColor: colors.text,
          headerTitleStyle: {
            fontWeight: '600',
          },
          headerBackTitleVisible: false,
        }}
        initialRouteName="ProfileSetup"
      >
        <Stack.Screen
          name="ProfileSetup"
          component={ProfileSetupScreen}
          options={{
            title: 'Créer votre profil',
            headerShown: false
          }}
        />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerBackTitleVisible: false,
      }}
      initialRouteName="Welcome"
    >
      <Stack.Screen
        name="ProfileSetup"
        component={ProfileSetupScreen}
        options={{
          title: 'Créer votre profil',
          headerShown: false
        }}
      />
      
      <Stack.Screen
        name="Welcome"
        options={{ headerShown: false }}
      >
        {({ navigation }) => 
          user ? (
            <GroupSelectionScreen
              navigation={navigation}
              onCreateGroup={() => navigation.navigate('CreateGroup')}
              onJoinGroup={() => navigation.navigate('JoinGroup')}
            />
          ) : (
            <WelcomeScreen
              onGetStarted={() => navigation.navigate('Register')}
              onSignIn={() => navigation.navigate('Login')}
            />
          )
        }
      </Stack.Screen>
      
      <Stack.Screen
        name="Login"
        options={{ headerShown: false }}
      >
        {({ navigation }) => (
          <LoginScreen
            navigation={navigation}
            onRegister={() => navigation.navigate('Register')}
            onForgotPassword={() => navigation.navigate('ForgotPassword')}
          />
        )}
      </Stack.Screen>
      
      <Stack.Screen
        name="Register"
        options={{ headerShown: false }}
      >
        {({ navigation }) => (
          <RegisterScreen
            navigation={navigation}
            onLogin={() => navigation.navigate('Login')}
          />
        )}
      </Stack.Screen>
      
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{ headerShown: false }}
      />
      
      <Stack.Screen
        name="CreateGroup"
        component={CreateGroupScreen}
        options={{
          title: 'Créer un groupe',
          headerBackTitle: 'Retour'
        }}
      />
      
      <Stack.Screen
        name="JoinGroup"
        component={JoinGroupScreen}
        options={{
          title: 'Rejoindre un groupe',
          headerBackTitle: 'Retour'
        }}
      />
      
    </Stack.Navigator>
  );
}