'use client';

import { useState } from 'react';

export function useWebNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'default'
  );

  const requestPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const res = await Notification.requestPermission();
      setPermission(res);
      return res === 'granted';
    }
    return false;
  };

  const sendNotification = (title: string, body: string, icon = '/icon-192.png') => {
    if (permission === 'granted' && typeof window !== 'undefined' && 'Notification' in window) {
      new Notification(title, {
        body,
        icon,
      });
    }
  };

  return { permission, requestPermission, sendNotification };
}
