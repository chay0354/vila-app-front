/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// Set up background message handler for push notifications
// This allows notifications to be received even when the app is closed
let notifee = null;
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

AppRegistry.registerComponent(appName, () => App);
