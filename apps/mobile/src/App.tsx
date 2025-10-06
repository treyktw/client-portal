// mobile/App.tsx
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';


import { ClerkProvider } from '@/providers/ClerkProvider';
import { ConvexProvider } from '@/providers/ConvexProvider';
import { NotificationProvider } from '@/providers/NotificationProvider';
import { RootNavigator } from '@/navigation/RootNavigator';
import { ThemeProvider, useTheme } from '@/providers/ThemeProviders';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

const customFonts = {
  'ArchitectsDaughter': require('../assets/fonts/ArchitectsDaughter-Regular.ttf'),
  'FiraCode-Regular': require('../assets/fonts/FiraCode-Regular.ttf'),
  'Inter-Regular': require('../assets/fonts/Inter-Regular.ttf'),
};

function AppContent() {
  const { isDark } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </>
  );
}

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    async function loadResources() {
      try {
        await Font.loadAsync(customFonts);
        setFontsLoaded(true);
      } catch (error) {
        console.error('Error loading fonts:', error);
      } finally {
        await SplashScreen.hideAsync();
      }
    }

    loadResources();
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ClerkProvider>
            <ConvexProvider>
              <NotificationProvider>
                <AppContent />
              </NotificationProvider>
            </ConvexProvider>
          </ClerkProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}