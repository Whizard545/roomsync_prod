import { useAuth } from "@getmocha/users-service/react";
import { useEffect } from "react";
import { useNavigate } from "react-router";
import { Building2, Calendar, MapPin, Users, ArrowRight, Loader2 } from "lucide-react";

export default function Home() {
  const { user, isPending, redirectToLogin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="animate-spin">
          <Loader2 className="w-10 h-10 text-blue-600" />
        </div>
      </div>
    );
  }

  if (user) {
    return null; // Redirect happens in useEffect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="text-center">
            <div className="flex justify-center mb-8">
              <div className="p-4 bg-white rounded-2xl shadow-lg ring-1 ring-black/5">
                <Building2 className="w-12 h-12 text-blue-600" />
              </div>
            </div>
            <h1 className="text-5xl font-bold text-gray-900 mb-6 tracking-tight">
              Room<span className="text-blue-600">Sync</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Современная система бронирования переговорных комнат с интерактивной картой офиса
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={redirectToLogin}
                className="group inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Войти через Google
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Всё что нужно для управления переговорными
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Простое и удобное решение для бронирования комнат с визуальной картой офиса
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center group">
              <div className="inline-flex p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl mb-6 group-hover:scale-110 transition-transform duration-200">
                <Calendar className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Простое бронирование
              </h3>
              <p className="text-gray-600">
                Быстро забронируйте переговорную на нужное время с проверкой на конфликты
              </p>
            </div>

            <div className="text-center group">
              <div className="inline-flex p-4 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl mb-6 group-hover:scale-110 transition-transform duration-200">
                <MapPin className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Интерактивная карта
              </h3>
              <p className="text-gray-600">
                Загрузите план офиса и размещайте комнаты прямо на карте
              </p>
            </div>

            <div className="text-center group">
              <div className="inline-flex p-4 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl mb-6 group-hover:scale-110 transition-transform duration-200">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Управление комнатами
              </h3>
              <p className="text-gray-600">
                Добавляйте комнаты, указывайте вместимость и оборудование
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex justify-center items-center mb-4">
              <Building2 className="w-6 h-6 text-blue-600 mr-2" />
              <span className="text-lg font-semibold text-gray-900">RoomSync</span>
            </div>
            <p className="text-gray-600">
              Система бронирования переговорных комнат
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
