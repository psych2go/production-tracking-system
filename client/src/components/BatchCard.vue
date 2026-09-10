<template>
  <view class="batch-card card" @click="$emit('click')">
    <view v-if="hasAnomaly" class="batch-accent" :class="accentClass"></view>
    <view class="batch-card-main">
      <!-- 主行：批号 型号 + 风险徽标 + 状态 -->
      <view class="batch-heading">
        <text class="batch-title">{{ displayTitle }}</text>
        <view v-if="hasAnomaly" class="risk-row">
          <text v-if="urgent" class="risk-tag risk-urgent">紧急</text>
          <text v-if="isOverdue" class="risk-tag risk-overdue">逾期 {{ overdueDays }} 天</text>
          <text v-if="isPaused" class="risk-tag risk-paused">暂停中</text>
        </view>
        <view class="status-badge" :class="`status-${batch.status}`">{{ statusLabel }}</view>
      </view>

      <!-- 属性行：客户代码 · 封装形式 · 数量 -->
      <view class="meta-line">
        <text v-if="batch.customerCode" class="meta-item">{{ batch.customerCode }}</text>
        <text v-if="batch.packageType" class="meta-item">{{ batch.packageType }}</text>
        <text class="meta-item">{{ batch.quantity }}只</text>
      </view>

      <!-- 交期行 -->
      <view class="batch-footer">
        <view class="delivery-inline">
          <text class="delivery-item" :class="{ 'delivery-overdue': isOverdue }">客户要求交期：{{ customerDelivery }}</text>
          <text class="delivery-item">生产预计交期：{{ productionDelivery }}</text>
        </view>
      </view>

      <!-- 当前工序（仅加工中） -->
      <view v-if="batch.status === 'active'" class="stage-line">
        <text class="stage-label">当前工序</text>
        <text class="stage-value">{{ currentStageName }}</text>
      </view>

      <!-- 操作（位于暂停横幅上方） -->
      <view class="action-line">
        <view class="card-action" @click.stop="$emit('action')">
          <text>{{ actionLabel }}</text>
          <text class="action-arrow">›</text>
        </view>
      </view>

      <!-- 暂停原因（仅暂停时，完整显示） -->
      <view v-if="isPaused" class="paused-line">
        <text class="paused-line-text">暂停：{{ batch.pauseReason }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import type { Batch } from "../types";
import { STATUS_LABELS } from "../utils/constants";
import { useAppStore } from "../store/app";
import { formatDateShort, getCurrentStage, isOverdue as checkOverdue, getOverdueDays } from "../utils/format";

const props = defineProps<{ batch: Batch; isAdmin?: boolean }>();
defineEmits<{ click: []; action: [] }>();

const appStore = useAppStore();

const statusLabel = computed(() => STATUS_LABELS[props.batch.status] || props.batch.status);
const displayTitle = computed(() =>
  [props.batch.batchNo, props.batch.product?.model].filter(Boolean).join(" ") || "未填写产品型号"
);
const urgent = computed(() => props.batch.priority === "urgent");
const isOverdue = computed(() => checkOverdue(props.batch.customerDelivery, props.batch.status));
const overdueDays = computed(() => getOverdueDays(props.batch.customerDelivery));
const isPaused = computed(() => !!props.batch.pausedAt);
const hasAnomaly = computed(() => props.batch.status !== "cancelled" && (urgent.value || isOverdue.value || isPaused.value));
const accentClass = computed(() => ({
  urgent: urgent.value,
  overdue: isOverdue.value,
  paused: isPaused.value,
}));
const currentStageName = computed(
  () => getCurrentStage(props.batch)?.name || appStore.stages.find((s) => s.code !== "completed")?.name || "—"
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

onMounted(() => {
  if (!appStore.stages.length) appStore.loadStages().catch(() => {});
});
</script>

<style scoped lang="scss">
.batch-card {
  display: flex;
  padding: 0;
  overflow: hidden;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  &:active { transform: translateY(2rpx); }
}
/* 左侧色条仅异常批次显示：紧急=琥珀，逾期/暂停=红 */
.batch-accent {
  width: 6rpx;
  flex-shrink: 0;
  background: #d97706;
  &.overdue { background: #c9483f; }
  &.paused { background: #c9483f; }
}
.batch-card-main { width: 100%; min-width: 0; padding: 26rpx; }

/* 主行 */
.batch-heading { display: flex; justify-content: space-between; align-items: flex-start; gap: 48rpx; }
.batch-title {
  overflow: hidden;
  min-width: 0;
  flex: 1;
  color: #172327;
  font-size: 29rpx;
  font-weight: 700;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.risk-row { display: flex; flex-shrink: 0; flex-wrap: wrap; gap: 24rpx; }
.status-badge {
  flex-shrink: 0;
  padding: 4rpx 12rpx;
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

/* 属性行 */
.meta-line {
  display: flex;
  gap: 30rpx;
  overflow: hidden;
  margin-top: 26rpx;
  white-space: nowrap;
}
.meta-item {
  flex-shrink: 0;
  color: #7d898b;
  font-size: 20rpx;
  white-space: nowrap;
}

/* 当前工序行 */
.stage-line { display: flex; align-items: center; gap: 30rpx; margin-top: 26rpx; }
.stage-label {
  padding: 2rpx 10rpx;
  border-radius: 4rpx;
  background: #edf0f0;
  color: #7d898b;
  font-size: 18rpx;
}
.stage-value { color: #087f8c; font-size: 22rpx; font-weight: 600; }

/* 底行：交期 */
.batch-footer { display: flex; align-items: center; justify-content: flex-start; gap: 16rpx; margin-top: 30rpx; }
.delivery-inline { display: flex; min-width: 0; gap: 66rpx; overflow: hidden; }
.delivery-item { color: #7d898b; font-size: 20rpx; white-space: nowrap; }
.delivery-overdue { color: #c9483f; font-weight: 600; }
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
.action-line { display: flex; justify-content: flex-end; margin-top: 24rpx; }

/* 风险徽标 */
.risk-tag {
  padding: 2rpx 10rpx;
  border-radius: 4rpx;
  font-size: 19rpx;
  font-weight: 600;
}
.risk-urgent { background: #fff3df; color: #9a5a00; }
.risk-overdue { background: #fcecea; color: #c9483f; }
.risk-paused { background: #fcecea; color: #c9483f; }

/* 暂停横幅 */
.paused-line {
  margin-top: 24rpx;
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
