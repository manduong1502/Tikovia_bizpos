import { create } from 'zustand';

// ─── App-wide UI state ───
export const useAppStore = create((set) => ({
  // Sidebar collapse
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  // Dark mode (disabled)
  darkMode: false,
  toggleDarkMode: () => {},

  // Current user
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  setUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user));
    set({ user });
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null });
  },

  // Global loading
  loading: false,
  setLoading: (loading) => set({ loading }),
}));

// ─── Notification store ───
export const useNotificationStore = create((set) => ({
  notifications: [],
  unreadCount: 0,
  addNotification: (notif) => set((s) => ({
    notifications: [{ id: Date.now(), time: new Date(), read: false, ...notif }, ...s.notifications],
    unreadCount: s.unreadCount + 1,
  })),
  markAllRead: () => set((s) => ({
    notifications: s.notifications.map(n => ({ ...n, read: true })),
    unreadCount: 0,
  })),
}));
