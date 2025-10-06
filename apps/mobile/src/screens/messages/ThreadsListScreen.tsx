// apps/mobile/src/screens/messages/ThreadsListScreen.tsx
import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { useQuery } from 'convex/react';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@telera/convex/_generated/api';
import { useTheme } from '@/providers/ThemeProviders';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { MessagesStackParamList } from '@/navigation/types';

type NavigationProp = StackNavigationProp<MessagesStackParamList, 'ThreadsList'>;

export function ThreadsListScreen({ navigation }: { navigation: NavigationProp }) {
  const { colors, theme } = useTheme();
  const { selectedWorkspaceId } = useWorkspaceStore();

  const threads = useQuery(
    api.threads.getThreads,
    selectedWorkspaceId ? { workspaceId: selectedWorkspaceId as any } : 'skip'
  );

  const unreadCount = useQuery(
    api.messages.getUnreadCount,
    selectedWorkspaceId ? { workspaceId: selectedWorkspaceId as any } : 'skip'
  );

  const handleThreadPress = useCallback((threadId: string) => {
    navigation.navigate('Chat', { threadId });
  }, [navigation]);

  const styles = useMemo(() =>
    StyleSheet.create({
      container: {
        flex: 1,
        backgroundColor: colors.background,
      },
      threadItem: {
        flexDirection: 'row',
        padding: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.card,
      },
      avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.muted,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.md,
      },
      avatarText: {
        fontSize: 18,
        fontFamily: theme.fonts.medium,
        color: colors.foreground,
      },
      threadContent: {
        flex: 1,
        justifyContent: 'center',
      },
      threadHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.xs,
      },
      threadTitle: {
        fontSize: 16,
        fontFamily: theme.fonts.medium,
        color: colors.foreground,
      },
      threadTime: {
        fontSize: 12,
        fontFamily: theme.fonts.regular,
        color: colors.mutedForeground,
      },
      threadPreview: {
        fontSize: 14,
        fontFamily: theme.fonts.regular,
        color: colors.mutedForeground,
        marginBottom: theme.spacing.xs,
      },
      threadMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
      },
      unreadBadge: {
        backgroundColor: colors.primary,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 2,
        borderRadius: 10,
        minWidth: 20,
        alignItems: 'center',
      },
      unreadText: {
        fontSize: 12,
        fontFamily: theme.fonts.medium,
        color: colors.primaryForeground,
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
    }),
    [colors, theme]
  );

  const renderThread = useCallback(({ item }: { item: any }) => {
    const lastMessageTime = item.lastMessageAt
      ? new Date(item.lastMessageAt).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';

    return (
      <TouchableOpacity
        style={styles.threadItem}
        onPress={() => handleThreadPress(item._id)}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.title.charAt(0).toUpperCase()}
          </Text>
        </View>
        
        <View style={styles.threadContent}>
          <View style={styles.threadHeader}>
            <Text style={styles.threadTitle}>{item.title}</Text>
            {lastMessageTime && (
              <Text style={styles.threadTime}>{lastMessageTime}</Text>
            )}
          </View>
          
          {item.lastMessagePreview && (
            <Text style={styles.threadPreview} numberOfLines={1}>
              {item.lastMessagePreview}
            </Text>
          )}
          
          <View style={styles.threadMeta}>
            {item.isDefault && (
              <Ionicons name="star" size={14} color={colors.primary} />
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [styles, handleThreadPress, colors]);

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={threads || []}
        renderItem={renderThread}
        keyExtractor={(item) => item._id}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={48} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>No conversations yet</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}