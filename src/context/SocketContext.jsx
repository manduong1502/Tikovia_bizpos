import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { notificationAPI } from '../services/api';
import { useAppStore } from '../stores/appStore';

const SocketContext = createContext(null);

export const useSocket = () => {
  return useContext(SocketContext);
};

const getSocketUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || 'https://api.tikovia.vn/api';
  if (apiUrl.endsWith('/api')) {
    return apiUrl.slice(0, -4);
  }
  return apiUrl;
};

// Beautiful "tính tinh" (chime) notification sound using Web Audio API
const playNotificationSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    // Ding 1 (A5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, ctx.currentTime);
    gain1.gain.setValueAtTime(0, ctx.currentTime);
    gain1.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.4);

    // Ding 2 (E6) - 100ms delayed
    setTimeout(() => {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1318.51, ctx.currentTime);
      gain2.gain.setValueAtTime(0, ctx.currentTime);
      gain2.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc2.start(ctx.currentTime);
      osc2.stop(ctx.currentTime + 0.6);
    }, 100);
  } catch (e) {
    console.warn('Không thể phát âm thanh thông báo:', e);
  }
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const orderUpdateCallbacks = useRef(new Set());

  const user = useAppStore(s => s.user);
  const [token, setToken] = useState(localStorage.getItem('token'));

  // Watch for appStore user changes to update the token from localStorage
  useEffect(() => {
    const currentToken = localStorage.getItem('token');
    if (currentToken !== token) {
      setToken(currentToken);
    }
  }, [user, token]);

  // Load existing notifications
  const loadNotifications = async () => {
    if (!token) return;
    try {
      const res = await notificationAPI.getAll({ page: 1, limit: 20 });
      if (res && res.data) {
        setNotifications(res.data);
        setUnreadCount(res.unreadCount || 0);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách thông báo:', err);
    }
  };

  const markAsRead = async (id) => {
    try {
      await notificationAPI.readOne(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Lỗi khi đánh dấu đã đọc:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationAPI.readAll();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success('Đã đánh dấu đã đọc tất cả thông báo');
    } catch (err) {
      console.error('Lỗi khi đánh dấu đã đọc tất cả:', err);
    }
  };

  const deleteNotification = async (id) => {
    try {
      const n = notifications.find(x => x.id === id);
      await notificationAPI.delete(id);
      setNotifications(prev => prev.filter(x => x.id !== id));
      if (n && !n.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      toast.success('Đã xóa thông báo');
    } catch (err) {
      console.error('Lỗi khi xóa thông báo:', err);
    }
  };

  // Register callback for order updates
  const registerOrderUpdateCallback = (cb) => {
    orderUpdateCallbacks.current.add(cb);
  };

  const unregisterOrderUpdateCallback = (cb) => {
    orderUpdateCallbacks.current.delete(cb);
  };

  // Listen to JWT changes / login status
  useEffect(() => {
    if (!token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    loadNotifications();

    const socketUrl = getSocketUrl();
    const newSocket = io(socketUrl, {
      query: { token },
      transports: ['websocket'],
      reconnectionAttempts: 5,
    });

    newSocket.on('connect', () => {
      console.log('🔌 Đã kết nối WebSockets thành công!');
    });

    newSocket.on('notification', (newNotif) => {
      // Add notification to state
      setNotifications(prev => [newNotif, ...prev]);
      setUnreadCount(prev => prev + 1);

      // Play sound
      playNotificationSound();

      // Show toast
      toast(
        (t) => (
          <div className="flex flex-col gap-1 font-sans">
            <span className="font-extrabold text-gray-800 text-xs tracking-tight flex items-center gap-1.5">
              🔔 {newNotif.title}
            </span>
            <span className="text-[11px] text-gray-500 font-medium leading-normal">
              {newNotif.message}
            </span>
          </div>
        ),
        {
          duration: 4000,
          position: 'top-right',
          style: {
            borderLeft: '4px solid #2563EB',
            borderRadius: '12px',
            padding: '12px 14px',
            maxWidth: '350px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          },
        }
      );
    });

    newSocket.on('order_updated', (data) => {
      orderUpdateCallbacks.current.forEach(cb => {
        try {
          cb(data);
        } catch (e) {
          console.error('Lỗi khi kích hoạt callback cập nhật đơn hàng:', e);
        }
      });
    });

    newSocket.on('connect_error', (err) => {
      console.warn('Lỗi kết nối WebSockets:', err.message);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        notifications,
        unreadCount,
        loadNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        registerOrderUpdateCallback,
        unregisterOrderUpdateCallback,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
