// mobile/src/screens/onboarding/OnboardingGoalsScreen.tsx
import React, { useMemo, useReducer } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from 'convex/react';
import { useTheme } from '@/providers/ThemeProviders';
import { useNotifications } from '@/providers/NotificationProvider';
import { OnboardingStackParamList } from '@/navigation/OnboardingNavigator';
import { api } from '@convex-generated/api';

type Props = StackScreenProps<OnboardingStackParamList, 'Goals'>;

interface GoalsState {
  selectedServices: string[];
  selectedGoals: string[];
  specialNotes: string;
  isSubmitting: boolean;
}

type GoalsAction =
  | { type: 'TOGGLE_SERVICE'; service: string }
  | { type: 'TOGGLE_GOAL'; goal: string }
  | { type: 'SET_NOTES'; notes: string }
  | { type: 'SET_SUBMITTING'; value: boolean };

const goalsReducer = (state: GoalsState, action: GoalsAction): GoalsState => {
  switch (action.type) {
    case 'TOGGLE_SERVICE':
      return {
        ...state,
        selectedServices: state.selectedServices.includes(action.service)
          ? state.selectedServices.filter((s) => s !== action.service)
          : [...state.selectedServices, action.service],
      };
    case 'TOGGLE_GOAL':
      return {
        ...state,
        selectedGoals: state.selectedGoals.includes(action.goal)
          ? state.selectedGoals.filter((g) => g !== action.goal)
          : [...state.selectedGoals, action.goal],
      };
    case 'SET_NOTES':
      return { ...state, specialNotes: action.notes };
    case 'SET_SUBMITTING':
      return { ...state, isSubmitting: action.value };
    default:
      return state;
  }
};

export function OnboardingGoalsScreen({ navigation, route }: Props) {
  const { colors, theme } = useTheme();
  const { showToast } = useNotifications();
  const { workspaceId } = route.params;
  
  const updateWorkspace = useMutation(api.workspaces.updateOnboardingStep as any);

  const [state, dispatch] = useReducer(goalsReducer, {
    selectedServices: [],
    selectedGoals: [],
    specialNotes: '',
    isSubmitting: false,
  });

  const services = [
    'Website Design',
    'SEO Optimization',
    'Social Media',
    'Content Creation',
    'Email Marketing',
    'Branding',
    'Analytics',
    'E-commerce',
  ];

  const goals = [
    'Increase online presence',
    'Generate more leads',
    'Improve brand awareness',
    'Boost sales',
    'Better customer engagement',
    'Streamline operations',
  ];

  const handleSubmit = async () => {
    if (state.selectedServices.length === 0 || state.selectedGoals.length === 0) {
      showToast('error', 'Required selections', 'Please select at least one service and goal');
      return;
    }

    dispatch({ type: 'SET_SUBMITTING', value: true });

    try {
      await updateWorkspace({
        workspaceId,
        step: 3,
        fieldToUpdate: 'goals',
        data: {
          services: state.selectedServices,
          mainGoals: state.selectedGoals,
          specialNotes: state.specialNotes,
        },
      });

      navigation.navigate('Complete', { workspaceId });
    } catch (error) {
      showToast('error', 'Error', 'Failed to save goals');
    } finally {
      dispatch({ type: 'SET_SUBMITTING', value: false });
    }
  };

  const styles = useMemo(() =>
    StyleSheet.create({
      container: {
        flex: 1,
        backgroundColor: colors.background,
      },
      content: {
        padding: theme.spacing.lg,
      },
      header: {
        marginBottom: theme.spacing.xl,
      },
      title: {
        fontSize: 24,
        fontFamily: theme.fonts.bold,
        color: colors.foreground,
        marginBottom: theme.spacing.sm,
      },
      subtitle: {
        fontSize: 14,
        fontFamily: theme.fonts.regular,
        color: colors.mutedForeground,
      },
      section: {
        marginBottom: theme.spacing.xl,
      },
      sectionTitle: {
        fontSize: 16,
        fontFamily: theme.fonts.medium,
        color: colors.foreground,
        marginBottom: theme.spacing.md,
      },
      optionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -theme.spacing.xs,
      },
      option: {
        width: '50%',
        padding: theme.spacing.xs,
      },
      optionButton: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
      },
      optionSelected: {
        backgroundColor: colors.primary + '20',
        borderColor: colors.primary,
      },
      optionText: {
        flex: 1,
        fontSize: 14,
        fontFamily: theme.fonts.regular,
        color: colors.foreground,
        marginLeft: theme.spacing.sm,
      },
      textarea: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        fontSize: 16,
        fontFamily: theme.fonts.regular,
        color: colors.foreground,
        backgroundColor: colors.input,
        height: 100,
        textAlignVertical: 'top',
      },
      buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
      },
      button: {
        flex: 1,
        backgroundColor: colors.primary,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        alignItems: 'center',
        marginHorizontal: theme.spacing.xs,
      },
      buttonSecondary: {
        backgroundColor: colors.secondary,
      },
      buttonText: {
        fontSize: 16,
        fontFamily: theme.fonts.medium,
        color: colors.primaryForeground,
      },
      buttonDisabled: {
        opacity: 0.6,
      },
    }),
    [colors, theme]
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Your Goals</Text>
          <Text style={styles.subtitle}>
            What would you like to achieve with your workspace?
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Services Needed</Text>
          <View style={styles.optionsGrid}>
            {services.map((service) => (
              <View key={service} style={styles.option}>
                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    state.selectedServices.includes(service) && styles.optionSelected,
                  ]}
                  onPress={() => dispatch({ type: 'TOGGLE_SERVICE', service })}
                >
                  <Ionicons
                    name={
                      state.selectedServices.includes(service)
                        ? 'checkbox'
                        : 'square-outline'
                    }
                    size={20}
                    color={
                      state.selectedServices.includes(service)
                        ? colors.primary
                        : colors.mutedForeground
                    }
                  />
                  <Text style={styles.optionText}>{service}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Main Goals</Text>
          <View style={styles.optionsGrid}>
            {goals.map((goal) => (
              <View key={goal} style={styles.option}>
                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    state.selectedGoals.includes(goal) && styles.optionSelected,
                  ]}
                  onPress={() => dispatch({ type: 'TOGGLE_GOAL', goal })}
                >
                  <Ionicons
                    name={
                      state.selectedGoals.includes(goal) ? 'checkbox' : 'square-outline'
                    }
                    size={20}
                    color={
                      state.selectedGoals.includes(goal)
                        ? colors.primary
                        : colors.mutedForeground
                    }
                  />
                  <Text style={styles.optionText}>{goal}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Special Notes (Optional)</Text>
          <TextInput
            style={styles.textarea}
            value={state.specialNotes}
            onChangeText={(notes) => dispatch({ type: 'SET_NOTES', notes })}
            placeholder="Any specific requirements or notes..."
            placeholderTextColor={colors.mutedForeground}
            multiline
          />
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={() => navigation.navigate('Business', { workspaceId })}
          >
            <Text style={styles.buttonText}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, state.isSubmitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={state.isSubmitting}
          >
            {state.isSubmitting ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={styles.buttonText}>Complete Setup</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}