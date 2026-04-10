<template>
  <view class="batch-card card" @click="$emit('click')">
    <view class="flex-between">
      <text class="batch-no text-bold">{{ batch.batchNo }}</text>
      <view class="priority-tag" :class="'priority-' + batch.priority">
        {{ getPriorityLabel(batch.priority) }}
      </view>
    </view>
    <view class="batch-info mt-sm">
      <text class="text-secondary">{{ batch.product?.model || '-' }}</text>
      <text class="text-secondary ml-sm">{{ batch.product?.name || '' }}</text>
    </view>
    <view class="batch-stats flex-between mt-sm">
      <text>数量: {{ batch.quantity }}</text>
      <text v-if="currentStage" class="text-primary">当前: {{ currentStage }}</text>
      <text v-else class="text-secondary">待开始</text>
    </view>
    <!-- Progress bar -->
    <view class="progress-bar mt-sm">
      <view class="progress-fill" :style="{ width: progressPercent + '%' }"></view>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { Batch } from "../types";
import { computed } from "vue";
import { useAppStore } from "../store/app";

const props = defineProps<{ batch: Batch }>();
defineEmits<{ click: [] }>();

const appStore = useAppStore();

function getPriorityLabel(priority: string): string {
  const labels: Record<string, string> = { urgent: "紧急", high: "高", normal: "", low: "低" };
  return labels[priority] || "";
}

const currentStage = computed(() => {
  if (!props.batch.progressRecords?.length) return null;
  const latest = props.batch.progressRecords
    .filter((r) => r.status === "completed")
    .sort((a, b) => (b.stage?.stageOrder ?? 0) - (a.stage?.stageOrder ?? 0))[0];
  return latest?.stage?.name ?? null;
});

const progressPercent = computed(() => {
  if (!props.batch.progressRecords?.length) return 0;
  const completed = props.batch.progressRecords.filter((r) => r.status === "completed").length;
  const total = appStore.stages.length || 12; // dynamic fallback to 12
  return Math.round((completed / total) * 100);
});
</script>

<style scoped lang="scss">
.batch-card { padding: 24rpx; }
.batch-no { font-size: 32rpx; }
.batch-info { display: flex; gap: 8rpx; }
.batch-stats { font-size: 26rpx; }
.priority-tag {
  font-size: 22rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  &.priority-urgent { background: #fa5151; color: #fff; }
  &.priority-high { background: #ff9900; color: #fff; }
  &.priority-low { background: #e5e5e5; color: #666; }
}
.progress-bar {
  height: 8rpx;
  background: #e5e5e5;
  border-radius: 4rpx;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: #07c160;
  border-radius: 4rpx;
  transition: width 0.3s;
}
</style>
