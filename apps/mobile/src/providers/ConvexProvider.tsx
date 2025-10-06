// mobile/src/providers/ConvexProvider.tsx
import { useEffect, useMemo } from 'react';
import { ConvexProvider as ConvexProviderBase, ConvexReactClient } from 'convex/react';
import { useAuth } from '@clerk/clerk-expo';

if (!process.env.EXPO_PUBLIC_CONVEX_URL) {
  throw new Error('CONVEX_URL is missing. Please check your app.json');
}

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL, {
  unsavedChangesWarning: false,
});

export const ConvexProvider = ({ children }: { children: React.ReactNode }) => {
  const { isLoaded, isSignedIn, getToken } = useAuth();

  const fetchAccessToken = useMemo(
    () => async ({ forceRefreshToken: _forceRefreshToken }: { forceRefreshToken: boolean }) => {
      if (!isLoaded || !isSignedIn) {
        return null;
      }

      try {
        const token = await getToken({ template: 'convex' });
        return token;
      } catch (error) {
        console.error('Error fetching Convex token:', error);
        return null;
      }
    },
    [isLoaded, isSignedIn, getToken]
  );

  useEffect(() => {
    convex.setAuth(fetchAccessToken);
    return () => {
      convex.clearAuth();
    };
  }, [fetchAccessToken]);

  return (
    <ConvexProviderBase client={convex}>
      {children}
    </ConvexProviderBase>
  );
};