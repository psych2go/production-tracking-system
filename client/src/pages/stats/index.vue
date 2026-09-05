<template>
  <view class="container">
    <!-- Export button -->
    <view class="card export-bar">
      <view class="export-left">
        <text class="export-title">在线产品加工统计</text>
        <text class="export-hint">按《高可靠在线产品在线加工统计表》格式展示，可导出 Excel</text>
      </view>
      <button class="btn-export" @click="onExport">导出 Excel</button>
    </view>

    <!-- Scope toggle -->
    <view class="scope-switch card">
      <view
        v-for="tab in scopeTabs"
        :key="tab.value"
        class="scope-option"
        :class="{ active: scope === tab.value }"
        @click="scope = tab.value"
      >
        <text>{{ tab.label }}</text>
        <text class="scope-count">{{ tab.value === 'active' ? activeCount : shippedCount }}</text>
      </view>
    </view>

    <!-- Statistics table -->
    <view class="card">
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
            <text class="online-col col-date">{{ scope === 'active' ? '生产预计交期' : '已发货日期' }}</text>
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
            <text class="online-col col-date">{{ scope === 'active' ? formatDateCell(batch.productionDelivery) : formatDateCell(shipDate(batch)) }}</text>
            <text class="online-col col-stage">{{ scope === 'active' ? currentStageName(batch) : '已发货' }}</text>
            <text class="online-col col-type">{{ customerTypeLabel(batch.customerType) }}</text>
            <text class="online-col col-qty">{{ scope === 'active' ? 0 : '/' }}</text>
            <text class="online-col col-qty">{{ scope === 'active' ? batch.quantity : '/' }}</text>
            <text class="online-col col-notes">{{ batch.notes || '' }}</text>
          </view>
        </view>
      </scroll-view>
      <view v-else class="empty-chart">
        <text class="text-secondary">{{ scope === 'active' ? '暂无在线加工批次' : '暂无已发货批次' }}</text>
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

const scopeTabs: Array<{ label: string; value: "active" | "shipped" }> = [
  { label: "在途", value: "active" },
  { label: "已发货", value: "shipped" },
];
const scope = ref<"active" | "shipped">("active");
const activeBatches = ref<Batch[]>([]);
const shippedBatches = ref<Batch[]>([]);
const activeCount = computed(() => activeBatches.value.length);
const shippedCount = computed(() => shippedBatches.value.length);

const stageOrderMap = computed(() => new Map(appStore.stages.map((stage) => [stage.code, stage.stageOrder])));

function latestStageRecord(batch: Batch, code: string): ProgressRecord | undefined {
  return (batch.progressRecords || [])
    .filter((record) => record.status === "completed" && (record.stage as ProcessStage | undefined)?.code === code)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
}

function mirrorTime(batch: Batch): string {
  return latestStageRecord(batch, "in_process_inspection")?.createdAt || "";
}

function shipDate(batch: Batch): string {
  return latestStageRecord(batch, "completed")?.createdAt || "";
}

function currentStageName(batch: Batch): string {
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

// 在途：越接近完成的排前面（当前工序靠后优先），同工序按客户交期、创建时间
const sortedActive = computed(() => {
  const list = [...activeBatches.value];
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

// 已发货：最近发货的排前面
const sortedShipped = computed(() => {
  const list = [...shippedBatches.value];
  list.sort((a, b) => {
    const shipA = shipDate(a) || a.updatedAt;
    const shipB = shipDate(b) || b.updatedAt;
    return shipB.localeCompare(shipA);
  });
  return list;
});

const displayRows = computed(() => (scope.value === "active" ? sortedActive.value : sortedShipped.value));

async function loadData() {
  try {
    const [activeRes, completedRes, archivedRes] = await Promise.all([
      batchApi.list({ status: "active", pageSize: 500 }),
      batchApi.list({ status: "completed", pageSize: 500 }),
      batchApi.list({ status: "archived", pageSize: 500 }),
    ]);
    activeBatches.value = activeRes.items;
    shippedBatches.value = [...completedRes.items, ...archivedRes.items];
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
});
</script>

<style scoped lang="scss">
.export-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22rpx 24rpx;
  border-left: 6rpx solid #087f8c;
}
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

.scope-switch {
  display: flex;
  padding: 8rpx;
  gap: 8rpx;
}
.scope-option {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  min-height: 68rpx;
  border-radius: 8rpx;
  color: #657174;
  font-size: 26rpx;
  &.active { background: #087f8c; color: #fff; font-weight: 600; }
}
.scope-count {
  min-width: 36rpx;
  padding: 0 8rpx;
  border-radius: 5rpx;
  background: rgba(23, 35, 39, 0.08);
  font-size: 20rpx;
  text-align: center;
}
.scope-option.active .scope-count { background: rgba(255, 255, 255, 0.22); }

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
