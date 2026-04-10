import { useUserStore } from "../store/user";

const BASE_URL = "";

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
          userStore.logout();
          uni.reLaunch({ url: "/pages/index/index" });
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
