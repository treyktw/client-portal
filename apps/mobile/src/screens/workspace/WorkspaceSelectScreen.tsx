// mobile/src/screens/workspace/WorkspaceSelectScreen.tsx
import { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from 'convex/react';
import { api } from '@convex-generated/api';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/providers/ThemeProviders';
import { useWorkspaceStore } from '@/store/workspaceStore';
import type { RootStackScreenProps } from '@/navigation/types';

export function WorkspaceSelectScreen({ navigation }: RootStackScreenProps<'WorkspaceSelect'>) {
  const { colors, theme } = useTheme();
  const workspaces = useQuery(api.workspaces.getMyWorkspaces);
  const { setSelectedWorkspace } = useWorkspaceStore();

  type WorkspaceListItem = {
    _id: string;
    name: string;
    onboardingCompleted?: boolean;
  };

  const handleSelectWorkspace = useCallback((workspaceId: string, workspaceName: string) => {
    setSelectedWorkspace(workspaceId, workspaceName);
    navigation.replace('Main');
  }, [setSelectedWorkspace, navigation]);

  const styles = useMemo(() =>
    StyleSheet.create({
      container: {
        flex: 1,
        backgroundColor: colors.background,
      },
      header: {
        padding: theme.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      },
      title: {
        fontSize: 28,
        fontFamily: theme.fonts.bold,
        color: colors.foreground,
        marginBottom: theme.spacing.xs,
      },
      subtitle: {
        fontSize: 14,
        fontFamily: theme.fonts.regular,
        color: colors.mutedForeground,
      },
      list: {
        padding: theme.spacing.md,
      },
      workspaceCard: {
        backgroundColor: colors.card,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: colors.border,
      },
      workspaceInfo: {
        flex: 1,
      },
      workspaceName: {
        fontSize: 16,
        fontFamily: theme.fonts.medium,
        color: colors.foreground,
        marginBottom: theme.spacing.xs,
      },
      workspaceStatus: {
        fontSize: 12,
        fontFamily: theme.fonts.regular,
        color: colors.mutedForeground,
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
      },
      loader: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
      },
    }),
    [colors, theme]
  );

  const renderWorkspaceItem = useCallback(({ item }: { item: WorkspaceListItem }) => (
    <TouchableOpacity
      style={styles.workspaceCard}
      onPress={() => handleSelectWorkspace(item._id, item.name)}
    >
      <View style={styles.workspaceInfo}>
        <Text style={styles.workspaceName}>{item.name}</Text>
        <Text style={styles.workspaceStatus}>
          {item.onboardingCompleted ? 'Active' : 'Setup Required'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
    </TouchableOpacity>
  ), [handleSelectWorkspace, colors, styles]);


  if (!workspaces) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Workspaces</Text>
        <Text style={styles.subtitle}>Select a workspace to continue</Text>
      </View>

      <FlatList
        data={workspaces}
        renderItem={renderWorkspaceItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              No workspaces available. Please contact your administrator.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}