<template>
  <view class="batch-card card" @click="$emit('click')">
    <view class="batch-accent" :class="accentClass"></view>
    <view class="batch-card-main">
      <view class="batch-heading">
        <view class="batch-identity">
          <text v-if="batch.orderNo" class="order-no">订单 {{ batch.orderNo }}</text>
          <text class="batch-title">{{ displayTitle }}</text>
        </view>
        <view class="batch-statuses">
          <view v-if="batch.priority === 'urgent'" class="urgent-tag">紧急</view>
          <view v-if="isPaused" class="paused-tag">暂停中</view>
          <view v-if="isOverdue" class="overdue-badge">逾期</view>
          <view class="status-badge" :class="`status-${batch.status}`">{{ statusLabel }}</view>
        </view>
      </view>

      <view v-if="isPaused" class="paused-line">
        <text class="paused-line-text">暂停：{{ batch.pauseReason }}</text>
      </view>

      <text class="customer-code">{{ batch.customerCode || '' }}</text>

      <view class="batch-metrics" :class="{ 'two-columns': batch.status !== 'active' }">
        <view class="metric">
          <text class="metric-label">数量</text>
          <text class="metric-value">{{ batch.quantity }}只</text>
        </view>
        <view class="metric metric-border">
          <text class="metric-label">封装形式</text>
          <text class="metric-value">{{ batch.packageType || '' }}</text>
        </view>
        <view v-if="batch.status === 'active'" class="metric metric-border">
          <text class="metric-label">当前工序</text>
          <text class="metric-value stage-value">{{ currentStage || '未开始' }}</text>
        </view>
      </view>

      <view class="batch-footer">
        <view class="delivery-lines">
          <text class="delivery-line">客户交期：{{ customerDelivery }}</text>
          <text class="delivery-line">预计交期：{{ productionDelivery }}</text>
        </view>
        <view class="card-action" @click.stop="$emit('action')">
          <text>{{ actionLabel }}</text>
          <text class="action-arrow">›</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Batch } from "../types";
import { STATUS_LABELS } from "../utils/constants";
import { formatDateShort, getCurrentStage, isOverdue as checkOverdue } from "../utils/format";

const props = defineProps<{ batch: Batch; isAdmin?: boolean }>();
defineEmits<{ click: []; action: [] }>();

const statusLabel = computed(() => STATUS_LABELS[props.batch.status] || props.batch.status);
const currentStage = computed(() => getCurrentStage(props.batch)?.name ?? null);
const isOverdue = computed(() => checkOverdue(props.batch.customerDelivery, props.batch.status));
const isPaused = computed(() => !!props.batch.pausedAt);
const displayTitle = computed(() =>
  [props.batch.batchNo, props.batch.product?.model].filter(Boolean).join(" ") || "未填写产品型号"
);
const customerDelivery = computed(() =>
  props.batch.customerDelivery ? formatDateShort(props.batch.customerDelivery) : ""
);
const productionDelivery = computed(() =>
  props.batch.productionDelivery ? formatDateShort(props.batch.productionDelivery) : ""
);
const actionLabel = computed(() => {
  if (props.isAdmin && props.batch.status === "pending_card") return "去制卡";
  if (props.isAdmin && props.batch.status === "pending") return "投入加工";
  if (props.isAdmin && props.batch.status === "completed") return "归档";
  return "查看详情";
});
const accentClass = computed(() => ({
  urgent: props.batch.priority === "urgent",
  overdue: isOverdue.value,
  paused: isPaused.value,
  cancelled: props.batch.status === "cancelled",
}));
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
  &.paused { background: #c9483f; }
  &.cancelled { background: #aab4b5; }
}
.batch-card-main { width: 100%; min-width: 0; padding: 22rpx; }
.batch-heading { display: flex; justify-content: space-between; align-items: flex-start; gap: 14rpx; }
.batch-identity { display: flex; min-width: 0; flex: 1; flex-direction: column; }
.order-no { color: #7d898b; font-size: 20rpx; }
.batch-title {
  overflow: hidden;
  margin-top: 3rpx;
  color: #172327;
  font-size: 30rpx;
  font-weight: 700;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.batch-statuses { display: flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: 6rpx; }
.status-badge {
  padding: 4rpx 10rpx;
  border-radius: 5rpx;
  background: #edf0f0;
  color: #657174;
  font-size: 19rpx;
  font-weight: 600;
}
.status-pending_card { background: #fff3df; color: #9a5a00; }
.status-pending { background: #e6f4f3; color: #075e68; }
.status-active { background: #e8f2ff; color: #0067c7; }
.status-completed { background: #e6f3ec; color: #27865f; }
.status-cancelled { background: #f1f2f2; color: #7d898b; }
.customer-code { display: block; margin-top: 9rpx; color: #657174; font-size: 22rpx; }
.batch-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-top: 16rpx;
  padding: 14rpx 0;
  border-top: 2rpx solid #edf0f0;
  border-bottom: 2rpx solid #edf0f0;
  &.two-columns { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
.metric { display: flex; min-width: 0; padding: 0 12rpx; flex-direction: column; }
.metric:first-child { padding-left: 0; }
.metric-border { border-left: 2rpx solid #edf0f0; }
.metric-label { color: #7d898b; font-size: 19rpx; }
.metric-value {
  overflow: hidden;
  margin-top: 2rpx;
  color: #2c383c;
  font-size: 23rpx;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.stage-value { color: #087f8c; }
.batch-footer { display: flex; align-items: flex-end; justify-content: space-between; gap: 16rpx; margin-top: 14rpx; }
.delivery-lines { display: flex; min-width: 0; flex: 1; flex-direction: column; }
.delivery-line { min-height: 30rpx; color: #7d898b; font-size: 20rpx; }
.card-action {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  padding: 8rpx 12rpx;
  border-radius: 6rpx;
  background: #e6f4f3;
  color: #075e68;
  font-size: 21rpx;
  font-weight: 600;
}
.action-arrow { margin-left: 5rpx; font-size: 30rpx; line-height: 1; }
.overdue-badge {
  padding: 4rpx 9rpx;
  border-radius: 5rpx;
  background: #fcecea;
  color: #c9483f;
  font-size: 19rpx;
  font-weight: 700;
}
.paused-tag {
  padding: 4rpx 9rpx;
  border-radius: 5rpx;
  background: #c9483f;
  color: #fff;
  font-size: 19rpx;
  font-weight: 700;
}
.paused-line {
  margin-top: 10rpx;
  padding: 10rpx 14rpx;
  border-left: 5rpx solid #c9483f;
  border-radius: 6rpx;
  background: #fcecea;
}
.paused-line-text {
  color: #c9483f;
  font-size: 21rpx;
  font-weight: 600;
}
</style>
