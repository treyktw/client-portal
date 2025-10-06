// mobile/src/navigation/OnboardingNavigator.tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from '@/providers/ThemeProviders';
import { OnboardingWelcomeScreen } from '@/screens/onboarding/OnBoardingWelcomeScreen';
import { OnboardingBusinessScreen } from '@/screens/onboarding/OnboardingBusinessScreen';
import { OnboardingGoalsScreen } from '@/screens/onboarding/OnboardingGoalsScreen';
import { OnboardingCompleteScreen } from '@/screens/onboarding/OnboardingCompleteScreen';

export type OnboardingStackParamList = {
  Welcome: { workspaceId: string };
  Business: { workspaceId: string };
  Goals: { workspaceId: string };
  Complete: { workspaceId: string };
};

const Stack = createStackNavigator<OnboardingStackParamList>();

export function OnboardingNavigator() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.foreground,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen 
        name="Welcome" 
        component={OnboardingWelcomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Business" 
        component={OnboardingBusinessScreen}
        options={{ title: 'Business Information' }}
      />
      <Stack.Screen 
        name="Goals" 
        component={OnboardingGoalsScreen}
        options={{ title: 'Your Goals' }}
      />
      <Stack.Screen 
        name="Complete" 
        component={OnboardingCompleteScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}