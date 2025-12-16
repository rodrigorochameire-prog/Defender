import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Bell, BellOff } from "lucide-react";
import { requestNotificationPermission, getNotificationPermission } from "@/lib/pushNotifications";

export function NotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission>(
    getNotificationPermission()
  );
  const [show, setShow] = useState(false);

  useEffect(() => {
    const currentPermission = getNotificationPermission();
    setPermission(currentPermission);

    if (currentPermission === "default") {
      const hasAsked = localStorage.getItem("notification-permission-asked");
      if (!hasAsked) {
        setShow(true);
      }
    }
  }, []);

  const handleRequest = async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
    localStorage.setItem("notification-permission-asked", "true");
    setShow(false);
  };

  const handleDismiss = () => {
    localStorage.setItem("notification-permission-asked", "true");
    setShow(false);
  };

  if (!show || permission !== "default") {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Ativar Notificações
          </CardTitle>
          <CardDescription>
            Receba alertas importantes sobre seus pets diretamente no navegador
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button onClick={handleRequest} className="flex-1">
            Ativar
          </Button>
          <Button onClick={handleDismiss} variant="outline" className="flex-1">
            Agora não
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
