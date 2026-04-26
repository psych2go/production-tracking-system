import { defineStore } from "pinia";
import { ref } from "vue";
import type { User } from "../types";
import { authApi } from "../api/modules";

export const useUserStore = defineStore("user", () => {
  const token = ref<string>("");
  const userInfo = ref<User | null>(null);
  const isLoggedIn = ref(false);

  async function checkAuth() {
    const savedToken = uni.getStorageSync("token");
    if (savedToken) {
      token.value = savedToken;
      isLoggedIn.value = true;
      try {
        const user = await authApi.getMe();
        userInfo.value = user;
      } catch {
        logout();
      }
    }
  }

  async function devLogin() {
    const res = await authApi.devLogin();
    token.value = res.token;
    userInfo.value = res.user;
    isLoggedIn.value = true;
    uni.setStorageSync("token", res.token);
  }

  async function passwordLogin(password: string) {
    const res = await authApi.passwordLogin(password);
    token.value = res.token;
    userInfo.value = res.user;
    isLoggedIn.value = true;
    uni.setStorageSync("token", res.token);
  }

  async function wwLogin(code: string) {
    const res = await authApi.wwCallback(code);
    token.value = res.token;
    userInfo.value = res.user;
    isLoggedIn.value = true;
    uni.setStorageSync("token", res.token);
  }

  function logout() {
    token.value = "";
    userInfo.value = null;
    isLoggedIn.value = false;
    uni.removeStorageSync("token");
  }

  function isAdmin() {
    return userInfo.value?.role === "admin";
  }

  return { token, userInfo, isLoggedIn, checkAuth, devLogin, passwordLogin, wwLogin, logout, isAdmin };
});
