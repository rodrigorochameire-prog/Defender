import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import Cookies from "js-cookie";
import { COOKIE_NAME } from "../../../shared/const";

export interface Notification {
  type: string;
  title: string;
  message: string;
  data?: any;
  timestamp: Date;
}

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const socketRef = useRef<Socket | null>(null);

  const connect = useCallback(() => {
    // Get auth token from cookie
    const token = Cookies.get(COOKIE_NAME);

    if (!token) {
      console.warn("[WebSocket] No auth token found");
      return;
    }

    // Get WebSocket URL (same origin as current page)
    const wsUrl = window.location.origin;

    // Create socket connection
    const socket = io(wsUrl, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
    });

    socket.on("connect", () => {
      console.log("[WebSocket] Connected");
      setIsConnected(true);
    });

    socket.on("disconnect", (reason) => {
      console.log("[WebSocket] Disconnected:", reason);
      setIsConnected(false);
    });

    socket.on("notification", (notification: Notification) => {
      console.log("[WebSocket] Notification received:", notification);
      setNotifications((prev) => [notification, ...prev]);
    });

    socket.on("connect_error", (error) => {
      console.error("[WebSocket] Connection error:", error);
    });

    socketRef.current = socket;

    return socket;
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const removeNotification = useCallback((index: number) => {
    setNotifications((prev) => prev.filter((_, i) => i !== index));
  }, []);

  useEffect(() => {
    const socket = connect();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [connect]);

  return {
    isConnected,
    notifications,
    clearNotifications,
    removeNotification,
    reconnect: connect,
  };
}
