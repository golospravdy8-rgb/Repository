'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface VIPRequest {
  id: number;
  phone: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: string;
}

export default function VIPRequestsPage() {
  const [requests, setRequests] = useState<VIPRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activatingId, setActivatingId] = useState<number | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/vip-requests');
      const data = await response.json();
      setRequests(data.requests || []);
    } catch (error) {
      console.error('Failed to fetch VIP requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (userId: number) => {
    if (!window.confirm('Підтвердити активацію VIP?')) return;

    try {
      setActivatingId(userId);
      const response = await fetch('/api/admin/vip-activate-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, plan: 'month' }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(`✅ VIP активовано для ${data.user.name}`);
        fetchRequests();
      } else {
        alert(`❌ Помилка: ${data.error || 'Невідома помилка'}`);
      }
    } catch (error) {
      console.error('Activation error:', error);
      alert('❌ Помилка активації');
    } finally {
      setActivatingId(null);
    }
  };

  const handleDeactivate = async (userId: number) => {
    if (!window.confirm('Повністю деактивувати VIP?')) return;

    try {
      setActivatingId(userId);
      const response = await fetch('/api/admin/vip-deactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('✅ VIP деактивовано');
        fetchRequests();
      } else {
        alert(`❌ Помилка: ${data.error}`);
      }
    } catch (error) {
      console.error('Deactivation error:', error);
      alert('❌ Помилка деактивації');
    } finally {
      setActivatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const pendingCount = requests.filter((r) => r.role === 'parent').length;
  const activeCount = requests.filter((r) => r.role === 'vip').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">👑 VIP Заявки</h1>
          <p className="text-gray-600 mt-1">Управління заявками на активацію VIP</p>
        </div>
        <div className="flex gap-4">
          <Link
            href="/admin/dashboard"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            ← Назад до дашборду
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-600">Всього заявок</div>
          <div className="text-3xl font-bold text-blue-600 mt-2">{requests.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-600">⏳ Очікують активації</div>
          <div className="text-3xl font-bold text-yellow-600 mt-2">{pendingCount}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-600">✅ Активні</div>
          <div className="text-3xl font-bold text-green-600 mt-2">{activeCount}</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Батько
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Телефон
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Статус
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Дійсна до
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Дія
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {requests.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  Немає заявок на VIP
                </td>
              </tr>
            ) : (
              requests.map((request) => (
                <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {request.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {request.firstName} {request.lastName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {request.phone}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {request.role === 'vip' ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        ✅ VIP Активний
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        ⏳ Батько
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className="text-gray-400">—</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {request.role === 'vip' ? (
                      <button
                        onClick={() => handleDeactivate(request.id)}
                        disabled={activatingId === request.id}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {activatingId === request.id ? '⏳' : '❌'}
                        {activatingId === request.id ? 'Обробка...' : 'Деактивувати'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleActivate(request.id)}
                        disabled={activatingId === request.id}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {activatingId === request.id ? '⏳' : '✅'}
                        {activatingId === request.id ? 'Активування...' : 'Активувати'}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <div className="text-2xl">ℹ️</div>
          <div>
            <h3 className="font-semibold text-blue-900">Як користуватися</h3>
            <ul className="text-sm text-blue-800 mt-2 space-y-1">
              <li>• Коли батько подає заявку на VIP через форму оплати, вона з'являється тут</li>
              <li>• Натисніть <strong>Активувати</strong> щоб дати батькові доступ до VIP</li>
              <li>• Батько отримає Telegram сповіщення про активацію</li>
              <li>• VIP дійсна протягом обраного периоду (місяць/сезон/рік)</li>
              <li>• Після сплину терміну батько знову потребує оплати для доступу</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
