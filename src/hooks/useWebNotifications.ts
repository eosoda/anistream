'use client';

import { useEffect, useState } from 'react';

export function useWebNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

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
