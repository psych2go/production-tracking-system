<template>
  <view class="batch-card card" @click="$emit('click')">
    <view class="flex-between">
      <view class="flex-center">
        <text class="batch-no text-bold">
          {{ batch.batchNo }}
          <template v-if="isTrial">
            <text class="trial-label">试验</text>
          </template>
          <template v-else>
            {{ batch.product?.model || '' }}
          </template>
        </text>
        <view v-if="batch.priority === 'urgent'" class="urgent-tag">紧急</view>
      </view>
      <view v-if="isOverdue" class="overdue-badge">逾期</view>
    </view>

    <view v-if="isTrial && batch.trialContent" class="trial-preview mt-sm">
      <text class="text-sm text-secondary">{{ batch.trialContent }}</text>
    </view>
    <view v-if="isTrial && (trialQuantityDisplay || batch.packageType || currentStage)" class="batch-stats flex-between mt-xs">
      <view style="display:flex;flex-wrap:wrap;gap:8rpx;align-items:center;">
        <template v-if="batch.packageType">
          <view v-for="pt in batch.packageType.split(',')" :key="pt" class="package-tag">{{ pt.trim() }}</view>
        </template>
        <text v-if="trialQuantityDisplay" class="text-secondary">{{ trialQuantityDisplay }}</text>
      </view>
      <view class="flex-center" v-if="currentStage">
        <text class="text-primary">{{ currentStage }}</text>
      </view>
    </view>
    <view v-if="!isTrial" class="batch-info mt-sm">
      <template v-if="batch.packageType">
        <view v-for="pt in batch.packageType.split(',')" :key="pt" class="package-tag">{{ pt.trim() }}</view>
      </template>
    </view>
    <view v-if="!isTrial" class="batch-stats flex-between mt-xs">
      <text class="text-secondary">数量: {{ batch.quantity }}</text>
      <view class="flex-center">
        <text v-if="currentStage" class="text-primary">{{ currentStage }}</text>
        <text v-else class="text-secondary">待开始</text>
      </view>
    </view>
    <!-- Progress bar -->
    <view class="progress-bar mt-sm">
      <view class="progress-fill" :style="{ width: progressPercent + '%' }"></view>
    </view>
    <!-- Delivery hints -->
    <view v-if="!isTrial && (batch.customerDelivery || batch.productionDelivery) && batch.status === 'active'" class="delivery-hint mt-sm">
      <text class="text-sm text-secondary">
        <template v-if="batch.customerDelivery">客户交期: {{ formatDateShort(batch.customerDelivery) }}</template>
        <template v-if="batch.customerDelivery && batch.productionDelivery"> | </template>
        <template v-if="batch.productionDelivery">预计交期: {{ formatDateShort(batch.productionDelivery) }}</template>
      </text>
    </view>
    <view v-else-if="isTrial && batch.customerDelivery && batch.status === 'active'" class="delivery-hint mt-sm">
      <text class="text-sm text-secondary">
        要求完成时间: {{ formatDateShort(batch.customerDelivery) }}
      </text>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { Batch } from "../types";
import { computed } from "vue";
import { useAppStore } from "../store/app";
import { formatDateShort } from "../utils/format";

const props = defineProps<{ batch: Batch }>();
defineEmits<{ click: [] }>();

const isTrial = computed(() => props.batch.batchType === "trial");

const trialQuantityDisplay = computed(() => {
  if (!isTrial.value) return "";
  if (props.batch.quantityDetail) {
    try {
      const parsed = JSON.parse(props.batch.quantityDetail);
      const parts = Object.entries(parsed)
        .filter(([, v]) => Number(v) > 0)
        .map(([unit, val]) => `${val}${unit}`);
      if (parts.length > 0) return parts.join(" ");
    } catch { /* fallback */ }
  }
  return props.batch.quantity ? `${props.batch.quantity}` : "";
});

const appStore = useAppStore();

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
  const total = appStore.stages.length || 12;
  return Math.round((completed / total) * 100);
});

const isOverdue = computed(() => {
  if (!props.batch.customerDelivery || props.batch.status !== "active") return false;
  return new Date(props.batch.customerDelivery) < new Date();
});
</script>

<style scoped lang="scss">
.batch-card { padding: 24rpx; }
.batch-no { font-size: 32rpx; }
.batch-info { display: flex; flex-wrap: wrap; align-items: center; gap: 8rpx; }
.package-tag {
  font-size: 20rpx;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  background: #e8f4ff;
  color: #0083ff;
}
.batch-stats { font-size: 26rpx; }
.mt-xs { margin-top: 8rpx; }
.overdue-badge {
  font-size: 22rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  background: #fff2f0;
  color: #fa5151;
  border: 1rpx solid #fa5151;
}
.trial-label {
  font-size: 22rpx;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  background: #fff7e6;
  color: #ff9900;
  margin-left: 8rpx;
  vertical-align: middle;
}
.trial-preview {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
.delivery-hint {
  display: flex;
  justify-content: flex-end;
}
</style>
