import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import api from "../services/api";
import { ApiResponse, LoginResponseData, User } from "../types/auth";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (u: string, p: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkLogin();
  }, []);

  const checkLogin = async () => {
    try {
      const userData = await AsyncStorage.getItem("user_data");
      const token = await SecureStore.getItemAsync("access_token");
      if (userData && token) {
        setUser(JSON.parse(userData));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      const res = await api.post<ApiResponse<LoginResponseData>>(
        "/auth/login",
        { username, password }
      );

      if (res.data.success) {
        const { access_token, refresh_token, user } = res.data.data;

        await SecureStore.setItemAsync("access_token", access_token);
        await SecureStore.setItemAsync("refresh_token", refresh_token);
        await AsyncStorage.setItem("user_data", JSON.stringify(user));

        setUser(user);

        // Redirect Logic
        const roleNames = user.roles.map((r) => r.name);
        if (roleNames.some((r) => ["superadmin", "coordinator"].includes(r))) {
          router.replace("../coordinator/dashboard");
        } else if (roleNames.includes("picker")) {
          router.replace("../picker/dashboard");
        }
      }
    } catch (error: any) {
      alert(
        "Login Failed: " + (error.response?.data?.message || error.message)
      );
    }
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync("access_token");
    await SecureStore.deleteItemAsync("refresh_token");
    await AsyncStorage.clear();
    setUser(null);
    router.replace("/");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
