import { useAuth } from "@getmocha/users-service/react";
import { useEffect } from "react";
import { useNavigate } from "react-router";
import { Loader2 } from "lucide-react";

export default function AuthCallback() {
  const { exchangeCodeForSessionToken } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        await exchangeCodeForSessionToken();
        navigate("/dashboard");
      } catch (error) {
        console.error("Auth callback error:", error);
        navigate("/?error=auth_failed");
      }
    };

    handleCallback();
  }, [exchangeCodeForSessionToken, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="text-center">
        <div className="animate-spin mb-4 flex justify-center">
          <Loader2 className="w-10 h-10 text-blue-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Вход в систему...
        </h2>
        <p className="text-gray-600">
          Пожалуйста, подождите
        </p>
      </div>
    </div>
  );
}
