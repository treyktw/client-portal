// mobile/src/providers/NotificationProvider.tsx
import { createContext, useContext, useReducer, useEffect, useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useAuth } from '@clerk/clerk-expo';
import Toast from 'react-native-toast-message';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

interface NotificationState {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  notificationPermission: boolean;
}

type NotificationAction =
  | { type: 'SET_TOKEN'; payload: string }
  | { type: 'SET_NOTIFICATION'; payload: Notifications.Notification }
  | { type: 'SET_PERMISSION'; payload: boolean }
  | { type: 'CLEAR_NOTIFICATION' };

const notificationReducer = (
  state: NotificationState,
  action: NotificationAction
): NotificationState => {
  switch (action.type) {
    case 'SET_TOKEN':
      return { ...state, expoPushToken: action.payload };
    case 'SET_NOTIFICATION':
      return { ...state, notification: action.payload };
    case 'SET_PERMISSION':
      return { ...state, notificationPermission: action.payload };
    case 'CLEAR_NOTIFICATION':
      return { ...state, notification: null };
    default:
      return state;
  }
};

interface NotificationContextValue {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  notificationPermission: boolean;
  requestPermission: () => Promise<void>;
  scheduleNotification: (
    title: string,
    body: string,
    data?: Record<string, unknown> | undefined,
    trigger?: Notifications.NotificationTriggerInput
  ) => Promise<void>;
  clearNotification: () => void;
  showToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const { isSignedIn } = useAuth();
  const [state, dispatch] = useReducer(notificationReducer, {
    expoPushToken: null,
    notification: null,
    notificationPermission: false,
  });

  const registerForPushNotificationsAsync = useCallback(async () => {
    if (!Device.isDevice) {
      console.log('Must use physical device for Push Notifications');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      dispatch({ type: 'SET_PERMISSION', payload: false });
      return null;
    }

    dispatch({ type: 'SET_PERMISSION', payload: true });

    const token = (await Notifications.getExpoPushTokenAsync()).data;
    dispatch({ type: 'SET_TOKEN', payload: token });

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    return token;
  }, []);

  useEffect(() => {
    if (isSignedIn) {
      registerForPushNotificationsAsync();
    }
  }, [isSignedIn, registerForPushNotificationsAsync]);

  useEffect(() => {
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      dispatch({ type: 'SET_NOTIFICATION', payload: notification });
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification tapped:', response);
      // Handle notification tap - navigate to relevant screen
    });

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);

  const value = useMemo<NotificationContextValue>(() => ({
    expoPushToken: state.expoPushToken,
    notification: state.notification,
    notificationPermission: state.notificationPermission,
    requestPermission: async () => {
      await registerForPushNotificationsAsync();
    },
    scheduleNotification: async (title, body, data, trigger) => {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
        },
        trigger: trigger || null,
      });
    },
    clearNotification: () => {
      dispatch({ type: 'CLEAR_NOTIFICATION' });
    },
    showToast: (type, title, message) => {
      Toast.show({
        type,
        text1: title,
        text2: message,
        position: 'top',
        visibilityTime: 3000,
      });
    },
  }), [state, registerForPushNotificationsAsync]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <Toast />
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};