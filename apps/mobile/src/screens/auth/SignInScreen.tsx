// mobile/src/screens/auth/SignInScreen.tsx
import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSignIn } from '@clerk/clerk-expo';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTheme } from '@/providers/ThemeProviders';
import { useNotifications } from '@/providers/NotificationProvider';
import type { AuthStackScreenProps } from '@/navigation/types';

const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type SignInForm = z.infer<typeof signInSchema>;

export function SignInScreen({ navigation }: AuthStackScreenProps<'SignIn'>) {
  const { colors, theme } = useTheme();
  const { signIn, setActive, isLoaded } = useSignIn();
  const { showToast } = useNotifications();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInForm>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSignIn = useCallback(async (data: SignInForm) => {
    if (!isLoaded) return;

    try {
      const result = await signIn.create({
        identifier: data.email,
        password: data.password,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        showToast('success', 'Welcome back!');
      }
    } catch (err: any) {
      // Handle specific Clerk errors
      if (err.errors?.[0]?.code === 'session_exists') {
        showToast('info', 'Already signed in', 'You are already signed in to this account');
        return;
      }
      
      if (err.errors?.[0]?.code === 'form_identifier_exists') {
        showToast('error', 'Account exists', 'An account with this email already exists. Please sign in instead.');
        return;
      }
      
      showToast('error', 'Sign in failed', err.errors?.[0]?.message || 'Please try again');
    }
  }, [isLoaded, signIn, setActive, showToast]);

  const styles = useMemo(() => 
    StyleSheet.create({
      container: {
        flex: 1,
        backgroundColor: colors.background,
      },
      scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: theme.spacing.lg,
      },
      header: {
        marginBottom: theme.spacing.xxl,
      },
      title: {
        fontSize: 32,
        fontFamily: theme.fonts.bold,
        color: colors.foreground,
        marginBottom: theme.spacing.sm,
      },
      subtitle: {
        fontSize: 16,
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
      inputError: {
        borderColor: colors.destructive,
      },
      errorText: {
        fontSize: 12,
        fontFamily: theme.fonts.regular,
        color: colors.destructive,
        marginTop: theme.spacing.xs,
      },
      button: {
        backgroundColor: colors.primary,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        alignItems: 'center',
        marginBottom: theme.spacing.md,
      },
      buttonDisabled: {
        opacity: 0.6,
      },
      buttonText: {
        fontSize: 16,
        fontFamily: theme.fonts.medium,
        color: colors.primaryForeground,
      },
      linkButton: {
        alignItems: 'center',
        padding: theme.spacing.sm,
      },
      linkText: {
        fontSize: 14,
        fontFamily: theme.fonts.regular,
        color: colors.primary,
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
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to your Telera account</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[styles.input, errors.email && styles.inputError]}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    placeholder="Enter your email"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                )}
              />
              {errors.email && (
                <Text style={styles.errorText}>{errors.email.message}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[styles.input, errors.password && styles.inputError]}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    placeholder="Enter your password"
                    placeholderTextColor={colors.mutedForeground}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                )}
              />
              {errors.password && (
                <Text style={styles.errorText}>{errors.password.message}</Text>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, isSubmitting && styles.buttonDisabled]}
            onPress={handleSubmit(onSignIn)}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.navigate('SignUp')}
          >
            <Text style={styles.linkText}>Don't have an account? Sign up</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}