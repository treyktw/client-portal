// mobile/src/providers/ClerkProvider.tsx
import  type React from 'react';
import { ClerkProvider as ClerkProviderBase, ClerkLoaded } from '@clerk/clerk-expo';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

const tokenCache = {
  async getToken(key: string) {
    try {
      return SecureStore.getItemAsync(key);
    } catch (err) {
      console.error('Error getting token from SecureStore:', err);
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return SecureStore.setItemAsync(key, value);
    } catch (err) {
      console.error('Error saving token to SecureStore:', err);
    }
  },
  async deleteToken(key: string) {
    try {
      return SecureStore.deleteItemAsync(key);
    } catch (err) {
      console.error('Error deleting token from SecureStore:', err);
    }
  },
};

export const ClerkProvider = ({ children }: { children: React.ReactNode }) => {
  const clerkPublishableKey = Constants.expoConfig?.extra?.clerkPublishableKey || process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!clerkPublishableKey) {
    throw new Error('CLERK_PUBLISHABLE_KEY is missing. Please check your app.json');
  }

  return (
    <ClerkProviderBase 
      publishableKey={clerkPublishableKey}
      tokenCache={tokenCache}
    >
      <ClerkLoaded>
        {children}
      </ClerkLoaded>
    </ClerkProviderBase>
  );
};