import { useAuth } from "@getmocha/users-service/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import Layout from "@/react-app/components/Layout";
import { Calendar, MapPin, Users, Clock, Plus } from "lucide-react";
import type { Room, Booking } from "@/shared/types";

export default function Dashboard() {
  const { user, isPending } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
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

  const todayBookings = bookings.filter(booking => {
    const bookingDate = new Date(booking.start_time).toDateString();
    const today = new Date().toDateString();
    return bookingDate === today;
  });

  const upcomingBookings = bookings
    .filter(booking => new Date(booking.start_time) > new Date())
    .slice(0, 5);

  if (isPending || loading) {
    return (
      <Layout>
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-gray-200 h-32 rounded-lg" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 bg-blue-50 rounded-lg">
                <MapPin className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Всего комнат</p>
                <p className="text-2xl font-bold text-gray-900">{rooms.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 bg-green-50 rounded-lg">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Бронирований сегодня</p>
                <p className="text-2xl font-bold text-gray-900">{todayBookings.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 bg-purple-50 rounded-lg">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Всего бронирований</p>
                <p className="text-2xl font-bold text-gray-900">{bookings.length}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Quick Actions */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Быстрые действия</h3>
            <div className="space-y-3">
              <button
                onClick={() => navigate("/bookings")}
                className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg hover:from-blue-100 hover:to-purple-100 transition-colors duration-200"
              >
                <div className="flex items-center">
                  <Plus className="w-5 h-5 text-blue-600 mr-3" />
                  <span className="font-medium text-gray-900">Создать бронирование</span>
                </div>
              </button>
              
              <button
                onClick={() => navigate("/rooms")}
                className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg hover:from-green-100 hover:to-blue-100 transition-colors duration-200"
              >
                <div className="flex items-center">
                  <MapPin className="w-5 h-5 text-green-600 mr-3" />
                  <span className="font-medium text-gray-900">Управление комнатами</span>
                </div>
              </button>
              
              <button
                onClick={() => navigate("/settings")}
                className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg hover:from-purple-100 hover:to-pink-100 transition-colors duration-200"
              >
                <div className="flex items-center">
                  <Users className="w-5 h-5 text-purple-600 mr-3" />
                  <span className="font-medium text-gray-900">Загрузить карту офиса</span>
                </div>
              </button>
            </div>
          </div>

          {/* Upcoming Bookings */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Ближайшие бронирования</h3>
            <div className="space-y-3">
              {upcomingBookings.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Нет предстоящих бронирований</p>
              ) : (
                upcomingBookings.map((booking) => (
                  <div key={booking.id} className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <div className="p-2 bg-blue-100 rounded-lg mr-3">
                      <Clock className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{booking.title}</p>
                      <p className="text-sm text-gray-500">
                        {booking.room_name} • {new Date(booking.start_time).toLocaleString('ru-RU')}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            {upcomingBookings.length > 0 && (
              <button
                onClick={() => navigate("/bookings")}
                className="w-full mt-4 text-center text-blue-600 hover:text-blue-700 font-medium"
              >
                Посмотреть все бронирования
              </button>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
