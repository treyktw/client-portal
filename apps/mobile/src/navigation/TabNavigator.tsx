// mobile/src/navigation/TabNavigator.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/providers/ThemeProviders';
import type { MainTabParamList } from './types';
import { HomeScreen } from '@/screens/HomeScreen';
import { NotesNavigator } from './NotesNavigator';
import { TasksScreen } from '@/screens/tasks/TaskScreen';
import { MessagesNavigator } from './MessagesNavigator';
import { FilesScreen } from '@/screens/files/FilesScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

export function TabNavigator() {
  const { colors, theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Notes':
              iconName = focused ? 'document-text' : 'document-text-outline';
              break;
            case 'Tasks':
              iconName = focused ? 'checkbox' : 'checkbox-outline';
              break;
            case 'Messages':
              iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
              break;
            case 'Files':
              iconName = focused ? 'folder' : 'folder-outline';
              break;
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        },
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.foreground,
        headerShadowVisible: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen 
        name="Notes" 
        component={NotesNavigator}
        options={{ headerShown: false }}
      />
      <Tab.Screen name="Tasks" component={TasksScreen} />
      <Tab.Screen 
        name="Messages" 
        component={MessagesNavigator}
        options={{ headerShown: false }}
      />
      <Tab.Screen name="Files" component={FilesScreen} />
    </Tab.Navigator>
  );
}