// apps/mobile/src/screens/notes/NoteEditorScreen.tsx
import React, { useReducer, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useQuery, useMutation } from 'convex/react';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@telera/convex/_generated/api';
import { useTheme } from '@/providers/ThemeProviders';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useNotifications } from '@/providers/NotificationProvider';
import { NotesStackParamList } from '@/navigation/types';
import { Id } from '@telera/convex/_generated/dataModel';

type NavigationProp = StackNavigationProp<NotesStackParamList, 'NoteEditor'>;
type RoutePropType = RouteProp<NotesStackParamList, 'NoteEditor'>;

interface NoteEditorState {
  title: string;
  content: string;
  isPinned: boolean;
  isArchived: boolean;
  isSaving: boolean;
  hasChanges: boolean;
}

type NoteEditorAction =
  | { type: 'SET_TITLE'; title: string }
  | { type: 'SET_CONTENT'; content: string }
  | { type: 'TOGGLE_PINNED' }
  | { type: 'TOGGLE_ARCHIVED' }
  | { type: 'SET_SAVING'; value: boolean }
  | { type: 'LOAD_NOTE'; note: any }
  | { type: 'MARK_SAVED' };

const noteEditorReducer = (state: NoteEditorState, action: NoteEditorAction): NoteEditorState => {
  switch (action.type) {
    case 'SET_TITLE':
      return { ...state, title: action.title, hasChanges: true };
    case 'SET_CONTENT':
      return { ...state, content: action.content, hasChanges: true };
    case 'TOGGLE_PINNED':
      return { ...state, isPinned: !state.isPinned, hasChanges: true };
    case 'TOGGLE_ARCHIVED':
      return { ...state, isArchived: !state.isArchived, hasChanges: true };
    case 'SET_SAVING':
      return { ...state, isSaving: action.value };
    case 'LOAD_NOTE':
      return {
        title: action.note.title,
        content: action.note.content || '',
        isPinned: action.note.isPinned || false,
        isArchived: action.note.isArchived || false,
        isSaving: false,
        hasChanges: false,
      };
    case 'MARK_SAVED':
      return { ...state, hasChanges: false };
    default:
      return state;
  }
};

export function NoteEditorScreen({
  navigation,
  route,
}: {
  navigation: NavigationProp;
  route: RoutePropType;
}) {
  const { colors, theme } = useTheme();
  const { selectedWorkspaceId } = useWorkspaceStore();
  const { showToast } = useNotifications();
  const noteId = route.params?.noteId;

  const [state, dispatch] = useReducer(noteEditorReducer, {
    title: '',
    content: '',
    isPinned: false,
    isArchived: false,
    isSaving: false,
    hasChanges: false,
  });

  const createNote = useMutation(api.notes.createNote);
  const updateNote = useMutation(api.notes.updateNote);

  const note = useQuery(
    api.notes.getNotes,
    noteId && selectedWorkspaceId
      ? { workspaceId: selectedWorkspaceId as any }
      : 'skip'
  );

  useEffect(() => {
    if (noteId && note) {
      const foundNote = note.find((n: any) => n._id === noteId);
      if (foundNote) {
        dispatch({ type: 'LOAD_NOTE', note: foundNote });
      }
    }
  }, [noteId, note]);

  const handleSave = useCallback(async () => {
    if (!state.title.trim()) {
      showToast('error', 'Title required', 'Please enter a note title');
      return;
    }

    dispatch({ type: 'SET_SAVING', value: true });

    try {
      if (noteId) {
        await updateNote({
          noteId: noteId as Id<"notes">,
          title: state.title,
          content: state.content,
          isPinned: state.isPinned,
          isArchived: state.isArchived,
        });
      } else {
        await createNote({
          workspaceId: selectedWorkspaceId as any,
          title: state.title,
          content: state.content,
        });
      }

      dispatch({ type: 'MARK_SAVED' });
      showToast('success', 'Saved', 'Note saved successfully');
      
      if (!noteId) {
        navigation.goBack();
      }
    } catch (error) {
      showToast('error', 'Error', 'Failed to save note');
    } finally {
      dispatch({ type: 'SET_SAVING', value: false });
    }
  }, [state, noteId, selectedWorkspaceId, createNote, updateNote, showToast, navigation]);

  const styles = useMemo(() =>
    StyleSheet.create({
      container: {
        flex: 1,
        backgroundColor: colors.background,
      },
      header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.card,
      },
      headerActions: {
        flexDirection: 'row',
        gap: theme.spacing.md,
      },
      saveButton: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        backgroundColor: colors.primary,
        borderRadius: theme.borderRadius.md,
      },
      saveButtonDisabled: {
        opacity: 0.6,
      },
      saveButtonText: {
        color: colors.primaryForeground,
        fontFamily: theme.fonts.medium,
        fontSize: 14,
      },
      content: {
        flex: 1,
      },
      titleInput: {
        fontSize: 24,
        fontFamily: theme.fonts.bold,
        color: colors.foreground,
        padding: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      },
      contentInput: {
        flex: 1,
        fontSize: 16,
        fontFamily: theme.fonts.regular,
        color: colors.foreground,
        padding: theme.spacing.md,
        textAlignVertical: 'top',
      },
      toolbar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        padding: theme.spacing.md,
        backgroundColor: colors.card,
        borderTopWidth: 1,
        borderTopColor: colors.border,
      },
      toolbarButton: {
        padding: theme.spacing.sm,
      },
    }),
    [colors, theme]
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => dispatch({ type: 'TOGGLE_PINNED' })}>
            <Ionicons
              name={state.isPinned ? 'pin' : 'pin-outline'}
              size={24}
              color={state.isPinned ? colors.primary : colors.mutedForeground}
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.saveButton, state.isSaving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={state.isSaving}
          >
            {state.isSaving ? (
              <ActivityIndicator size="small" color={colors.primaryForeground} />
            ) : (
              <Text style={styles.saveButtonText}>
                {state.hasChanges ? 'Save' : 'Saved'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView>
          <TextInput
            style={styles.titleInput}
            value={state.title}
            onChangeText={(text) => dispatch({ type: 'SET_TITLE', title: text })}
            placeholder="Note title..."
            placeholderTextColor={colors.mutedForeground}
          />
          
          <TextInput
            style={styles.contentInput}
            value={state.content}
            onChangeText={(text) => dispatch({ type: 'SET_CONTENT', content: text })}
            placeholder="Start typing..."
            placeholderTextColor={colors.mutedForeground}
            multiline
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}