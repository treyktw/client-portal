// mobile/src/screens/onboarding/OnboardingCompleteScreen.tsx
import React, { useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from 'convex/react';
import { useTheme } from '@/providers/ThemeProviders';
import { useWorkspaceStore } from '@/store/workspaceStore';

import { OnboardingStackParamList } from '@/navigation/OnboardingNavigator';
import { CommonActions } from '@react-navigation/native';
import { api } from '@convex-generated/api';

type Props = StackScreenProps<OnboardingStackParamList, 'Complete'>;

export function OnboardingCompleteScreen({ navigation, route }: Props) {
  const { colors, theme } = useTheme();
  const { workspaceId } = route.params;
  const { setSelectedWorkspace } = useWorkspaceStore();
  
  const updateWorkspace = useMutation(api.workspaces.updateOnboardingStep as any);

  useEffect(() => {
    // Mark onboarding as complete
    updateWorkspace({
      workspaceId,
      step: 7,
      fieldToUpdate: 'complete',
      data: true,
    });
  }, [workspaceId, updateWorkspace]);

  const handleContinue = () => {
    // Set the workspace as selected
    setSelectedWorkspace(workspaceId, 'Your Workspace');
    
    // Reset navigation to Main
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Main' as any }],
      })
    );
  };

  const styles = useMemo(() =>
    StyleSheet.create({
      container: {
        flex: 1,
        backgroundColor: colors.background,
      },
      content: {
        flex: 1,
        padding: theme.spacing.lg,
        justifyContent: 'center',
        alignItems: 'center',
      },
      iconContainer: {
        marginBottom: theme.spacing.xxl,
      },
      icon: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: colors.primary + '20',
        justifyContent: 'center',
        alignItems: 'center',
      },
      title: {
        fontSize: 32,
        fontFamily: theme.fonts.bold,
        color: colors.foreground,
        textAlign: 'center',
        marginBottom: theme.spacing.md,
      },
      subtitle: {
        fontSize: 16,
        fontFamily: theme.fonts.regular,
        color: colors.mutedForeground,
        textAlign: 'center',
        marginBottom: theme.spacing.xxl,
        lineHeight: 24,
        paddingHorizontal: theme.spacing.xl,
      },
      featuresContainer: {
        width: '100%',
        marginBottom: theme.spacing.xxl,
      },
      feature: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
      },
      featureIcon: {
        marginRight: theme.spacing.md,
      },
      featureText: {
        fontSize: 16,
        fontFamily: theme.fonts.regular,
        color: colors.foreground,
      },
      button: {
        backgroundColor: colors.primary,
        borderRadius: theme.borderRadius.md,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.xl,
        alignItems: 'center',
      },
      buttonText: {
        fontSize: 18,
        fontFamily: theme.fonts.medium,
        color: colors.primaryForeground,
      },
    }),
    [colors, theme]
  );

  const features = [
    'Create and organize notes',
    'Manage tasks and projects',
    'Upload and share files',
    'Collaborate with your team',
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <View style={styles.icon}>
            <Ionicons name="checkmark-circle" size={64} color={colors.primary} />
          </View>
        </View>

        <Text style={styles.title}>All Set!</Text>
        <Text style={styles.subtitle}>
          Your workspace is ready. Here's what you can do:
        </Text>

        <View style={styles.featuresContainer}>
          {features.map((feature, index) => (
            <View key={feature} style={styles.feature}>
              <Ionicons
                name="checkmark"
                size={24}
                color={colors.primary}
                style={styles.featureIcon}
              />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.button} onPress={handleContinue}>
          <Text style={styles.buttonText}>Go to Workspace</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}