<template>
  <view class="container">
    <!-- 区块切换 -->
    <view class="section-switch">
      <view class="switch-option" :class="{ active: activeSection === 'online' }" @click="activeSection = 'online'">
        <text class="switch-label">在线产品加工统计</text>
        <text class="switch-count">{{ onlineCount }}</text>
      </view>
      <view class="switch-option" :class="{ active: activeSection === 'yield' }" @click="activeSection = 'yield'">
        <text class="switch-label">良率统计</text>
        <text class="switch-count">{{ yieldRows.length }}</text>
      </view>
    </view>

    <!-- 在线产品加工统计 -->
    <view class="card" v-if="activeSection === 'online'">
      <view class="export-bar">
        <view class="export-left">
          <text class="export-title">在线产品加工统计</text>
          <text class="export-hint">按《高可靠在线产品在线加工统计表》格式展示，可导出 Excel</text>
        </view>
        <button class="btn-export" @click="onExport">导出 Excel</button>
      </view>
      <scroll-view scroll-x class="mt-sm" v-if="displayRows.length">
        <view class="online-table">
          <view class="online-header">
            <text class="online-col col-customer">客户代码</text>
            <text class="online-col col-customer-name">客户名称</text>
            <text class="online-col col-model">产品型号</text>
            <text class="online-col col-batch">生产批号</text>
            <text class="online-col col-order">订单编码</text>
            <text class="online-col col-pkg">封装形式</text>
            <text class="online-col col-qty">数量</text>
            <text class="online-col col-date">投产时间</text>
            <text class="online-col col-date">加工开始时间（镜检）</text>
            <text class="online-col col-date">客户要求交期</text>
            <text class="online-col col-date">生产预计交期</text>
            <text class="online-col col-stage">当前站点</text>
            <text class="online-col col-type">客户类型</text>
            <text class="online-col col-qty">已交付数量</text>
            <text class="online-col col-qty">未交付数量</text>
            <text class="online-col col-notes">备注</text>
          </view>
          <view v-for="batch in displayRows" :key="batch.id" class="online-row" @click="goBatchDetail(batch.id)">
            <text class="online-col col-customer">{{ batch.customerCode || '' }}</text>
            <text class="online-col col-customer-name">{{ batch.customerName || '' }}</text>
            <text class="online-col col-model">{{ batch.product?.model || '' }}</text>
            <text class="online-col col-batch">{{ batch.batchNo || '' }}</text>
            <text class="online-col col-order">{{ batch.orderNo || '' }}</text>
            <text class="online-col col-pkg">{{ batch.packageType || '' }}</text>
            <text class="online-col col-qty">{{ batch.quantity }}</text>
            <text class="online-col col-date">{{ formatDateCell(batch.startedAt) }}</text>
            <text class="online-col col-date">{{ formatDateCell(mirrorTime(batch)) }}</text>
            <text class="online-col col-date" :class="{ 'text-danger': isOverdueBatch(batch) }">{{ formatDateCell(batch.customerDelivery) }}</text>
            <text class="online-col col-date">{{ formatDateCell(batch.productionDelivery) }}</text>
            <text class="online-col col-stage">{{ currentStageName(batch) }}</text>
            <text class="online-col col-type">{{ customerTypeLabel(batch.customerType) }}</text>
            <text class="online-col col-qty">0</text>
            <text class="online-col col-qty">{{ batch.quantity }}</text>
            <text class="online-col col-notes">{{ batch.notes || '' }}</text>
          </view>
        </view>
      </scroll-view>
      <view v-else class="empty-chart">
        <text class="text-secondary">暂无在线批次</text>
      </view>
    </view>

    <!-- 良率统计 -->
    <view class="card" v-else>
      <view class="yield-bar">
        <view class="export-left">
          <text class="export-title">良率统计</text>
          <text class="export-hint">所内：上月16日-本月15日；所外：上月26日-本月25日</text>
        </view>
        <picker mode="month" :value="yieldMonth" @change="onYieldMonthChange">
          <view class="month-picker">{{ yieldMonth }} ▾</view>
        </picker>
        <button class="btn-export" @click="onExportYield">导出</button>
      </view>
      <text v-if="yieldSummary" class="yield-summary">共 {{ yieldRows.length }} 个批次，月良率 {{ yieldSummary.monthYield }}（目标 {{ yieldSummary.monthTarget }}）</text>
      <text v-if="unclassifiedCount" class="yield-unclassified">另有 {{ unclassifiedCount }} 条批次未纳入统计（{{ unclassifiedReason }}）</text>
      <scroll-view scroll-x class="mt-sm" v-if="yieldRows.length">
        <view class="online-table">
          <view class="online-header">
            <text class="online-col col-date">发货时间</text>
            <text class="online-col col-batch">生产批号</text>
            <text class="online-col col-customer">客户代码</text>
            <text class="online-col col-model">产品型号</text>
            <text class="online-col col-pkg">封装类型</text>
            <text class="online-col col-qty">上芯数</text>
            <text class="online-col col-qty">发货数</text>
            <text class="online-col col-qty">批次良率</text>
            <text class="online-col col-qty">单批次目标良率</text>
            <text class="online-col col-qty">月良率</text>
            <text class="online-col col-qty">目标月良率</text>
          </view>
          <view v-for="(row, i) in yieldRows" :key="`${row.batchNo}-${row.model}-${i}`" class="online-row">
            <text class="online-col col-date">{{ row.shippedDate }}</text>
            <text class="online-col col-batch">{{ row.batchNo }}</text>
            <text class="online-col col-customer">{{ row.customerCode }}</text>
            <text class="online-col col-model">{{ row.model }}</text>
            <text class="online-col col-pkg">{{ row.packageType }}</text>
            <text class="online-col col-qty">{{ row.dieQuantity }}</text>
            <text class="online-col col-qty">{{ row.shippedQuantity }}</text>
            <text class="online-col col-qty" :class="row.batchYield >= row.batchTarget ? 'yield-good' : 'yield-bad'">{{ pct(row.batchYield) }}</text>
            <text class="online-col col-qty">{{ pct(row.batchTarget) }}</text>
            <text class="online-col col-qty">{{ pct(yieldData?.monthYield) }}</text>
            <text class="online-col col-qty">{{ pct(yieldData?.monthTarget) }}</text>
          </view>
        </view>
      </scroll-view>
      <view v-else class="empty-chart">
        <text class="text-secondary">该月暂无发货数据</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { batchApi } from "../../api/modules";
import { api } from "../../api/index";
import { useAppStore } from "../../store/app";
import { useUserStore } from "../../store/user";
import { getCurrentStage, isOverdue as checkOverdue } from "../../utils/format";
import { CUSTOMER_TYPE_LABELS } from "../../utils/constants";
import type { Batch, ProgressRecord, ProcessStage } from "../../types";

const appStore = useAppStore();
const userStore = useUserStore();

const onlineBatches = ref<Batch[]>([]);
const onlineCount = computed(() => onlineBatches.value.length);
const activeSection = ref<"online" | "yield">("online");

const stageOrderMap = computed(() => new Map(appStore.stages.map((stage) => [stage.code, stage.stageOrder])));

function latestStageRecord(batch: Batch, code: string): ProgressRecord | undefined {
  return (batch.progressRecords || [])
    .filter((record) => record.status === "completed" && (record.stage as ProcessStage | undefined)?.code === code)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
}

function mirrorTime(batch: Batch): string {
  return latestStageRecord(batch, "in_process_inspection")?.createdAt || "";
}

function currentStageName(batch: Batch): string {
  // 待制卡/待投产无工序记录，直接显示业务状态
  if (batch.status === "pending_card") return "待制卡";
  if (batch.status === "pending") return "待投产";
  return getCurrentStage(batch)?.name || "未开始";
}

function formatDateCell(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : "";
}

function customerTypeLabel(type: string | null | undefined): string {
  return type ? CUSTOMER_TYPE_LABELS[type] || "" : "";
}

function isOverdueBatch(batch: Batch): boolean {
  return checkOverdue(batch.customerDelivery, batch.status);
}

// 在途：越接近完成的排前面（当前工序靠后优先），同工序按客户交期、创建时间；未开始的排在最后
const sortedActive = computed(() => {
  const list = [...onlineBatches.value];
  list.sort((a, b) => {
    const orderA = currentStageOrder(a);
    const orderB = currentStageOrder(b);
    if (orderA !== orderB) return orderB - orderA;
    const deliveryA = a.customerDelivery ? new Date(a.customerDelivery).getTime() : Number.MAX_SAFE_INTEGER;
    const deliveryB = b.customerDelivery ? new Date(b.customerDelivery).getTime() : Number.MAX_SAFE_INTEGER;
    if (deliveryA !== deliveryB) return deliveryA - deliveryB;
    return a.createdAt.localeCompare(b.createdAt);
  });
  return list;
});

function currentStageOrder(batch: Batch): number {
  const stage = getCurrentStage(batch);
  return stage ? stageOrderMap.value.get(stage.code) ?? -1 : -1;
}

const displayRows = computed(() => sortedActive.value);

interface YieldRow {
  shippedDate: string;
  batchNo: string;
  customerCode: string;
  model: string;
  packageType: string;
  dieQuantity: number;
  shippedQuantity: number;
  batchYield: number;
  batchTarget: number;
}
interface YieldStats {
  month: string;
  title: string;
  rows: YieldRow[];
  monthYield: number | null;
  monthTarget: number;
  unclassified: Array<{ batchNo: string; model: string; reason: string }>;
}

function defaultYieldMonth(): string {
  const d = new Date();
  const target = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}`;
}
const yieldMonth = ref(defaultYieldMonth());
const yieldData = ref<YieldStats | null>(null);
const yieldLoading = ref(false);
const yieldRows = computed(() => yieldData.value?.rows ?? []);
const yieldSummary = computed(() => {
  if (!yieldData.value?.monthYield) return null;
  return { monthYield: pct(yieldData.value.monthYield), monthTarget: pct(yieldData.value.monthTarget) };
});
const unclassifiedCount = computed(() => yieldData.value?.unclassified.length ?? 0);
const unclassifiedReason = computed(() => yieldData.value?.unclassified[0]?.reason ?? "");

function pct(value: number | null | undefined): string {
  return value == null ? "—" : `${(value * 100).toFixed(2)}%`;
}

async function loadYield() {
  yieldLoading.value = true;
  try {
    yieldData.value = await api.get<YieldStats>(`/api/statistics/yield?month=${yieldMonth.value}`);
  } catch (e: unknown) {
    uni.showToast({ title: (e as Error).message, icon: "none" });
  } finally {
    yieldLoading.value = false;
  }
}

function onYieldMonthChange(event: any) {
  yieldMonth.value = event.detail.value ?? yieldMonth.value;
  loadYield();
}

function onExportYield() {
  const token = userStore.token;
  const url = `/api/statistics/yield/export?month=${yieldMonth.value}`;
  // #ifdef H5
  fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    .then((res) => {
      if (!res.ok) throw new Error("导出失败");
      return res.blob();
    })
    .then((blob) => {
      const blobUrl = URL.createObjectURL(blob);
      try {
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = `高可靠项目良率统计${yieldMonth.value}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } finally {
        URL.revokeObjectURL(blobUrl);
      }
    })
    .catch(() => uni.showToast({ title: "导出失败", icon: "none" }));
  // #endif
  // #ifndef H5
  uni.downloadFile({
    url: `${api.getBaseUrl()}${url}`,
    header: { Authorization: `Bearer ${token}` },
    success: (res) => {
      if (res.statusCode !== 200) { uni.showToast({ title: "导出失败", icon: "none" }); return; }
      uni.openDocument({ filePath: res.tempFilePath, showMenu: true });
    },
    fail: () => uni.showToast({ title: "导出失败", icon: "none" }),
  });
  // #endif
}

async function loadData() {
  try {
    // 在线产品加工统计：已发货（已完成/已归档）之前的所有状态
    const [activeRes, pendingRes, pendingCardRes] = await Promise.all([
      batchApi.list({ status: "active", pageSize: 500 }),
      batchApi.list({ status: "pending", pageSize: 500 }),
      batchApi.list({ status: "pending_card", pageSize: 500 }),
    ]);
    onlineBatches.value = [...activeRes.items, ...pendingRes.items, ...pendingCardRes.items];
  } catch (e: unknown) {
    uni.showToast({ title: (e as Error).message, icon: "none" });
  }
}

function onExport() {
  const exportInfo = { url: "/api/statistics/export/excel" };
  const token = userStore.token;
  // #ifdef H5
  fetch(exportInfo.url, {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((res) => {
      if (!res.ok) throw new Error("导出失败");
      return res.blob();
    })
    .then((blob) => {
      const blobUrl = URL.createObjectURL(blob);
      try {
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = "在线产品加工统计表.xlsx";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } finally {
        URL.revokeObjectURL(blobUrl);
      }
    })
    .catch(() => uni.showToast({ title: "导出失败", icon: "none" }));
  // #endif
  // #ifndef H5
  uni.downloadFile({
    url: api.getBaseUrl() + exportInfo.url,
    header: { Authorization: `Bearer ${token}` },
    success: (res) => {
      if (res.statusCode === 200) {
        uni.openDocument({ filePath: res.tempFilePath, fileType: "xlsx" });
      } else {
        uni.showToast({ title: "导出失败", icon: "none" });
      }
    },
    fail: () => {
      uni.showToast({ title: "导出失败", icon: "none" });
    },
  });
  // #endif
}

function goBatchDetail(id: number) {
  uni.navigateTo({ url: `/pages/batch/detail?id=${id}` });
}

onMounted(async () => {
  await appStore.loadStages();
  loadData();
});

onShow(() => {
  loadData();
  loadYield();
});
</script>

<style scoped lang="scss">
.export-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  padding: 22rpx 24rpx;
  border-left: 6rpx solid #087f8c;
  border-bottom: 2rpx solid #edf0f0;
}

/* 区块切换 */
.section-switch {
  display: flex;
  gap: 12rpx;
  margin-bottom: 20rpx;
}
.switch-option {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  min-height: 92rpx;
  border-radius: 12rpx;
  background: #fff;
  border: 2rpx solid #dfe4e4;
  color: #657174;
  font-size: 26rpx;
  transition: all 0.15s ease;
  &.active {
    background: #087f8c;
    border-color: #087f8c;
    color: #fff;
    font-weight: 600;
    box-shadow: 0 6rpx 16rpx rgba(8, 127, 140, 0.25);
  }
}
.switch-label { white-space: nowrap; }
.switch-count {
  min-width: 34rpx;
  padding: 0 10rpx;
  border-radius: 999rpx;
  background: rgba(23, 35, 39, 0.08);
  font-size: 20rpx;
  text-align: center;
}
.switch-option.active .switch-count { background: rgba(255, 255, 255, 0.25); }
.export-left { flex: 1; margin-right: 20rpx; }
.export-title {
  display: block;
  color: #172327;
  font-size: 28rpx;
  font-weight: 700;
}
.export-hint {
  display: block;
  margin-top: 4rpx;
  font-size: 22rpx;
  color: #657174;
  line-height: 1.6;
}
.btn-export {
  min-height: 64rpx;
  font-size: 24rpx;
  font-weight: 600;
  padding: 8rpx 22rpx;
  background: #087f8c;
  color: #fff;
  border: none;
  border-radius: 7rpx;
  &::after { border: none; }
}

.yield-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  padding: 22rpx 24rpx;
  border-left: 6rpx solid #d97706;
  border-bottom: 2rpx solid #edf0f0;
}
.month-picker {
  padding: 10rpx 20rpx;
  border: 2rpx solid #dfe4e4;
  border-radius: 8rpx;
  background: #f5f7f7;
  color: #172327;
  font-size: 24rpx;
  white-space: nowrap;
}
.yield-summary {
  display: block;
  margin-top: 16rpx;
  color: #172327;
  font-size: 24rpx;
  font-weight: 600;
}
.yield-unclassified {
  display: block;
  margin-top: 8rpx;
  color: #d97706;
  font-size: 20rpx;
}
.yield-good { color: #27865f; }
.yield-bad { color: #c9483f; }

.empty-chart { text-align: center; padding: 60rpx 0; }

/* Statistics table */
.online-table {
  min-width: 2960rpx;
  border: 2rpx solid #dfe4e4;
  border-radius: 8rpx;
  overflow: hidden;
}
.online-header {
  display: flex;
  padding: 16rpx 0;
  border-bottom: 2rpx solid #dfe4e4;
  font-size: 22rpx;
  color: #485458;
  font-weight: 700;
  background: #edf0f0;
}
.online-row {
  display: flex;
  padding: 18rpx 0;
  border-bottom: 2rpx solid #edf0f0;
  font-size: 24rpx;
  &:last-child { border-bottom: none; }
  &:nth-child(odd) { background: #fafbfb; }
  &:active { background: #e6f4f3; }
}
.online-col {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  padding: 0 12rpx;
}
.col-customer { width: 120rpx; }
.col-customer-name { width: 130rpx; }
.col-model { width: 220rpx; }
.col-batch { width: 130rpx; }
.col-order { width: 180rpx; }
.col-pkg { width: 190rpx; }
.col-qty { width: 100rpx; }
.col-date { width: 170rpx; }
.col-stage { width: 130rpx; color: #087f8c; font-weight: 700; }
.col-type { width: 100rpx; }
.col-notes { width: 260rpx; justify-content: flex-start; }
</style>
