import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabParamList, MainStackParamList } from './types';
import { DashboardScreen } from '../screens/main/DashboardScreen';
import { AddDrinkScreen } from '../screens/main/AddDrinkScreen';
import { HistoryScreen } from '../screens/main/HistoryScreen';
import { GroupScreen } from '../screens/main/GroupScreen';
import { LineupScreen } from '../screens/main/LineupScreen';
import { LineupManageScreen } from '../screens/main/LineupManageScreen';
import { StatsScreen } from '../screens/main/StatsScreen';
import { SettingsScreen } from '../screens/main/SettingsScreen';
import { MemberProfileScreen } from '../screens/main/MemberProfileScreen';
import { ChatScreen } from '../screens/main/ChatScreen';
import { MappingScreen } from '../screens/main/MappingScreen';
import { MapScreen } from '../screens/main/MapScreen';
import { useTheme } from '../context/ThemeContext';
import { useGroupContext } from '../context/GroupContext';
import { useAuthContext } from '../context/AuthContext';
import { useChat } from '../hooks/useChat';

const Tab = createBottomTabNavigator<BottomTabParamList>();
const Stack = createStackNavigator<MainStackParamList>();

function TabNavigator() {
  const { colors } = useTheme();
  const { group } = useGroupContext();
  const { user } = useAuthContext();
  const insets = useSafeAreaInsets();
  
  // Hook pour obtenir le nombre de messages non lus
  const { unreadCount } = useChat(
    group?.id || null,
    user?.id || null,
    user?.name || null,
    user?.avatar || null
  );

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'History':
              iconName = focused ? 'time' : 'time-outline';
              break;
            case 'Chat':
              iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
              break;
            case 'Lineup':
              iconName = focused ? 'musical-notes' : 'musical-notes-outline';
              break;
            case 'Group':
              iconName = focused ? 'people' : 'people-outline';
              break;
            case 'Stats':
              iconName = focused ? 'analytics' : 'analytics-outline';
              break;
            case 'Map':
              iconName = focused ? 'map' : 'map-outline';
              break;
            case 'Settings':
              iconName = focused ? 'settings' : 'settings-outline';
              break;
            default:
              iconName = 'ellipse';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textLight,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, 8),
          height: 65 + Math.max(insets.bottom, 8),
          paddingTop: 8
        },
        headerStyle: {
          backgroundColor: colors.background,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Accueil',
          tabBarLabel: 'Accueil'
        }}
      />
      
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          title: 'Historique',
          tabBarLabel: 'Historique'
        }}
      />
      
      {group && (
        <Tab.Screen
          name="Chat"
          component={ChatScreen}
          options={{
            title: 'Chat',
            tabBarLabel: 'Chat',
            tabBarBadge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount.toString()) : undefined
          }}
        />
      )}

      {group && (
        <Tab.Screen
          name="Lineup"
          component={LineupScreen}
          options={{
            title: 'Line-up',
            tabBarLabel: 'Line-up'
          }}
        />
      )}
      
      {group && (
        <Tab.Screen
          name="Group"
          component={GroupScreen}
          options={{
            title: 'Groupe',
            tabBarLabel: 'Groupe'
          }}
        />
      )}
      
      <Tab.Screen
        name="Stats"
        component={StatsScreen}
        options={{
          title: 'Statistiques',
          tabBarLabel: 'Stats'
        }}
      />
      
      {group && (
        <Tab.Screen
          name="Map"
          component={MapScreen}
          options={{
            title: 'Carte',
            tabBarLabel: 'Carte'
          }}
        />
      )}
      
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Paramètres',
          tabBarLabel: 'Paramètres'
        }}
      />
    </Tab.Navigator>
  );
}

export function MainNavigator() {
  const { colors } = useTheme();

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
        headerBackTitle: '',
      }}
    >
      <Stack.Screen
        name="Tabs"
        component={TabNavigator}
        options={{ headerShown: false }}
      />
      
      <Stack.Screen
        name="AddDrink"
        component={AddDrinkScreen}
        options={{
          presentation: 'modal',
          headerShown: false
        }}
      />
      
      
      <Stack.Screen
        name="MemberProfile"
        component={MemberProfileScreen}
        options={{
          title: 'Profil du membre',
          headerBackTitle: 'Retour'
        }}
      />
      
      <Stack.Screen
        name="LineupManage"
        component={LineupManageScreen}
        options={{
          title: 'Gérer la programmation',
          headerShown: false
        }}
      />
      
      <Stack.Screen
        name="Mapping"
        component={MappingScreen}
        options={{
          title: 'Cartographie du Festival',
          headerShown: false
        }}
      />
    </Stack.Navigator>
  );
}