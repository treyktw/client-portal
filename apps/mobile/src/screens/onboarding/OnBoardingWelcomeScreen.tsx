// mobile/src/screens/onboarding/OnboardingWelcomeScreen.tsx
import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/providers/ThemeProviders';
import { OnboardingStackParamList } from '@/navigation/OnboardingNavigator';

type Props = StackScreenProps<OnboardingStackParamList, 'Welcome'>;

export function OnboardingWelcomeScreen({ navigation, route }: Props) {
  const { colors, theme } = useTheme();
  const { workspaceId } = route.params;

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
      },
      iconContainer: {
        alignItems: 'center',
        marginBottom: theme.spacing.xxl,
      },
      icon: {
        width: 100,
        height: 100,
        borderRadius: 50,
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
      },
      stepsContainer: {
        marginBottom: theme.spacing.xxl,
      },
      step: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
      },
      stepNumber: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.muted,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.md,
      },
      stepNumberText: {
        fontSize: 14,
        fontFamily: theme.fonts.medium,
        color: colors.foreground,
      },
      stepText: {
        flex: 1,
        fontSize: 16,
        fontFamily: theme.fonts.regular,
        color: colors.foreground,
      },
      button: {
        backgroundColor: colors.primary,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        alignItems: 'center',
      },
      buttonText: {
        fontSize: 16,
        fontFamily: theme.fonts.medium,
        color: colors.primaryForeground,
      },
      skipButton: {
        marginTop: theme.spacing.md,
        padding: theme.spacing.md,
        alignItems: 'center',
      },
      skipText: {
        fontSize: 14,
        fontFamily: theme.fonts.regular,
        color: colors.mutedForeground,
      },
    }),
    [colors, theme]
  );

  const steps = [
    'Tell us about your business',
    'Define your goals',
    'Choose your workspace theme',
    'Upload brand assets (optional)',
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.iconContainer}>
          <View style={styles.icon}>
            <Ionicons name="rocket-outline" size={48} color={colors.primary} />
          </View>
        </View>

        <Text style={styles.title}>Welcome to Telera</Text>
        <Text style={styles.subtitle}>
          Let's set up your workspace in just a few steps. This will help us customize your experience.
        </Text>

        <View style={styles.stepsContainer}>
          {steps.map((step, index) => (
            <View key={step} style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('Business', { workspaceId })}
        >
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => navigation.navigate('Complete', { workspaceId })}
        >
          <Text style={styles.skipText}>Skip Setup</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}