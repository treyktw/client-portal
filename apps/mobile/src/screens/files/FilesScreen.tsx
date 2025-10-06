// mobile/src/screens/files/FilesScreen.tsx
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
import { useQuery } from 'convex/react';
import { api } from '@convex-generated/api';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/providers/ThemeProviders';
import { useWorkspaceStore } from '@/store/workspaceStore';

export function FilesScreen() {
  const { colors, theme } = useTheme();
  const { selectedWorkspaceId } = useWorkspaceStore();

  const files = useQuery(
    api.files.getWorkspaceFiles,
    selectedWorkspaceId ? { workspaceId: selectedWorkspaceId as any } : 'skip'
  );

  const folders = useQuery(
    api.folders.getFolders,
    selectedWorkspaceId ? { workspaceId: selectedWorkspaceId as any } : 'skip'
  );

  const getFileIcon = useCallback((mimeType: string) => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.includes('pdf')) return 'document';
    if (mimeType.includes('video')) return 'videocam';
    return 'document-text';
  }, []);

  const styles = useMemo(() =>
    StyleSheet.create({
      container: {
        flex: 1,
        backgroundColor: colors.background,
      },
      content: {
        padding: theme.spacing.md,
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
      grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -theme.spacing.xs,
      },
      folderCard: {
        width: '50%',
        padding: theme.spacing.xs,
      },
      folderButton: {
        backgroundColor: colors.card,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
      },
      folderIcon: {
        marginBottom: theme.spacing.sm,
      },
      folderName: {
        fontSize: 14,
        fontFamily: theme.fonts.regular,
        color: colors.foreground,
        textAlign: 'center',
      },
      fileCard: {
        backgroundColor: colors.card,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
      },
      fileIcon: {
        width: 40,
        height: 40,
        borderRadius: theme.borderRadius.sm,
        backgroundColor: colors.muted,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.md,
      },
      fileImage: {
        width: 40,
        height: 40,
        borderRadius: theme.borderRadius.sm,
      },
      fileInfo: {
        flex: 1,
      },
      fileName: {
        fontSize: 14,
        fontFamily: theme.fonts.medium,
        color: colors.foreground,
        marginBottom: theme.spacing.xs,
      },
      fileMeta: {
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

  const renderFile = useCallback(({ item }: { item: any }) => (
    <TouchableOpacity style={styles.fileCard}>
      <View style={styles.fileIcon}>
        {item.mimeType?.startsWith('image/') && item.url ? (
          <Image source={{ uri: item.url }} style={styles.fileImage} />
        ) : (
          <Ionicons
            name={getFileIcon(item.mimeType) as any}
            size={24}
            color={colors.mutedForeground}
          />
        )}
      </View>
      <View style={styles.fileInfo}>
        <Text style={styles.fileName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.fileMeta}>
          {(item.size / 1024).toFixed(1)} KB • {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  ), [styles, colors, getFileIcon]);

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            {folders && folders.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Folders</Text>
                <View style={styles.grid}>
                  {folders.map((folder) => (
                    <View key={folder._id} style={styles.folderCard}>
                      <TouchableOpacity style={styles.folderButton}>
                        <Ionicons
                          name="folder"
                          size={32}
                          color={colors.primary}
                          style={styles.folderIcon}
                        />
                        <Text style={styles.folderName}>{folder.name}</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            )}
            {files && files.length > 0 && (
              <Text style={styles.sectionTitle}>Recent Files</Text>
            )}
          </>
        }
        data={files}
        renderItem={renderFile}
        keyExtractor={(item) => item._id}
        ListEmptyComponent={
          !folders?.length ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                No files uploaded yet
              </Text>
            </View>
          ) : null
        }
      />

      <TouchableOpacity style={styles.fab}>
        <Ionicons name="cloud-upload" size={28} color={colors.primaryForeground} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}