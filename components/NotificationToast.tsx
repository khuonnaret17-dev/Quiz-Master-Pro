
import * as React from 'react';
import { useEffect, useState } from 'react';
import { AppNotification } from '../types';
import { Bell, X } from 'lucide-react';

interface Props {
  notification: AppNotification | null;
  onClear: () => void;
}

const NotificationToast: React.FC<Props> = ({ notification, onClear }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (notification) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        // Delay onClear to allow exit animation
        setTimeout(onClear, 300);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification, onClear]);

  if (!notification) return null;

  return (
    <div 
      className={`fixed top-6 right-6 z-[100] transition-all duration-300 transform ${
        visible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0 pointer-events-none'
      }`}
    >
      <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl p-4 flex items-start gap-4 max-w-sm">
        <div className="bg-indigo-100 p-2 rounded-xl">
          <Bell className="w-5 h-5 text-indigo-600" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-bold text-slate-900 mb-1">ការជូនដំណឹងថ្មី</h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            {notification.message}
          </p>
          <p className="text-[10px] text-slate-400 mt-2">
            {new Date(notification.timestamp).toLocaleTimeString('km-KH')}
          </p>
        </div>
        <button 
          onClick={() => {
            setVisible(false);
            setTimeout(onClear, 300);
          }}
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default NotificationToast;
