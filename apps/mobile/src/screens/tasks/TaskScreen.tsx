// mobile/src/screens/tasks/TasksScreen.tsx
import React, { useMemo, useCallback, useReducer } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@convex-generated/api';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/providers/ThemeProviders';
import { useWorkspaceStore } from '@/store/workspaceStore';

type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';

interface TasksState {
  selectedStatus: TaskStatus;
  isCreating: boolean;
}

type TasksAction = 
  | { type: 'SET_STATUS'; payload: TaskStatus }
  | { type: 'TOGGLE_CREATE' };

const tasksReducer = (state: TasksState, action: TasksAction): TasksState => {
  switch (action.type) {
    case 'SET_STATUS':
      return { ...state, selectedStatus: action.payload };
    case 'TOGGLE_CREATE':
      return { ...state, isCreating: !state.isCreating };
    default:
      return state;
  }
};

export function TasksScreen() {
  const { colors, theme } = useTheme();
  const { selectedWorkspaceId } = useWorkspaceStore();
  const [state, dispatch] = useReducer(tasksReducer, {
    selectedStatus: 'todo',
    isCreating: false,
  });

  const tasks = useQuery(
    api.tasks.getTasks,
    selectedWorkspaceId ? { workspaceId: selectedWorkspaceId as any } : 'skip'
  );

  const updateTask = useMutation(api.tasks.updateTask);

  const statuses: TaskStatus[] = ['todo', 'in_progress', 'review', 'done'];
  const statusLabels = {
    todo: 'To Do',
    in_progress: 'In Progress',
    review: 'Review',
    done: 'Done',
  };

  const handleTaskToggle = useCallback(async (taskId: any, currentStatus: TaskStatus) => {
    const newStatus = currentStatus === 'done' ? 'todo' : 'done';
    await updateTask({ taskId, status: newStatus });
  }, [updateTask]);

  const styles = useMemo(() =>
    StyleSheet.create({
      container: {
        flex: 1,
        backgroundColor: colors.background,
      },
      statusTabs: {
        flexDirection: 'row',
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      },
      statusTab: {
        flex: 1,
        paddingVertical: theme.spacing.md,
        alignItems: 'center',
      },
      statusTabActive: {
        borderBottomWidth: 2,
        borderBottomColor: colors.primary,
      },
      statusTabText: {
        fontSize: 14,
        fontFamily: theme.fonts.regular,
        color: colors.mutedForeground,
      },
      statusTabTextActive: {
        color: colors.primary,
        fontFamily: theme.fonts.medium,
      },
      tasksList: {
        padding: theme.spacing.md,
      },
      taskCard: {
        backgroundColor: colors.card,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
      },
      taskCheckbox: {
        marginRight: theme.spacing.md,
      },
      taskContent: {
        flex: 1,
      },
      taskTitle: {
        fontSize: 16,
        fontFamily: theme.fonts.regular,
        color: colors.foreground,
        marginBottom: theme.spacing.xs,
      },
      taskTitleDone: {
        textDecorationLine: 'line-through',
        color: colors.mutedForeground,
      },
      taskMeta: {
        fontSize: 12,
        fontFamily: theme.fonts.regular,
        color: colors.mutedForeground,
      },
      priorityBadge: {
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 2,
        borderRadius: theme.borderRadius.sm,
        marginLeft: theme.spacing.sm,
      },
      priorityHigh: {
        backgroundColor: colors.destructive,
      },
      priorityMedium: {
        backgroundColor: colors.accent,
      },
      priorityLow: {
        backgroundColor: colors.muted,
      },
      priorityText: {
        fontSize: 10,
        fontFamily: theme.fonts.medium,
        color: colors.foreground,
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

  const renderTask = useCallback(({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.taskCard}
      onPress={() => handleTaskToggle(item._id, item.status)}
    >
      <View style={styles.taskCheckbox}>
        <Ionicons
          name={item.status === 'done' ? 'checkbox' : 'square-outline'}
          size={24}
          color={item.status === 'done' ? colors.primary : colors.mutedForeground}
        />
      </View>
      <View style={styles.taskContent}>
        <Text style={[
          styles.taskTitle,
          item.status === 'done' && styles.taskTitleDone
        ]}>
          {item.title}
        </Text>
        {item.description && (
          <Text style={styles.taskMeta}>{item.description}</Text>
        )}
      </View>
      {item.priority && item.priority !== 'low' && (
        <View style={[
          styles.priorityBadge,
          item.priority === 'high' && styles.priorityHigh,
          item.priority === 'medium' && styles.priorityMedium,
        ]}>
          <Text style={styles.priorityText}>
            {item.priority.toUpperCase()}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  ), [styles, colors, handleTaskToggle]);

  const currentTasks = tasks?.[state.selectedStatus] || [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.statusTabs}>
        {statuses.map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.statusTab,
              state.selectedStatus === status && styles.statusTabActive,
            ]}
            onPress={() => dispatch({ type: 'SET_STATUS', payload: status })}
          >
            <Text style={[
              styles.statusTabText,
              state.selectedStatus === status && styles.statusTabTextActive,
            ]}>
              {statusLabels[status]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={currentTasks}
        renderItem={renderTask}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.tasksList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              No tasks in {statusLabels[state.selectedStatus]}
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => dispatch({ type: 'TOGGLE_CREATE' })}
      >
        <Ionicons name="add" size={28} color={colors.primaryForeground} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}