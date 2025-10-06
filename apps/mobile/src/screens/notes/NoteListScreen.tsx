// apps/mobile/src/screens/notes/NotesListScreen.tsx
import React, { useMemo, useCallback, useReducer } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { useQuery, useMutation } from 'convex/react';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@telera/convex/_generated/api';
import { useTheme } from '@/providers/ThemeProviders';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { NotesStackParamList } from '@/navigation/types';
import { Id } from '@telera/convex/_generated/dataModel';

type NavigationProp = StackNavigationProp<NotesStackParamList, 'NotesList'>;

interface NotesListState {
  searchQuery: string;
  refreshing: boolean;
  selectedNoteId: string | null;
}

type NotesListAction =
  | { type: 'SET_SEARCH'; query: string }
  | { type: 'SET_REFRESHING'; value: boolean }
  | { type: 'SET_SELECTED'; noteId: string | null };

const notesListReducer = (state: NotesListState, action: NotesListAction): NotesListState => {
  switch (action.type) {
    case 'SET_SEARCH':
      return { ...state, searchQuery: action.query };
    case 'SET_REFRESHING':
      return { ...state, refreshing: action.value };
    case 'SET_SELECTED':
      return { ...state, selectedNoteId: action.noteId };
    default:
      return state;
  }
};

export function NotesListScreen({ navigation }: { navigation: NavigationProp }) {
  const { colors, theme } = useTheme();
  const { selectedWorkspaceId } = useWorkspaceStore();
  
  const [state, dispatch] = useReducer(notesListReducer, {
    searchQuery: '',
    refreshing: false,
    selectedNoteId: null,
  });

  const notes = useQuery(
    api.notes.getNotes,
    selectedWorkspaceId ? { workspaceId: selectedWorkspaceId as any } : 'skip'
  );

  const deleteNote = useMutation(api.notes.deleteNote);

  const filteredNotes = useMemo(() => {
    if (!notes) return [];
    if (!state.searchQuery) return notes;
    
    return notes.filter((note: any) =>
      note.title.toLowerCase().includes(state.searchQuery.toLowerCase())
    );
  }, [notes, state.searchQuery]);

  const handleCreateNote = useCallback(() => {
    navigation.navigate('NoteEditor', {});
  }, [navigation]);

  const handleEditNote = useCallback((noteId: string) => {
    navigation.navigate('NoteEditor', { noteId });
  }, [navigation]);

  const handleDeleteNote = useCallback((noteId: string, noteTitle: string) => {
    Alert.alert(
      'Delete Note',
      `Are you sure you want to delete "${noteTitle}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteNote({ noteId: noteId as Id<"notes"> });
          },
        },
      ]
    );
  }, [deleteNote]);

  const onRefresh = useCallback(() => {
    dispatch({ type: 'SET_REFRESHING', value: true });
    setTimeout(() => {
      dispatch({ type: 'SET_REFRESHING', value: false });
    }, 1500);
  }, []);

  const styles = useMemo(() =>
    StyleSheet.create({
      container: {
        flex: 1,
        backgroundColor: colors.background,
      },
      searchBar: {
        backgroundColor: colors.card,
        padding: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      },
      searchInput: {
        backgroundColor: colors.input,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.sm,
        fontSize: 16,
        fontFamily: theme.fonts.regular,
        color: colors.foreground,
      },
      list: {
        flex: 1,
      },
      noteCard: {
        backgroundColor: colors.card,
        marginHorizontal: theme.spacing.md,
        marginVertical: theme.spacing.sm,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
      },
      noteHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: theme.spacing.sm,
      },
      noteTitle: {
        flex: 1,
        fontSize: 18,
        fontFamily: theme.fonts.medium,
        color: colors.foreground,
        marginRight: theme.spacing.sm,
      },
      noteActions: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
      },
      noteContent: {
        fontSize: 14,
        fontFamily: theme.fonts.regular,
        color: colors.mutedForeground,
        lineHeight: 20,
      },
      noteMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: theme.spacing.sm,
        gap: theme.spacing.md,
      },
      metaText: {
        fontSize: 12,
        fontFamily: theme.fonts.regular,
        color: colors.mutedForeground,
      },
      pinnedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
      },
      emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.xl,
      },
      emptyText: {
        fontSize: 16,
        fontFamily: theme.fonts.regular,
        color: colors.mutedForeground,
        textAlign: 'center',
        marginTop: theme.spacing.md,
      },
      fab: {
        position: 'absolute',
        right: theme.spacing.lg,
        bottom: theme.spacing.lg,
        backgroundColor: colors.primary,
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
    }),
    [colors, theme]
  );

  const renderNote = useCallback(({ item }: { item: any }) => {
    const preview = item.content
      ? JSON.parse(item.content)?.[0]?.content?.[0]?.text || ''
      : '';

    return (
      <TouchableOpacity
        style={styles.noteCard}
        onPress={() => handleEditNote(item._id)}
        onLongPress={() => handleDeleteNote(item._id, item.title)}
      >
        <View style={styles.noteHeader}>
          <Text style={styles.noteTitle} numberOfLines={1}>
            {item.emoji ? `${item.emoji} ` : ''}{item.title}
          </Text>
          {item.isPinned && (
            <View style={styles.pinnedBadge}>
              <Ionicons name="pin" size={16} color={colors.primary} />
            </View>
          )}
        </View>
        
        {preview && (
          <Text style={styles.noteContent} numberOfLines={2}>
            {preview}
          </Text>
        )}
        
        <View style={styles.noteMeta}>
          <Text style={styles.metaText}>
            {new Date(item.updatedAt).toLocaleDateString()}
          </Text>
          {item.isArchived && (
            <Text style={styles.metaText}>Archived</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  }, [styles, colors, handleEditNote, handleDeleteNote]);

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        style={styles.list}
        data={filteredNotes}
        renderItem={renderNote}
        keyExtractor={(item) => item._id}
        refreshControl={
          <RefreshControl
            refreshing={state.refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={48} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>
              No notes yet. Tap the + button to create your first note.
            </Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={handleCreateNote}>
        <Ionicons name="add" size={28} color={colors.primaryForeground} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}