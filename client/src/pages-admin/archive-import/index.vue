<template>
  <view class="container">
    <view class="card">
      <text class="section-title text-bold">归档数据导入</text>
      <text class="page-desc">批量补填已完成批次的归档数据（上芯数、发货数、发货日期），导入后对应批次自动变为已归档。</text>

      <view class="step-list mt-md">
        <view class="step-item">
          <text class="step-num">1</text>
          <text class="step-text">下载导入模板，系统已预填所有待归档批次的批号、型号、订单数量</text>
        </view>
        <view class="step-item">
          <text class="step-num">2</text>
          <text class="step-text">在 Excel 中填写三列数据：上芯数（正整数）、发货数（不大于上芯数）、发货日期（格式 2026-09-10，不晚于今天）</text>
        </view>
        <view class="step-item">
          <text class="step-num">3</text>
          <text class="step-text">上传填写好的文件，系统逐行校验后批量归档，并反馈成功/失败明细</text>
        </view>
      </view>

      <button class="btn btn-outline btn-block mt-md" :loading="downloading" @click="downloadTemplate">下载导入模板</button>
      <button class="btn btn-primary btn-block mt-md" :loading="uploading" @click="chooseFile">选择文件并导入</button>

      <view v-if="result" class="result-card mt-md" :class="{ 'result-error': result.failedCount > 0 }">
        <text class="result-summary">
          导入完成：成功 {{ result.successCount }} 条，跳过 {{ result.skippedCount }} 条（已归档），失败 {{ result.failedCount }} 条
        </text>
        <view v-for="(f, i) in result.failures" :key="i" class="result-fail-item">
          <text>第 {{ f.row }} 行（{{ f.batchNo }}）：{{ f.reason }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useUserStore } from "../../store/user";
import { api } from "../../api";

interface ImportResult {
  successCount: number;
  skippedCount: number;
  failedCount: number;
  failures: Array<{ row: number; batchNo: string; reason: string }>;
}

const userStore = useUserStore();
const BASE_URL = api.getBaseUrl();
const downloading = ref(false);
const uploading = ref(false);
const result = ref<ImportResult | null>(null);

function authHeader(): Record<string, string> {
  return { Authorization: userStore.token ? `Bearer ${userStore.token}` : "" };
}

async function downloadTemplate() {
  downloading.value = true;
  try {
    const res: any = await uni.request({
      url: `${BASE_URL}/api/batches/archive-template`,
      method: "GET",
      responseType: "arraybuffer",
      header: authHeader(),
    });
    if (res.statusCode !== 200) throw new Error("模板下载失败，请重试");
    // #ifdef H5
    const blob = new Blob([res.data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "归档数据导入模板.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    // #endif
    // #ifdef MP-WEIXIN
    const wxAny = (globalThis as any).wx;
    const filePath = `${wxAny.env.USER_DATA_PATH}/archive_template.xlsx`;
    wxAny.getFileSystemManager().writeFile({
      filePath,
      data: res.data,
      success: () => {
        uni.openDocument({ filePath, fileType: "xlsx", showMenu: true });
      },
      fail: () => uni.showToast({ title: "保存文件失败", icon: "none" }),
    });
    // #endif
  } catch (e: unknown) {
    uni.showToast({ title: (e as Error).message || "模板下载失败", icon: "none" });
  } finally {
    downloading.value = false;
  }
}

function chooseFile() {
  // #ifdef H5
  // uni-app H5 会把模板里的 <input> 编译成 uni-input 组件，ref.click() 无法触发文件选择，
  // 因此点击时动态创建原生 input（每次新建也保证选同一个文件能重复触发 change）
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".xlsx";
  input.style.display = "none";
  document.body.appendChild(input);
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    input.remove();
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      uni.showToast({ title: "请上传 .xlsx 格式的 Excel 文件", icon: "none" });
      return;
    }
    uploadH5(file);
  });
  input.click();
  // #endif
  // #ifdef MP-WEIXIN
  const wxAny = (globalThis as any).wx;
  wxAny.chooseMessageFile({
    count: 1,
    type: "file",
    extension: ["xlsx"],
    success: (res: { tempFiles: Array<{ path: string; name: string }> }) => {
      const file = res.tempFiles[0];
      if (file && !file.name.toLowerCase().endsWith(".xlsx")) {
        uni.showToast({ title: "请上传 .xlsx 格式的 Excel 文件", icon: "none" });
        return;
      }
      if (file) uploadMp(file.path);
    },
  });
  // #endif
}

// #ifdef H5
async function uploadH5(file: File) {
  uploading.value = true;
  result.value = null;
  try {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${BASE_URL}/api/batches/archive-import`, {
      method: "POST",
      headers: authHeader(),
      body: form,
    });
    const data = (await res.json()) as ImportResult & { error?: string };
    if (!res.ok) throw new Error(data.error || `导入失败 (${res.status})`);
    result.value = data;
  } catch (e: unknown) {
    uni.showModal({ title: "导入失败", content: (e as Error).message, showCancel: false });
  } finally {
    uploading.value = false;
  }
}
// #endif

// #ifdef MP-WEIXIN
function uploadMp(filePath: string) {
  uploading.value = true;
  result.value = null;
  uni.uploadFile({
    url: `${BASE_URL}/api/batches/archive-import`,
    filePath,
    name: "file",
    header: authHeader(),
    success: (res) => {
      try {
        const data = JSON.parse(res.data) as ImportResult & { error?: string };
        if (res.statusCode >= 400) throw new Error(data.error || `导入失败 (${res.statusCode})`);
        result.value = data;
      } catch (e: unknown) {
        uni.showModal({ title: "导入失败", content: (e as Error).message, showCancel: false });
      }
    },
    fail: (err) => {
      uni.showModal({ title: "导入失败", content: err.errMsg || "上传失败", showCancel: false });
    },
    complete: () => {
      uploading.value = false;
    },
  });
}
// #endif
</script>

<style scoped lang="scss">
.page-desc {
  display: block;
  margin-top: 8rpx;
  color: #7d898b;
  font-size: 22rpx;
  line-height: 1.6;
}
.step-list { display: flex; flex-direction: column; gap: 16rpx; }
.step-item { display: flex; align-items: flex-start; gap: 14rpx; }
.step-num {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36rpx;
  height: 36rpx;
  flex-shrink: 0;
  border-radius: 50%;
  background: #e6f4f3;
  color: #087f8c;
  font-size: 20rpx;
  font-weight: 700;
}
.step-text { color: #657174; font-size: 22rpx; line-height: 1.6; }
.result-card {
  padding: 20rpx 24rpx;
  border-left: 6rpx solid #27865f;
  border-radius: 8rpx;
  background: #e6f3ec;
  &.result-error { border-left-color: #c9483f; background: #fcecea; }
}
.result-summary { color: #172327; font-size: 24rpx; font-weight: 600; }
.result-fail-item {
  margin-top: 10rpx;
  color: #c9483f;
  font-size: 21rpx;
  line-height: 1.5;
}
.mt-md { margin-top: 24rpx; }
</style>
