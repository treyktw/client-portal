// mobile/src/screens/HomeScreen.tsx
import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from 'convex/react';
import { api } from '@telera/convex/_generated/api';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/providers/ThemeProviders';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useUser } from '@clerk/clerk-expo';
import type { MainTabScreenProps } from '@/navigation/types';

export function HomeScreen({ navigation }: MainTabScreenProps<'Home'>) {
  const { colors, theme } = useTheme();
  const { selectedWorkspaceId, selectedWorkspaceName } = useWorkspaceStore();
  const { user } = useUser();
  const [refreshing, setRefreshing] = React.useState(false);

  const workspace = useQuery(
    api.workspaces.getWorkspaceById, 
    selectedWorkspaceId ? { workspaceId: selectedWorkspaceId as any } : 'skip'
  );
  
  const recentNotes = useQuery(
    api.notes.getNotes,
    selectedWorkspaceId ? { workspaceId: selectedWorkspaceId as any } : 'skip'
  );

  const tasks = useQuery(
    api.tasks.getTasks,
    selectedWorkspaceId ? { workspaceId: selectedWorkspaceId as any } : 'skip'
  );

  const currentUser = useQuery(api.users.getCurrentUser);

  // Check if user is admin from Clerk metadata or Convex data
  const isAdmin = useMemo(() => {
    const clerkRole = user?.publicMetadata?.role;
    const convexRole = currentUser?.role;
    return clerkRole === 'admin' || convexRole === 'admin';
  }, [user?.publicMetadata?.role, currentUser?.role]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 2000);
  }, []);

  const quickActions = useMemo(() => [
    { icon: 'document-text', label: 'New Note', action: () => navigation.navigate('Notes') },
    { icon: 'checkbox', label: 'Add Task', action: () => navigation.navigate('Tasks') },
    { icon: 'chatbubbles', label: 'Messages', action: () => navigation.navigate('Messages') },
    { icon: 'folder', label: 'Files', action: () => navigation.navigate('Files') },
  ], [navigation]);

  const styles = useMemo(() =>
    StyleSheet.create({
      container: {
        flex: 1,
        backgroundColor: colors.background,
      },
      scrollContent: {
        padding: theme.spacing.md,
      },
      header: {
        marginBottom: theme.spacing.lg,
      },
      workspaceName: {
        fontSize: 24,
        fontFamily: theme.fonts.bold,
        color: colors.foreground,
        marginBottom: theme.spacing.xs,
      },
      welcomeText: {
        fontSize: 14,
        fontFamily: theme.fonts.regular,
        color: colors.mutedForeground,
      },
      section: {
        marginBottom: theme.spacing.xl,
      },
      sectionTitle: {
        fontSize: 18,
        fontFamily: theme.fonts.medium,
        color: colors.foreground,
        marginBottom: theme.spacing.md,
      },
      quickActionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -theme.spacing.xs,
      },
      quickActionCard: {
        width: '50%',
        padding: theme.spacing.xs,
      },
      quickActionButton: {
        backgroundColor: colors.card,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
      },
      quickActionIcon: {
        marginBottom: theme.spacing.sm,
      },
      quickActionLabel: {
        fontSize: 14,
        fontFamily: theme.fonts.regular,
        color: colors.foreground,
      },
      statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
      },
      statCard: {
        flex: 1,
        backgroundColor: colors.card,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginHorizontal: theme.spacing.xs,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
      },
      statNumber: {
        fontSize: 24,
        fontFamily: theme.fonts.bold,
        color: colors.primary,
        marginBottom: theme.spacing.xs,
      },
      statLabel: {
        fontSize: 12,
        fontFamily: theme.fonts.regular,
        color: colors.mutedForeground,
      },
      recentItem: {
        backgroundColor: colors.card,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
      },
      recentItemTitle: {
        fontSize: 16,
        fontFamily: theme.fonts.medium,
        color: colors.foreground,
        marginBottom: theme.spacing.xs,
      },
      recentItemMeta: {
        fontSize: 12,
        fontFamily: theme.fonts.regular,
        color: colors.mutedForeground,
      },
      adminButton: {
        position: 'absolute',
        top: theme.spacing.lg,
        right: theme.spacing.lg,
        backgroundColor: colors.primary,
        borderRadius: theme.borderRadius.md,
        width: 48,
        height: 48,
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

  const taskStats = useMemo(() => {
    if (!tasks) return { todo: 0, inProgress: 0, done: 0 };
    return {
      todo: tasks.todo?.length || 0,
      inProgress: tasks.in_progress?.length || 0,
      done: tasks.done?.length || 0,
    };
  }, [tasks]);

  return (
    <SafeAreaView style={styles.container}>
      {isAdmin && (
        <TouchableOpacity
          style={styles.adminButton}
          onPress={() => navigation.navigate('Admin' as any)}
        >
          <Ionicons name="arrow-back" size={24} color={colors.primaryForeground} />
        </TouchableOpacity>
      )}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.workspaceName}>
            {selectedWorkspaceName || 'Workspace'}
          </Text>
          <Text style={styles.welcomeText}>
            Welcome back! Here's your overview.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            {quickActions.map((action) => (
              <View key={action.label} style={styles.quickActionCard}>
                <TouchableOpacity
                  style={styles.quickActionButton}
                  onPress={action.action}
                >
                  <Ionicons
                    name={action.icon as any}
                    size={28}
                    color={colors.primary}
                    style={styles.quickActionIcon}
                  />
                  <Text style={styles.quickActionLabel}>{action.label}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Task Overview</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{taskStats.todo}</Text>
              <Text style={styles.statLabel}>To Do</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{taskStats.inProgress}</Text>
              <Text style={styles.statLabel}>In Progress</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{taskStats.done}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
          </View>
        </View>

        {recentNotes && recentNotes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Notes</Text>
            {recentNotes.slice(0, 3).map((note) => (
              <TouchableOpacity
                key={note._id}
                style={styles.recentItem}
                onPress={() => navigation.navigate('Notes')}
              >
                <Text style={styles.recentItemTitle}>{note.title}</Text>
                <Text style={styles.recentItemMeta}>
                  Updated {new Date(note.updatedAt).toLocaleDateString()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}