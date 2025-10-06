// mobile/src/navigation/MessagesNavigator.tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from '@/providers/ThemeProviders';
import { ThreadsListScreen } from '@/screens/messages/ThreadsListScreen';
import { ChatScreen } from '@/screens/messages/ChatScreen';
import type { MessagesStackParamList } from './types';

const Stack = createStackNavigator<MessagesStackParamList>();

export function MessagesNavigator() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.foreground,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen 
        name="ThreadsList" 
        component={ThreadsListScreen}
        options={{ title: 'Messages' }}
      />
      <Stack.Screen 
        name="Chat" 
        component={ChatScreen}
        options={{ title: 'Chat' }}
      />
    </Stack.Navigator>
  );
}