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
      <view>
        <view v-if="batch.packageType" style="display:flex;flex-wrap:wrap;gap:8rpx;align-items:center;">
          <view v-for="pt in batch.packageType.split(',')" :key="pt" class="package-tag">{{ pt.trim() }}</view>
        </view>
        <text v-if="trialQuantityDisplay" class="text-secondary">{{ trialQuantityDisplay }}</text>
      </view>
      <view class="flex-center">
        <text v-if="currentStage" class="text-primary">{{ currentStage }}</text>
        <text v-else class="text-secondary">待开始</text>
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
import { formatDateShort, getCurrentStage, isOverdue as checkOverdue } from "../utils/format";

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

const currentStage = computed(() => getCurrentStage(props.batch)?.name ?? null);

const isOverdue = computed(() => checkOverdue(props.batch.customerDelivery, props.batch.status));
</script>

<style scoped lang="scss">
.batch-card { padding: 24rpx; }
.batch-no { font-size: 32rpx; }
.batch-info { display: flex; flex-wrap: wrap; align-items: center; gap: 8rpx; }
.package-tag {
  font-size: 20rpx;
  padding: 3rpx 12rpx;
  border-radius: 6rpx;
  background: #e8f4ff;
  color: #0083ff;
}
.batch-stats { font-size: 26rpx; }
.mt-xs { margin-top: 8rpx; }
.overdue-badge {
  font-size: 22rpx;
  padding: 4rpx 14rpx;
  border-radius: 8rpx;
  background: #ffecec;
  color: #fa5151;
  border: 2rpx solid #fa5151;
  font-weight: 500;
}
.trial-label {
  font-size: 22rpx;
  padding: 3rpx 12rpx;
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
.delivery-hint {
  display: flex;
  justify-content: flex-end;
}
</style>
