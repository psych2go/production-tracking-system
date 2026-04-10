<template>
  <view class="container" v-if="batch">
    <!-- Batch info -->
    <view class="card">
      <view class="flex-between">
        <text class="text-lg text-bold">{{ batch.batchNo }}</text>
        <view class="status-tag" :style="{ color: getStatusColor(batch.status) }">
          {{ statusLabel(batch.status) }}
        </view>
      </view>
      <view class="info-grid mt-md">
        <text class="text-secondary">型号</text>
        <text>{{ batch.product?.model }}</text>
        <text class="text-secondary">产品名称</text>
        <text>{{ batch.product?.name || '-' }}</text>
        <text class="text-secondary">加工数量</text>
        <text>{{ batch.quantity }}</text>
        <text class="text-secondary">优先级</text>
        <text>{{ priorityLabel(batch.priority) }}</text>
        <text class="text-secondary">创建时间</text>
        <text>{{ formatDate(batch.createdAt) }}</text>
        <text class="text-secondary">备注</text>
        <text>{{ batch.notes || '-' }}</text>
      </view>
    </view>

    <!-- Stage progress -->
    <view class="card mt-md">
      <text class="section-title text-bold">工序进度</text>
      <StageTimeline
        v-if="appStore.stages.length"
        :stages="appStore.stages"
        :progressRecords="batch.progressRecords || []"
      />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { useAppStore } from "../../store/app";
import { batchApi } from "../../api/modules";
import type { Batch } from "../../types";
import StageTimeline from "../../components/StageTimeline.vue";

const appStore = useAppStore();
const batch = ref<Batch | null>(null);

function statusLabel(status: string) {
  const labels: Record<string, string> = { active: "活跃", completed: "已完成", archived: "已归档" };
  return labels[status] || status;
}

function priorityLabel(priority: string) {
  const labels: Record<string, string> = { urgent: "紧急", normal: "普通" };
  return labels[priority] || priority;
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = { completed: "#07c160", active: "#0083ff", archived: "#999" };
  return colors[status] || "#999";
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

onLoad(async (query) => {
  if (query?.id) {
    try {
      batch.value = await batchApi.get(Number(query.id));
    } catch (e: unknown) {
      uni.showToast({ title: (e as Error).message, icon: "none" });
    }
  }
});
</script>

<style scoped lang="scss">
.info-grid {
  display: grid;
  grid-template-columns: 160rpx 1fr;
  gap: 16rpx 24rpx;
  font-size: 28rpx;
}
.section-title {
  font-size: 32rpx;
  margin-bottom: 12rpx;
}
</style>
