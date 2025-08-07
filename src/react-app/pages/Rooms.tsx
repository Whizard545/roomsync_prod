import { useAuth } from "@/react-app/components/SimpleAuth";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import Layout from "@/react-app/components/Layout";
import { Plus, MapPin, Users, Monitor, Edit, Trash2 } from "lucide-react";
import type { Room, OfficeMap } from "@/shared/types";

export default function Rooms() {
  const { user, isPending } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [officeMap, setOfficeMap] = useState<OfficeMap | null>(null);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isPending && !user) {
      navigate("/");
      return;
    }

    if (user) {
      fetchData();
    }
  }, [user, isPending, navigate]);

  const fetchData = async () => {
    try {
      const [roomsRes, mapRes] = await Promise.all([
        fetch("/api/rooms"),
        fetch("/api/office-map")
      ]);

      if (roomsRes.ok) {
        const roomsData = await roomsRes.json();
        setRooms(roomsData);
      }

      if (mapRes.ok) {
        const mapData = await mapRes.json();
        setOfficeMap(mapData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (isPending || loading) {
    return (
      <Layout>
        <div className="animate-pulse">
          <div className="bg-gray-200 h-8 w-48 mb-6 rounded" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-gray-200 h-48 rounded-lg" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Переговорные комнаты</h2>
            <p className="text-gray-600">Управление комнатами и их расположением на карте офиса</p>
          </div>
          {user?.role === 'admin' && (
            <button
              onClick={() => setShowAddRoom(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              <Plus className="w-5 h-5 mr-2" />
              Добавить комнату
            </button>
          )}
        </div>

        {/* Office Map Section */}
        {officeMap && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Карта офиса</h3>
              <button
                onClick={() => navigate("/settings")}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Изменить карту
              </button>
            </div>
            <div className="relative bg-gray-50 rounded-lg overflow-hidden">
              <img
                src={officeMap.file_url}
                alt="Office Map"
                className="w-full h-96 object-contain"
              />
              {/* Room markers could be added here */}
            </div>
          </div>
        )}

        {/* Rooms Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map((room) => (
            <div key={room.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-50 rounded-lg mr-3">
                    <MapPin className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{room.name}</h3>
                    {room.description && (
                      <p className="text-sm text-gray-600">{room.description}</p>
                    )}
                  </div>
                </div>
                {user?.role === 'admin' && (
                  <div className="flex space-x-1">
                    <button className="p-1 text-gray-400 hover:text-blue-600">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button className="p-1 text-gray-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                {room.capacity && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="w-4 h-4 mr-2" />
                    Вместимость: {room.capacity} человек
                  </div>
                )}
                {room.equipment && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Monitor className="w-4 h-4 mr-2" />
                    {room.equipment}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <button
                  onClick={() => navigate('/bookings', { state: { selectedRoomId: room.id } })}
                  className="w-full px-4 py-2 bg-blue-50 text-blue-600 font-medium rounded-lg hover:bg-blue-100 transition-colors duration-200"
                >
                  Забронировать
                </button>
              </div>
            </div>
          ))}

          {rooms.length === 0 && (
            <div className="col-span-full text-center py-12">
              <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Нет переговорных комнат</h3>
              <p className="text-gray-600 mb-4">Добавьте первую комнату для начала работы</p>
              {user?.role === 'admin' && (
                <button
                  onClick={() => setShowAddRoom(true)}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Добавить комнату
                </button>
              )}
            </div>
          )}
        </div>

        {/* Add Room Modal */}
        {showAddRoom && user?.role === 'admin' && (
          <AddRoomModal
            onClose={() => setShowAddRoom(false)}
            onSuccess={() => {
              setShowAddRoom(false);
              fetchData();
            }}
          />
        )}
      </div>
    </Layout>
  );
}

// Add Room Modal Component
function AddRoomModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    capacity: "",
    equipment: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        name: formData.name,
        description: formData.description || undefined,
        capacity: formData.capacity ? parseInt(formData.capacity) : undefined,
        equipment: formData.equipment || undefined,
      };

      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error creating room:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Добавить переговорную комнату</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Название *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Описание
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Вместимость
            </label>
            <input
              type="number"
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Оборудование
            </label>
            <input
              type="text"
              value={formData.equipment}
              onChange={(e) => setFormData({ ...formData, equipment: e.target.value })}
              placeholder="Проектор, доска, телевизор..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors duration-200"
            >
              {loading ? "Создание..." : "Создать"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
