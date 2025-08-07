import { useAuth } from "@/react-app/components/SimpleAuth";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import Layout from "@/react-app/components/Layout";
import { Upload, MapPin, Image as ImageIcon, Check, AlertCircle } from "lucide-react";
import type { OfficeMap } from "@/shared/types";

export default function Settings() {
  const { user, isPending } = useAuth();
  const navigate = useNavigate();
  const [officeMap, setOfficeMap] = useState<OfficeMap | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"success" | "error" | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isPending && !user) {
      navigate("/");
      return;
    }

    if (user) {
      fetchOfficeMap();
    }
  }, [user, isPending, navigate]);

  const fetchOfficeMap = async () => {
    try {
      const response = await fetch("/api/office-map");
      if (response.ok) {
        const data = await response.json();
        setOfficeMap(data);
      }
    } catch (error) {
      console.error("Error fetching office map:", error);
    } finally {
      setLoading(false);
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

      const response = await fetch("/api/office-map", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        setUploadStatus("success");
        fetchOfficeMap();
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

  if (isPending || loading) {
    return (
      <Layout>
        <div className="animate-pulse">
          <div className="bg-gray-200 h-8 w-48 mb-6 rounded" />
          <div className="bg-gray-200 h-64 rounded-lg" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Настройки</h2>
          <p className="text-gray-600">Управление настройками системы бронирования</p>
        </div>

        {/* Office Map Upload */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center mb-4">
            <MapPin className="w-6 h-6 text-blue-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">Карта офиса</h3>
          </div>

          <p className="text-gray-600 mb-6">
            Загрузите план офиса в формате JPG или PNG для размещения переговорных комнат на карте.
          </p>

          {/* Current Map */}
          {officeMap && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Текущая карта:</h4>
              <div className="relative bg-gray-50 rounded-lg overflow-hidden border-2 border-gray-200">
                <img
                  src={officeMap.file_url}
                  alt="Current Office Map"
                  className="w-full h-64 object-contain"
                />
                <div className="absolute top-2 right-2 bg-green-100 text-green-800 px-2 py-1 rounded-lg text-xs font-medium">
                  Активна
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Файл: {officeMap.original_name} • Загружен {new Date(officeMap.created_at).toLocaleDateString('ru-RU')}
              </p>
            </div>
          )}

          {/* Upload Section */}
          {user?.role === 'admin' ? (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors duration-200">
            <div className="mx-auto w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
              <ImageIcon className="w-6 h-6 text-blue-600" />
            </div>
            
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              {officeMap ? "Обновить карту офиса" : "Загрузить карту офиса"}
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
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <Upload className="w-5 h-5 mr-2" />
              {uploading ? "Загрузка..." : "Выбрать файл"}
            </label>

            <p className="text-xs text-gray-500 mt-2">
              Поддерживаются форматы: JPG, PNG. Максимальный размер: 10МБ
            </p>
          </div>
          ) : (
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
              <div className="mx-auto w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                <ImageIcon className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-gray-600">
                Только администраторы могут изменять карту офиса.
              </p>
            </div>
          )}

          {/* Upload Status */}
          {user?.role === 'admin' && uploadStatus && (
            <div className={`mt-4 p-4 rounded-lg flex items-center ${
              uploadStatus === "success" 
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}>
              {uploadStatus === "success" ? (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  Карта офиса успешно загружена!
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

        {/* Additional Settings Placeholder */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Дополнительные настройки</h3>
          <p className="text-gray-600">
            В будущих версиях здесь можно будет настроить интеграцию с доменом Windows, 
            уведомления и другие параметры системы.
          </p>
        </div>

        {/* Info about Windows Domain */}
        <div className="bg-blue-50 border border-blue-200 p-6 rounded-xl">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            Интеграция с доменом Windows
          </h3>
          <p className="text-blue-800">
            В текущей версии используется аутентификация через Google. 
            Интеграция с доменом Windows может быть добавлена в следующих версиях системы 
            при необходимости настройки корпоративного доступа.
          </p>
        </div>
      </div>
    </Layout>
  );
}
