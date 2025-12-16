export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) {
    console.warn("Este navegador não suporta notificações push");
    return "denied";
  }

  if (Notification.permission === "granted") {
    return "granted";
  }

  if (Notification.permission !== "denied") {
    return await Notification.requestPermission();
  }

  return Notification.permission;
}

export function showBrowserNotification(
  title: string,
  options?: NotificationOptions
) {
  if (Notification.permission === "granted") {
    const notification = new Notification(title, {
      icon: "/tetecare-logo.png",
      badge: "/tetecare-logo.png",
      ...options,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    return notification;
  }
}

export function isNotificationSupported(): boolean {
  return "Notification" in window;
}

export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) {
    return "denied";
  }
  return Notification.permission;
}
