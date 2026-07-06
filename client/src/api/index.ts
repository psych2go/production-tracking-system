import { useUserStore } from "../store/user";

// H5 走 vite proxy 用相对路径；小程序等非 H5 端需绝对地址（打包前改为实际服务端地址）
let BASE_URL = "";
// #ifndef H5
BASE_URL = "http://127.0.0.1:3000"; // TODO: 打包小程序前改为实际服务端地址
// #endif

// 401 登出 single-flight 标记，防止并发 401 多次触发登出/跳转
let isLoggingOut = false;

interface RequestOptions {
  url: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  data?: unknown;
}

function request<T>({ url, method = "GET", data }: RequestOptions): Promise<T> {
  const userStore = useUserStore();

  return new Promise((resolve, reject) => {
    uni.request({
      url: `${BASE_URL}${url}`,
      method,
      data: data as Record<string, unknown>,
      header: {
        "Content-Type": "application/json",
        Authorization: userStore.token ? `Bearer ${userStore.token}` : "",
      },
      success: (res) => {
        if (res.statusCode === 401) {
          // single-flight：多个并发请求同时 401 时只触发一次登出+跳转
          if (userStore.isLoggedIn && !isLoggingOut) {
            isLoggingOut = true;
            userStore.logout();
            uni.reLaunch({
              url: "/pages/index/index",
              complete: () => { isLoggingOut = false; },
            });
          }
          reject(new Error("登录已过期，请重新登录"));
          return;
        }
        if (res.statusCode >= 400) {
          const errData = res.data as { error?: string };
          reject(new Error(errData.error || `请求失败 (${res.statusCode})`));
          return;
        }
        resolve(res.data as T);
      },
      fail: (err) => {
        reject(new Error(err.errMsg || "网络请求失败"));
      },
    });
  });
}

export const api = {
  get: <T>(url: string) => request<T>({ url }),
  post: <T>(url: string, data?: unknown) => request<T>({ url, method: "POST", data }),
  put: <T>(url: string, data?: unknown) => request<T>({ url, method: "PUT", data }),
  delete: <T>(url: string) => request<T>({ url, method: "DELETE" }),
  getBaseUrl: () => BASE_URL,
};
