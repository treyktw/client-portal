// mobile/src/screens/onboarding/OnboardingBusinessScreen.tsx
import React, { useMemo, useReducer } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackScreenProps } from '@react-navigation/stack';
import { useMutation } from 'convex/react';
import { useTheme } from '@/providers/ThemeProviders';
import { useNotifications } from '@/providers/NotificationProvider';

import { OnboardingStackParamList } from '@/navigation/OnboardingNavigator';
import { api } from '@convex-generated/api';

type Props = StackScreenProps<OnboardingStackParamList, 'Business'>;

interface BusinessFormState {
  businessName: string;
  contactPerson: string;
  email: string;
  phone: string;
  website: string;
  isSubmitting: boolean;
}

type BusinessFormAction =
  | { type: 'SET_FIELD'; field: keyof BusinessFormState; value: string }
  | { type: 'SET_SUBMITTING'; value: boolean }
  | { type: 'RESET' };

const businessFormReducer = (
  state: BusinessFormState,
  action: BusinessFormAction
): BusinessFormState => {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'SET_SUBMITTING':
      return { ...state, isSubmitting: action.value };
    case 'RESET':
      return {
        businessName: '',
        contactPerson: '',
        email: '',
        phone: '',
        website: '',
        isSubmitting: false,
      };
    default:
      return state;
  }
};

export function OnboardingBusinessScreen({ navigation, route }: Props) {
  const { colors, theme } = useTheme();
  const { showToast } = useNotifications();
  const { workspaceId } = route.params;
  
  const updateWorkspace = useMutation(api.workspaces.updateOnboardingStep as any);

  const [state, dispatch] = useReducer(businessFormReducer, {
    businessName: '',
    contactPerson: '',
    email: '',
    phone: '',
    website: '',
    isSubmitting: false,
  });

  const handleSubmit = async () => {
    if (!state.businessName || !state.contactPerson || !state.email) {
      showToast('error', 'Required fields', 'Please fill in all required fields');
      return;
    }

    dispatch({ type: 'SET_SUBMITTING', value: true });

    try {
      await updateWorkspace({
        workspaceId,
        step: 2,
        fieldToUpdate: 'businessInfo',
        data: {
          businessName: state.businessName,
          contactPerson: state.contactPerson,
          email: state.email,
          phone: state.phone,
          website: state.website,
          socialLinks: [],
        },
      });

      navigation.navigate('Goals', { workspaceId });
    } catch (error) {
      showToast('error', 'Error', 'Failed to save business information');
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
      form: {
        marginBottom: theme.spacing.xl,
      },
      inputGroup: {
        marginBottom: theme.spacing.lg,
      },
      label: {
        fontSize: 14,
        fontFamily: theme.fonts.medium,
        color: colors.foreground,
        marginBottom: theme.spacing.sm,
      },
      required: {
        color: colors.destructive,
      },
      input: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        fontSize: 16,
        fontFamily: theme.fonts.regular,
        color: colors.foreground,
        backgroundColor: colors.input,
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
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>Business Information</Text>
            <Text style={styles.subtitle}>
              Help us understand your business better
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Business Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={state.businessName}
                onChangeText={(value) =>
                  dispatch({ type: 'SET_FIELD', field: 'businessName', value })
                }
                placeholder="Enter your business name"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Contact Person <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={state.contactPerson}
                onChangeText={(value) =>
                  dispatch({ type: 'SET_FIELD', field: 'contactPerson', value })
                }
                placeholder="Primary contact name"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Email <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={state.email}
                onChangeText={(value) =>
                  dispatch({ type: 'SET_FIELD', field: 'email', value })
                }
                placeholder="business@example.com"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone</Text>
              <TextInput
                style={styles.input}
                value={state.phone}
                onChangeText={(value) =>
                  dispatch({ type: 'SET_FIELD', field: 'phone', value })
                }
                placeholder="(555) 123-4567"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Website</Text>
              <TextInput
                style={styles.input}
                value={state.website}
                onChangeText={(value) =>
                  dispatch({ type: 'SET_FIELD', field: 'website', value })
                }
                placeholder="https://www.example.com"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={() => navigation.navigate('Welcome', { workspaceId })}
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
                <Text style={styles.buttonText}>Continue</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}