import axios from "axios";

const API = axios.create({
  baseURL: "https://lisence-system.onrender.com",

  headers: {
    "Content-Type": "application/json",
  },
});

API.interceptors.request.use((config) => {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken") ||
    (() => {
      try {
        const adminData = JSON.parse(localStorage.getItem("adminData") || "{}");
        return adminData?.token || adminData?.accessToken || null;
      } catch {
        return null;
      }
    })();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;