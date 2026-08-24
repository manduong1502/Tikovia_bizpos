import { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { userAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Monitor, Smartphone, Laptop, Trash2, ShieldCheck, Clock, Globe, AlertTriangle } from 'lucide-react';

export default function UserDevicesModal({ open, onClose, user }) {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [revokingId, setRevokingId] = useState(null);

  const loadDevices = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await userAPI.getUserDevices(user.id);
      setDevices(res.devices || []);
    } catch (err) {
      console.error(err);
      toast.error('Không thể tải danh sách thiết bị');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && user?.id) {
      loadDevices();
    }
  }, [open, user]);

  const handleRevoke = async (deviceId, deviceName) => {
    if (!confirm(`Bạn có chắc muốn hủy quyền tin cậy và đăng xuất khỏi thiết bị "${deviceName}"?`)) return;

    setRevokingId(deviceId);
    try {
      await userAPI.revokeUserDevice(user.id, deviceId);
      toast.success('Đã hủy tin cậy thiết bị thành công');
      setDevices(prev => prev.filter(d => d.id !== deviceId));
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi hủy thiết bị');
    } finally {
      setRevokingId(null);
    }
  };

  const getDeviceIcon = (deviceName = '') => {
    const lower = deviceName.toLowerCase();
    if (lower.includes('iphone') || lower.includes('android') || lower.includes('ios')) {
      return <Smartphone className="text-blue-500" size={20} />;
    }
    if (lower.includes('mac') || lower.includes('laptop')) {
      return <Laptop className="text-purple-500" size={20} />;
    }
    return <Monitor className="text-indigo-500" size={20} />;
  };

  const getRemainingDays = (trustedUntil) => {
    if (!trustedUntil) return 0;
    const diffMs = new Date(trustedUntil).getTime() - Date.now();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Thiết bị tin cậy - ${user?.fullName || user?.username}`}
      size="lg"
      footer={
        <Button variant="outline" onClick={onClose}>
          Đóng
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-100 flex items-start gap-3">
          <ShieldCheck size={20} className="text-primary shrink-0 mt-0.5" />
          <div className="text-xs text-blue-900 leading-relaxed">
            <span className="font-bold">Chính sách thiết bị tin cậy (30 ngày):</span> Các thiết bị dưới đây đã được xác thực mã OTP qua Gmail và được phép đăng nhập trực tiếp mà không cần hỏi lại mã trong 30 ngày. Bạn có thể hủy quyền từ xa bất kỳ lúc nào để bắt buộc đăng nhập lại bằng mã OTP.
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-gray-500 flex flex-col items-center justify-center gap-2">
            <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs">Đang tải danh sách thiết bị...</span>
          </div>
        ) : devices.length === 0 ? (
          <div className="py-12 text-center text-gray-400 flex flex-col items-center justify-center gap-2">
            <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center">
              <Monitor size={24} className="text-gray-300" />
            </div>
            <span className="text-sm font-medium text-gray-500">Chưa có thiết bị tin cậy nào đang hoạt động</span>
            <span className="text-xs text-gray-400">Khi nhân viên đăng nhập và xác thực OTP 2FA, thiết bị sẽ hiển thị tại đây.</span>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden shadow-sm">
            {devices.map((device) => {
              const remainingDays = getRemainingDays(device.trustedUntil);
              return (
                <div key={device.id} className="p-4 bg-white hover:bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                      {getDeviceIcon(device.deviceName)}
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-gray-800">
                          {device.deviceName || 'Trình duyệt Web'}
                        </span>
                        <span className="px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 text-[10px] font-bold rounded-full">
                          Đã tin cậy
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Globe size={13} className="text-gray-400" />
                          IP: {device.ipAddress || '---'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={13} className="text-gray-400" />
                          Còn {remainingDays} ngày tin cậy
                        </span>
                      </div>

                      <span className="text-[11px] text-gray-400">
                        Đăng nhập gần nhất: {new Date(device.lastUsedAt || device.createdAt).toLocaleString('vi-VN')}
                      </span>
                    </div>
                  </div>

                  <div className="sm:self-center shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRevoke(device.id, device.deviceName)}
                      disabled={revokingId === device.id}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Trash2 size={14} />
                      {revokingId === device.id ? 'Đang hủy...' : 'Hủy thiết bị'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
