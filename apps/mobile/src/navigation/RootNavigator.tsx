// mobile/src/navigation/RootNavigator.tsx
import { useMemo, useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '@clerk/clerk-expo';
import { useQuery } from 'convex/react';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import type { RootStackParamList } from './types';
import { AuthNavigator } from './AuthNavigator';
import { TabNavigator } from './TabNavigator';
import { WorkspaceSelectScreen } from '@/screens/workspace/WorkspaceSelectScreen';
import { OnboardingNavigator } from './OnboardingNavigator';
import { LoadingScreen } from '@/screens/LoadingScreen';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { api } from '@telera/convex/_generated/api';

const Stack = createStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { isLoaded, isSignedIn } = useAuth();
  const currentUser = useQuery(api.users.getCurrentUser);
  const { selectedWorkspaceId } = useWorkspaceStore();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const initialRouteName = useMemo(() => {
    if (!isLoaded) return 'Auth';
    if (!isSignedIn) return 'Auth';
    if (!currentUser) return 'Auth';
    if (!selectedWorkspaceId) return 'WorkspaceSelect';
    return 'Main';
  }, [isLoaded, isSignedIn, currentUser, selectedWorkspaceId]);

  // Redirect signed-in users away from Auth screen
  useEffect(() => {
    if (isLoaded && isSignedIn && currentUser) {
      // If user is signed in but somehow on Auth screen, redirect them
      const currentRoute = navigation.getState()?.routes[navigation.getState()?.index || 0];
      if (currentRoute?.name === 'Auth') {
        if (selectedWorkspaceId) {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Main' }],
          });
        } else {
          navigation.reset({
            index: 0,
            routes: [{ name: 'WorkspaceSelect' }],
          });
        }
      }
    }
  }, [isLoaded, isSignedIn, currentUser, selectedWorkspaceId, navigation]);

  if (!isLoaded) {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Auth" component={AuthNavigator} />
      <Stack.Screen name="WorkspaceSelect" component={WorkspaceSelectScreen} />
      <Stack.Screen name="Main" component={TabNavigator} />
      <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
    </Stack.Navigator>
  );
}