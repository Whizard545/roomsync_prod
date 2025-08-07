import { useAuth } from "@/react-app/components/SimpleAuth";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import Layout from "@/react-app/components/Layout";
import { 
  Shield, 
  Users, 
  MapPin, 
  Upload, 
  Plus, 
  Edit, 
  Trash2, 
  Monitor, 
  Image as ImageIcon,
  Check,
  AlertCircle,
  Crown,
  User
} from "lucide-react";
import type { Room, OfficeMap } from "@/shared/types";

interface UserRole {
  id: number;
  user_id: string;
  user_email: string;
  role: string;
  granted_by?: string;
  granted_at: string;
}

interface AdminStats {
  totalUsers: number;
  totalRooms: number;
  totalBookings: number;
  activeBookingsToday: number;
}

export default function Admin() {
  const { user, isPending } = useAuth();
  const navigate = useNavigate();
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [officeMap, setOfficeMap] = useState<OfficeMap | null>(null);
  const [activeTab, setActiveTab] = useState<"users" | "rooms" | "office">("users");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalRooms: 0,
    totalBookings: 0,
    activeBookingsToday: 0
  });

  // Modals states
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"success" | "error" | null>(null);

  useEffect(() => {
    if (!isPending && !user) {
      navigate("/");
      return;
    }

    if (user) {
      checkAdminAccess();
    }
  }, [user, isPending, navigate]);

  const checkAdminAccess = async () => {
    try {
      const response = await fetch("/api/admin/check-access");
      if (response.ok) {
        setIsAdmin(true);
        fetchAdminData();
      } else {
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Error checking admin access:", error);
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminData = async () => {
    try {
      const [usersRes, roomsRes, mapRes, statsRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/rooms"),
        fetch("/api/admin/office-map"),
        fetch("/api/admin/stats")
      ]);

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUserRoles(usersData);
      }

      if (roomsRes.ok) {
        const roomsData = await roomsRes.json();
        setRooms(roomsData);
      }

      if (mapRes.ok) {
        const mapData = await mapRes.json();
        setOfficeMap(mapData);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error("Error fetching admin data:", error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadStatus("error");
      return;
    }

    setUploading(true);
    setUploadStatus(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch("/api/admin/office-map", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        setUploadStatus("success");
        fetchAdminData();
      } else {
        setUploadStatus("error");
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      setUploadStatus("error");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteRoom = async (roomId: number) => {
    if (!confirm("Вы уверены, что хотите удалить эту комнату?")) return;

    try {
      const response = await fetch(`/api/admin/rooms/${roomId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchAdminData();
      }
    } catch (error) {
      console.error("Error deleting room:", error);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const response = await fetch("/api/admin/users/role", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });

      if (response.ok) {
        fetchAdminData();
      }
    } catch (error) {
      console.error("Error changing user role:", error);
    }
  };

  if (isPending || loading) {
    return (
      <Layout>
        <div className="animate-pulse">
          <div className="bg-gray-200 h-8 w-48 mb-6 rounded" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-gray-200 h-32 rounded-lg" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center">
          <Shield className="w-8 h-8 text-purple-600 mr-3" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Администрирование</h2>
            <p className="text-gray-600">Управление системой, пользователями и ресурсами</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 bg-blue-50 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Всего пользователей</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 bg-green-50 rounded-lg">
                <MapPin className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Всего комнат</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalRooms}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 bg-purple-50 rounded-lg">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Всего бронирований</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalBookings}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 bg-orange-50 rounded-lg">
                <Shield className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Активных сегодня</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeBookingsToday}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: "users", label: "Пользователи", icon: Users },
              { key: "rooms", label: "Комнаты", icon: MapPin },
              { key: "office", label: "План офиса", icon: ImageIcon },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? "border-purple-500 text-purple-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <tab.icon className="w-5 h-5 mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "users" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Управление пользователями</h3>
              <button
                onClick={() => setShowAddAdmin(true)}
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors duration-200"
              >
                <Plus className="w-5 h-5 mr-2" />
                Добавить администратора
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Пользователь
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Роль
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Назначил
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Дата назначения
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Действия
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {userRoles.map((userRole) => (
                      <tr key={userRole.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-3">
                              <User className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-sm font-medium text-gray-900">
                              {userRole.user_email}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            userRole.role === 'admin' 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {userRole.role === 'admin' && <Crown className="w-3 h-3 mr-1" />}
                            {userRole.role === 'admin' ? 'Администратор' : 'Пользователь'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {userRole.granted_by || 'Система'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(userRole.granted_at).toLocaleDateString('ru-RU')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <select
                            value={userRole.role}
                            onChange={(e) => handleRoleChange(userRole.user_id, e.target.value)}
                            className="text-sm border border-gray-300 rounded-md px-2 py-1"
                          >
                            <option value="user">Пользователь</option>
                            <option value="admin">Администратор</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "rooms" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Управление комнатами</h3>
              <button
                onClick={() => setShowAddRoom(true)}
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors duration-200"
              >
                <Plus className="w-5 h-5 mr-2" />
                Добавить комнату
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rooms.map((room) => (
                <div key={room.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <div className="p-2 bg-purple-50 rounded-lg mr-3">
                        <MapPin className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">{room.name}</h4>
                        {room.description && (
                          <p className="text-sm text-gray-600">{room.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <button className="p-1 text-gray-400 hover:text-purple-600">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteRoom(room.id)}
                        className="p-1 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "office" && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Управление планом офиса</h3>

            {/* Current Map */}
            {officeMap && (
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h4 className="text-md font-medium text-gray-900 mb-3">Текущий план:</h4>
                <div className="relative bg-gray-50 rounded-lg overflow-hidden border-2 border-gray-200">
                  <img
                    src={officeMap.file_url}
                    alt="Current Office Map"
                    className="w-full h-64 object-contain"
                  />
                  <div className="absolute top-2 right-2 bg-green-100 text-green-800 px-2 py-1 rounded-lg text-xs font-medium">
                    Активен
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Файл: {officeMap.original_name} • Загружен {new Date(officeMap.created_at).toLocaleDateString('ru-RU')}
                </p>
              </div>
            )}

            {/* Upload Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-400 transition-colors duration-200">
                <div className="mx-auto w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center mb-4">
                  <ImageIcon className="w-6 h-6 text-purple-600" />
                </div>
                
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  {officeMap ? "Обновить план офиса" : "Загрузить план офиса"}
                </h4>
                
                <p className="text-gray-600 mb-4">
                  Перетащите файл сюда или нажмите для выбора
                </p>

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                  id="office-map-upload"
                />
                
                <label
                  htmlFor="office-map-upload"
                  className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white transition-colors duration-200 cursor-pointer ${
                    uploading 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-purple-600 hover:bg-purple-700'
                  }`}
                >
                  <Upload className="w-5 h-5 mr-2" />
                  {uploading ? "Загрузка..." : "Выбрать файл"}
                </label>

                <p className="text-xs text-gray-500 mt-2">
                  Поддерживаются форматы: JPG, PNG. Максимальный размер: 10МБ
                </p>
              </div>

              {/* Upload Status */}
              {uploadStatus && (
                <div className={`mt-4 p-4 rounded-lg flex items-center ${
                  uploadStatus === "success" 
                    ? "bg-green-50 text-green-800 border border-green-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}>
                  {uploadStatus === "success" ? (
                    <>
                      <Check className="w-5 h-5 mr-2" />
                      План офиса успешно загружен!
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-5 h-5 mr-2" />
                      Произошла ошибка при загрузке файла. Попробуйте снова.
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modals */}
        {showAddRoom && (
          <AddRoomModal
            onClose={() => setShowAddRoom(false)}
            onSuccess={() => {
              setShowAddRoom(false);
              fetchAdminData();
            }}
          />
        )}

        {showAddAdmin && (
          <AddAdminModal
            onClose={() => setShowAddAdmin(false)}
            onSuccess={() => {
              setShowAddAdmin(false);
              fetchAdminData();
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

      const response = await fetch("/api/admin/rooms", {
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors duration-200"
            >
              {loading ? "Создание..." : "Создать"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Add Admin Modal Component
function AddAdminModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role: "admin" }),
      });

      if (response.ok) {
        onSuccess();
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Ошибка при добавлении администратора");
      }
    } catch (error) {
      setError("Произошла ошибка. Попробуйте снова.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Добавить администратора</h3>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email пользователя *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@company.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Пользователь должен сначала войти в систему
            </p>
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
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors duration-200"
            >
              {loading ? "Добавление..." : "Добавить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
