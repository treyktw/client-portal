// mobile/src/screens/auth/SignUpScreen.tsx
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
import { useSignUp } from '@clerk/clerk-expo';
import { useForm, Controller } from 'react-hook-form';  
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTheme } from '@/providers/ThemeProviders';
import { useNotifications } from '@/providers/NotificationProvider';
import type { AuthStackScreenProps } from '@/navigation/types';

const signUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
});

type SignUpForm = z.infer<typeof signUpSchema>;

export function SignUpScreen({ navigation }: AuthStackScreenProps<'SignUp'>) {
  const { colors, theme } = useTheme();
  const { signUp, setActive, isLoaded } = useSignUp();
  const { showToast } = useNotifications();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpForm>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: '',
      password: '',
      name: '',
    },
  });

  const onSignUp = useCallback(async (data: SignUpForm) => {
    if (!isLoaded) return;

    try {
      await signUp.create({
        emailAddress: data.email,
        password: data.password,
        firstName: data.name.split(' ')[0],
        lastName: data.name.split(' ').slice(1).join(' '),
      });

      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      
      // You'd typically navigate to a verification screen here
      showToast('success', 'Account created!', 'Please check your email for verification');
      navigation.navigate('SignIn');
    } catch (err: any) {
      // Handle specific Clerk errors
      if (err.errors?.[0]?.code === 'form_identifier_exists') {
        showToast('error', 'Account exists', 'An account with this email already exists. Please sign in instead.');
        navigation.navigate('SignIn');
        return;
      }
      
      if (err.errors?.[0]?.code === 'session_exists') {
        showToast('info', 'Already signed in', 'You are already signed in. Please sign out first.');
        return;
      }
      
      showToast('error', 'Sign up failed', err.errors?.[0]?.message || 'Please try again');
    }
  }, [isLoaded, signUp, showToast, navigation]);

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
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join Telera to get started</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Name</Text>
              <Controller
                control={control}
                name="name"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[styles.input, errors.name && styles.inputError]}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    placeholder="Enter your full name"
                    placeholderTextColor={colors.mutedForeground}
                    autoCapitalize="words"
                  />
                )}
              />
              {errors.name && (
                <Text style={styles.errorText}>{errors.name.message}</Text>
              )}
            </View>

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
                    placeholder="Create a password"
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
            onPress={handleSubmit(onSignUp)}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={styles.buttonText}>Sign Up</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}