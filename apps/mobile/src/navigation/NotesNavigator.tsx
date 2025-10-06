// mobile/src/navigation/NotesNavigator.tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from '@/providers/ThemeProviders';
import { NotesListScreen } from '@/screens/notes/NoteListScreen';
import { NoteEditorScreen } from '@/screens/notes/NoteEditorScreen';
import type { NotesStackParamList } from './types';

const Stack = createStackNavigator<NotesStackParamList>();

export function NotesNavigator() {
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
        name="NotesList" 
        component={NotesListScreen}
        options={{ title: 'Notes' }}
      />
      <Stack.Screen 
        name="NoteEditor" 
        component={NoteEditorScreen}
        options={{ title: 'Edit Note' }}
      />
    </Stack.Navigator>
  );
}