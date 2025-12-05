import axios, { InternalAxiosRequestConfig } from "axios";
import * as SecureStore from "expo-secure-store";

// YOUR LOCAL IP
const BASE_URL = "http://192.168.31.147:8040/api";

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Interceptor to add token
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await SecureStore.getItemAsync("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
