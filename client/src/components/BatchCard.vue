<template>
  <view class="batch-card card" @click="$emit('click')">
    <view class="batch-accent" :class="{ urgent: batch.priority === 'urgent', overdue: isOverdue }"></view>
    <view class="batch-card-main">
      <view class="batch-heading">
        <view class="batch-identity">
          <text class="batch-no">{{ batch.batchNo }}</text>
          <text class="batch-model">{{ batch.product?.model || '未填写型号' }}</text>
        </view>
        <view class="batch-statuses">
          <view v-if="batch.priority === 'urgent'" class="urgent-tag">紧急</view>
          <view v-if="isOverdue" class="overdue-badge">逾期</view>
        </view>
      </view>

      <view class="batch-info">
        <template v-if="batch.packageType">
          <view v-for="pt in batch.packageType.split(',')" :key="pt" class="package-tag">{{ pt.trim() }}</view>
        </template>
      </view>

      <view class="batch-metrics">
        <view class="metric">
          <text class="metric-label">加工数量</text>
          <text class="metric-value">{{ batch.quantity }}</text>
        </view>
        <view class="metric metric-stage">
          <text class="metric-label">当前工序</text>
          <text v-if="currentStage" class="metric-value stage-value">{{ currentStage }}</text>
          <text v-else class="metric-value muted">待开始</text>
        </view>
      </view>

      <view v-if="(batch.customerDelivery || batch.productionDelivery) && batch.status === 'active'" class="delivery-hint">
        <text>
          <template v-if="batch.customerDelivery">客户 {{ formatDateShort(batch.customerDelivery) }}</template>
          <template v-if="batch.customerDelivery && batch.productionDelivery"> · </template>
          <template v-if="batch.productionDelivery">预计 {{ formatDateShort(batch.productionDelivery) }}</template>
        </text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { Batch } from "../types";
import { computed } from "vue";
import { formatDateShort, getCurrentStage, isOverdue as checkOverdue } from "../utils/format";

const props = defineProps<{ batch: Batch }>();
defineEmits<{ click: [] }>();

const currentStage = computed(() => getCurrentStage(props.batch)?.name ?? null);

const isOverdue = computed(() => checkOverdue(props.batch.customerDelivery, props.batch.status));
</script>

<style scoped lang="scss">
.batch-card {
  display: flex;
  padding: 0;
  overflow: hidden;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  &:active { transform: translateY(2rpx); }
}
.batch-accent {
  width: 8rpx;
  flex-shrink: 0;
  background: #087f8c;
  &.urgent { background: #d97706; }
  &.overdue { background: #c9483f; }
}
.batch-card-main {
  width: 100%;
  min-width: 0;
  padding: 24rpx;
}
.batch-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16rpx;
}
.batch-identity {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.batch-no {
  color: #172327;
  font-size: 31rpx;
  font-weight: 700;
  line-height: 1.2;
}
.batch-model {
  margin-top: 6rpx;
  color: #657174;
  font-size: 24rpx;
}
.batch-statuses { display: flex; align-items: center; }
.batch-info {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8rpx;
  margin-top: 18rpx;
}
.package-tag {
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
  background: #e6f4f3;
  color: #075e68;
  font-weight: 600;
}
.batch-metrics {
  display: grid;
  grid-template-columns: 1fr 1.4fr;
  margin-top: 20rpx;
  padding-top: 18rpx;
  border-top: 2rpx solid #edf0f0;
}
.metric {
  display: flex;
  flex-direction: column;
}
.metric-stage {
  padding-left: 24rpx;
  border-left: 2rpx solid #edf0f0;
}
.metric-label {
  color: #7d898b;
  font-size: 20rpx;
}
.metric-value {
  margin-top: 3rpx;
  color: #2c383c;
  font-size: 27rpx;
  font-weight: 700;
}
.stage-value { color: #087f8c; }
.muted { color: #7d898b; font-weight: 500; }
.overdue-badge {
  margin-left: 8rpx;
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
  background: #fcecea;
  color: #c9483f;
  font-weight: 700;
}
.delivery-hint {
  display: flex;
  margin-top: 16rpx;
  padding: 10rpx 14rpx;
  background: #f5f7f7;
  border-radius: 6rpx;
  color: #657174;
  font-size: 21rpx;
}
</style>
