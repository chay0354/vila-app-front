/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// Set up background message handler for push notifications
// This allows notifications to be received even when the app is closed
let notifee = null;
let messaging = null;

try {
  const notifeeModule = require('@notifee/react-native');
  notifee = notifeeModule.default || notifeeModule;
  
  // Register background handler for push notifications
  if (notifee && notifee.onBackgroundEvent) {
    notifee.onBackgroundEvent(async ({ type, detail }) => {
      const { notification, pressAction } = detail;
      
      // Handle notification press
      if (type === notifee.EventType.PRESS && pressAction?.id) {
        // Notification was pressed - app will open
        // You can handle navigation here if needed
        console.log('Background notification pressed:', notification);
      }
      
      // Dismiss notification
      if (notification?.id) {
        await notifee.cancelNotification(notification.id);
      }
    });
  }
} catch (e) {
  console.warn('Notifee background handler not available:', e);
}

// Set up FCM background message handler for Android
// This receives push notifications even when app is completely closed
try {
  const messagingModule = require('@react-native-firebase/messaging');
  
  // Handle background messages (when app is closed)
  // Note: setBackgroundMessageHandler is a static method that must be called at the top level
  if (messagingModule && messagingModule.default && messagingModule.default.setBackgroundMessageHandler) {
    messagingModule.default.setBackgroundMessageHandler(async remoteMessage => {
      console.log('Background FCM message received:', remoteMessage);
      
      // Display notification using Notifee
      if (notifee && notifee.displayNotification) {
        await notifee.displayNotification({
          title: remoteMessage.notification?.title || 'התראה חדשה',
          body: remoteMessage.notification?.body || remoteMessage.data?.body || '',
          android: {
            channelId: 'default',
            importance: 4, // HIGH
            sound: 'default',
            vibrationPattern: [300, 500],
          },
        });
      }
    });
  }
} catch (e) {
  console.warn('FCM background handler not available (Firebase may not be configured):', e);
}

AppRegistry.registerComponent(appName, () => App);
