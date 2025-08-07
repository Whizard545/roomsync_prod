import { useAuth } from "@getmocha/users-service/react";
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router";
import Layout from "@/react-app/components/Layout";
import { Calendar, Clock, MapPin, Plus, User, Filter } from "lucide-react";
import type { Room, Booking } from "@/shared/types";

export default function Bookings() {
  const { user, isPending } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [showCreateBooking, setShowCreateBooking] = useState(false);
  const [selectedRoom] = useState<number | null>(
    location.state?.selectedRoomId || null
  );
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("upcoming");
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
      const [roomsRes, bookingsRes] = await Promise.all([
        fetch("/api/rooms"),
        fetch("/api/bookings")
      ]);

      if (roomsRes.ok && bookingsRes.ok) {
        const roomsData = await roomsRes.json();
        const bookingsData = await bookingsRes.json();
        setRooms(roomsData);
        setBookings(bookingsData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBookings = bookings.filter((booking) => {
    const now = new Date();
    const startTime = new Date(booking.start_time);

    switch (filter) {
      case "upcoming":
        return startTime > now;
      case "past":
        return startTime <= now;
      default:
        return true;
    }
  }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  if (isPending || loading) {
    return (
      <Layout>
        <div className="animate-pulse">
          <div className="bg-gray-200 h-8 w-48 mb-6 rounded" />
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-gray-200 h-24 rounded-lg" />
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
            <h2 className="text-2xl font-bold text-gray-900">Бронирования</h2>
            <p className="text-gray-600">Управление бронированиями переговорных комнат</p>
          </div>
          <button
            onClick={() => setShowCreateBooking(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            <Plus className="w-5 h-5 mr-2" />
            Создать бронирование
          </button>
        </div>

        {/* Filter */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <Filter className="w-5 h-5 text-gray-400 mr-2" />
            <span className="text-sm font-medium text-gray-700">Фильтр:</span>
          </div>
          <div className="flex space-x-2">
            {[
              { key: "all", label: "Все" },
              { key: "upcoming", label: "Предстоящие" },
              { key: "past", label: "Прошедшие" },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setFilter(item.key as any)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors duration-200 ${
                  filter === item.key
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bookings List */}
        <div className="space-y-4">
          {filteredBookings.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {filter === "upcoming" ? "Нет предстоящих бронирований" : 
                 filter === "past" ? "Нет прошедших бронирований" : "Нет бронирований"}
              </h3>
              <p className="text-gray-600 mb-4">Создайте первое бронирование</p>
              <button
                onClick={() => setShowCreateBooking(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                <Plus className="w-5 h-5 mr-2" />
                Создать бронирование
              </button>
            </div>
          ) : (
            filteredBookings.map((booking) => {
              const isUpcoming = new Date(booking.start_time) > new Date();
              const isMyBooking = booking.user_id === user?.id;

              return (
                <div
                  key={booking.id}
                  className={`bg-white p-6 rounded-xl shadow-sm border transition-all duration-200 hover:shadow-md ${
                    isUpcoming ? 'border-blue-200' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 mr-2">
                          {booking.title}
                        </h3>
                        {isMyBooking && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                            Мое
                          </span>
                        )}
                        {isUpcoming && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full ml-2">
                            Предстоящее
                          </span>
                        )}
                      </div>
                      
                      {booking.description && (
                        <p className="text-gray-600 mb-3">{booking.description}</p>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center text-gray-600">
                          <MapPin className="w-4 h-4 mr-2" />
                          {booking.room_name}
                        </div>
                        <div className="flex items-center text-gray-600">
                          <Clock className="w-4 h-4 mr-2" />
                          {new Date(booking.start_time).toLocaleString('ru-RU')}
                        </div>
                        <div className="flex items-center text-gray-600">
                          <User className="w-4 h-4 mr-2" />
                          {booking.user_email}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Create Booking Modal */}
        {showCreateBooking && (
          <CreateBookingModal
            rooms={rooms}
            selectedRoom={selectedRoom}
            onClose={() => setShowCreateBooking(false)}
            onSuccess={() => {
              setShowCreateBooking(false);
              fetchData();
            }}
          />
        )}
      </div>
    </Layout>
  );
}

// Create Booking Modal Component
function CreateBookingModal({ 
  rooms, 
  selectedRoom, 
  onClose, 
  onSuccess 
}: { 
  rooms: Room[]; 
  selectedRoom: number | null;
  onClose: () => void; 
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    room_id: selectedRoom || "",
    title: "",
    description: "",
    start_time: "",
    end_time: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Set default times (next hour)
  useEffect(() => {
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setHours(now.getHours() + 1, 0, 0, 0);
    const endTime = new Date(nextHour);
    endTime.setHours(nextHour.getHours() + 1);

    setFormData(prev => ({
      ...prev,
      start_time: nextHour.toISOString().slice(0, 16),
      end_time: endTime.toISOString().slice(0, 16),
    }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          room_id: parseInt(formData.room_id as string),
        }),
      });

      if (response.ok) {
        onSuccess();
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Ошибка при создании бронирования");
      }
    } catch (error) {
      setError("Произошла ошибка. Попробуйте снова.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Создать бронирование</h3>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Комната *
            </label>
            <select
              value={formData.room_id}
              onChange={(e) => setFormData({ ...formData, room_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Выберите комнату</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                  {room.capacity && ` (${room.capacity} мест)`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Название встречи *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
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
              Время начала *
            </label>
            <input
              type="datetime-local"
              value={formData.start_time}
              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Время окончания *
            </label>
            <input
              type="datetime-local"
              value={formData.end_time}
              onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
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
