import React from 'react';
import { Bell, CheckCircle2, X } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import { api } from '../../api';

export const WaiterCallBanner: React.FC = () => {
  const { activeCalls, dismissCall } = useSocket();

  if (activeCalls.length === 0) return null;

  const handleResolve = async (id: string) => {
    try {
      await api.patch(`/waiter-calls/${id}/resolve`, { status: 'RESOLVED' });
      dismissCall(id);
    } catch (e) {
      dismissCall(id);
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full">
      {activeCalls.map((call) => (
        <div
          key={call.id}
          className="flex items-center justify-between p-4 bg-amber-500 text-white rounded-xl shadow-2xl border border-amber-400 animate-bounce"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Bell className="w-6 h-6 animate-spin" />
            </div>
            <div>
              <div className="font-bold text-base">
                {call.table?.tableNumber} - {call.callType === 'BILL_REQUEST' ? 'Hesab İstəyir' : 'Ofisiant Çağırışı'}
              </div>
              <div className="text-xs text-white/90">
                Bölmə: {call.table?.section} | {new Date(call.createdAt).toLocaleTimeString('az-AZ')}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleResolve(call.id)}
              className="px-3 py-1.5 bg-white text-amber-700 font-semibold text-xs rounded-lg shadow hover:bg-amber-50 flex items-center gap-1 transition"
            >
              <CheckCircle2 className="w-4 h-4" /> Yaxınlaşdım
            </button>
            <button
              onClick={() => dismissCall(call.id)}
              className="p-1 hover:bg-white/20 rounded-md transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
