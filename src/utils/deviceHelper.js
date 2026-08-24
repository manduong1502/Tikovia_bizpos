// Utility to detect client device/browser info and manage trusted device tokens

export const getDeviceName = () => {
  if (typeof window === 'undefined') return 'Thiết bị không xác định';
  
  const ua = navigator.userAgent;
  let browser = 'Trình duyệt';
  let os = 'Thiết bị';

  // Detect OS
  if (ua.includes('Win')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('Linux')) os = 'Linux';

  // Detect Browser
  if (ua.includes('Edg/')) browser = 'Microsoft Edge';
  else if (ua.includes('Chrome/') && !ua.includes('Edg/')) browser = 'Google Chrome';
  else if (ua.includes('Safari/') && !ua.includes('Chrome/')) browser = 'Apple Safari';
  else if (ua.includes('Firefox/')) browser = 'Mozilla Firefox';
  else if (ua.includes('Opera') || ua.includes('OPR/')) browser = 'Opera';

  return `${browser} trên ${os}`;
};

export const getDeviceToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('bizpos_device_token') || null;
};

export const setDeviceToken = (token) => {
  if (typeof window === 'undefined' || !token) return;
  localStorage.setItem('bizpos_device_token', token);
};

export const removeDeviceToken = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('bizpos_device_token');
};
