// mobile/src/screens/LoadingScreen.tsx
import React, { useMemo } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useTheme } from '@/providers/ThemeProviders';

export function LoadingScreen() {
  const { colors, theme } = useTheme();

  const styles = useMemo(() =>
    StyleSheet.create({
      container: {
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
      },
      logo: {
        fontSize: 32,
        fontFamily: theme.fonts.bold,
        color: colors.primary,
        marginBottom: theme.spacing.xl,
      },
      loader: {
        marginTop: theme.spacing.lg,
      },
    }),
    [colors, theme]
  );

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>Telera</Text>
      <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
    </View>
  );
}