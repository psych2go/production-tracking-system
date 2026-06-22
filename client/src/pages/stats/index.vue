<template>
  <view class="container">
    <!-- Export button -->
    <view class="card export-bar">
      <view class="export-left">
        <text class="export-hint">统计规则：统计在线产品的详细信息及当前工序</text>
      </view>
      <button class="btn-export" @click="onExport">导出 Excel</button>
    </view>

    <!-- Online product batches -->
    <view class="card">
      <text class="section-title text-bold">在线产品</text>
      <scroll-view scroll-x class="mt-sm" v-if="onlineProducts.length">
        <view class="online-table">
          <view class="online-header">
            <text class="online-col online-col-no">生产批号</text>
            <text class="online-col online-col-model">产品型号</text>
            <text class="online-col online-col-qty">数量</text>
            <text class="online-col online-col-pkg">封装形式</text>
            <text class="online-col online-col-customer">客户代码</text>
            <text class="online-col online-col-order">订单编号</text>
            <text class="online-col online-col-priority">优先级</text>
            <text class="online-col online-col-delivery">客户要求交期</text>
            <text class="online-col online-col-delivery">生产预计交期</text>
            <text class="online-col online-col-stage">当前工序</text>
            <text class="online-col online-col-notes">备注</text>
            <text class="online-col online-col-date">创建时间</text>
          </view>
          <view v-for="batch in onlineProducts" :key="batch.id" class="online-row" @click="goBatchDetail(batch.id)">
            <text class="online-col online-col-no">{{ batch.batchNo }}</text>
            <text class="online-col online-col-model">{{ batch.product?.model || '-' }}</text>
            <text class="online-col online-col-qty">{{ batch.quantity }}</text>
            <text class="online-col online-col-pkg">{{ batch.packageType || '-' }}</text>
            <text class="online-col online-col-customer">{{ batch.customerCode || '-' }}</text>
            <text class="online-col online-col-order">{{ batch.orderNo || '-' }}</text>
            <text class="online-col online-col-priority">
              <text v-if="batch.priority === 'urgent'" class="urgent-tag">紧急</text>
              <text v-else>普通</text>
            </text>
            <text class="online-col online-col-delivery">{{ batch.customerDelivery ? batch.customerDelivery.slice(0, 10) : '-' }}</text>
            <text class="online-col online-col-delivery">{{ batch.productionDelivery ? batch.productionDelivery.slice(0, 10) : '-' }}</text>
            <text class="online-col online-col-stage">{{ getBatchStageName(batch) }}</text>
            <text class="online-col online-col-notes">{{ batch.notes || '-' }}</text>
            <text class="online-col online-col-date">{{ batch.createdAt.slice(0, 10) }}</text>
          </view>
        </view>
      </scroll-view>
      <view v-else class="empty-chart">
        <text class="text-secondary">暂无在线产品批次</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { statsApi, batchApi } from "../../api/modules";
import { useAppStore } from "../../store/app";
import { useUserStore } from "../../store/user";
import { getCurrentStage } from "../../utils/format";
import type { Batch } from "../../types";

const appStore = useAppStore();
const userStore = useUserStore();

const onlineBatches = ref<Batch[]>([]);
const onlineProducts = computed(() => onlineBatches.value);

function getBatchStageName(batch: Batch): string {
  return getCurrentStage(batch)?.name || '未开始';
}

function onExport() {
  const exportInfo = statsApi.exportExcel("online", {});
  const token = userStore.token;
  // #ifdef H5
  // Use fetch + blob to avoid leaking token in URL
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
        a.download = "online_report.xlsx";
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
    url: exportInfo.url,
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

async function loadData() {
  try {
    const res = await batchApi.list({ status: "active", pageSize: 500 });
    onlineBatches.value = res.items;
  } catch (e: unknown) {
    uni.showToast({ title: (e as Error).message, icon: "none" });
  }
}

onMounted(async () => {
  await appStore.loadStages();
  loadData();
});

function goBatchDetail(id: number) {
  uni.navigateTo({ url: `/pages/batch/detail?id=${id}` });
}
</script>

<style scoped lang="scss">
.export-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 24rpx;
}
.export-left { flex: 1; margin-right: 20rpx; }
.export-hint {
  font-size: 22rpx;
  color: #999;
  line-height: 1.6;
}
.btn-export {
  font-size: 24rpx;
  padding: 8rpx 24rpx;
  background: #0083ff;
  color: #fff;
  border: none;
  border-radius: 8rpx;
}
.section-title { font-size: 32rpx; }
.empty-chart { text-align: center; padding: 60rpx 0; }

/* Online table */
.online-table {
  min-width: 1100rpx;
}
.online-header {
  display: flex;
  padding: 14rpx 0;
  border-bottom: 2rpx solid #e5e5e5;
  font-size: 22rpx;
  color: #999;
  background: #fafafa;
}
.online-row {
  display: flex;
  padding: 18rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
  font-size: 24rpx;
  &:last-child { border-bottom: none; }
  &:active { background: #f5f5f5; }
}
.online-col {
  flex-shrink: 0;
  padding: 0 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.online-col-no { width: 180rpx; justify-content: flex-start; font-weight: 500; }
.online-col-model { width: 220rpx; }
.online-col-qty { width: 100rpx; }
.online-col-pkg { width: 200rpx; }
.online-col-customer { width: 140rpx; }
.online-col-order { width: 160rpx; }
.online-col-priority { width: 100rpx; }
.online-col-delivery { width: 180rpx; }
.online-col-stage { width: 140rpx; color: #0083ff; font-weight: 500; }
.online-col-notes { width: 200rpx; justify-content: flex-start; }
.online-col-date { width: 160rpx; }
</style>
