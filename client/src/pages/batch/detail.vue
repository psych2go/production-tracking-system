<template>
  <view class="container" v-if="batch">
    <!-- Batch info -->
    <view class="card">
      <view class="flex-between">
        <view class="flex-center">
          <text class="text-lg text-bold">
            {{ batch.batchNo }}
            <template v-if="isTrial">
              <text class="trial-tag">试验</text>
            </template>
            <template v-else>
              {{ batch.product?.model || '' }}
            </template>
          </text>
          <view v-if="batch.priority === 'urgent'" class="urgent-tag">急</view>
        </view>
        <view class="status-tag" :style="{ color: getStatusColor(batch.status) }">
          {{ statusLabel(batch.status) }}
        </view>
      </view>

      <!-- Overdue warning -->
      <view v-if="isOverdue" class="overdue-warning mt-sm">
        <text class="text-sm">已超过期望交期 {{ overdueDays }} 天</text>
      </view>

      <!-- Trial batch fields -->
      <view v-if="isTrial" class="info-grid mt-md">
        <text class="text-secondary">试验内容</text>
        <text>{{ batch.trialContent || '-' }}</text>
        <text class="text-secondary">封装形式</text>
        <view v-if="batch.packageType" class="tag-list">
          <text v-for="pt in batch.packageType.split(',')" :key="pt" class="info-tag">{{ pt.trim() }}</text>
        </view>
        <text v-else>-</text>
        <text class="text-secondary">要求完成时间</text>
        <text :class="isOverdue ? 'text-danger' : ''">
          {{ batch.expectedDelivery ? formatDateShort(batch.expectedDelivery) : '-' }}
          <text v-if="isOverdue" class="text-sm"> (已逾期)</text>
        </text>
        <text class="text-secondary">创建时间</text>
        <text>{{ formatDate(batch.createdAt) }}</text>
        <text class="text-secondary">备注</text>
        <text>{{ batch.notes || '-' }}</text>
      </view>

      <!-- Product batch fields -->
      <view v-else class="info-grid mt-md">
        <text class="text-secondary">产品型号</text>
        <text>{{ batch.product?.model || '-' }}</text>
        <text class="text-secondary">加工数量</text>
        <text>{{ batch.quantity }}</text>
        <text class="text-secondary">客户代码</text>
        <text>{{ batch.customerCode || '-' }}</text>
        <text class="text-secondary">订单编号</text>
        <text>{{ batch.orderNo || '-' }}</text>
        <text class="text-secondary">封装形式</text>
        <text>{{ batch.packageType || '-' }}</text>
        <text class="text-secondary">交期</text>
        <text :class="isOverdue ? 'text-danger' : ''">
          {{ batch.expectedDelivery ? formatDateShort(batch.expectedDelivery) : '-' }}
          <text v-if="isOverdue" class="text-sm"> (已逾期)</text>
        </text>
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

    <!-- Quick actions -->
    <view v-if="batch.status === 'active'" class="card mt-md">
      <button class="btn-primary" @click="goRecordProgress">
        工序流转
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { useAppStore } from "../../store/app";
import { batchApi } from "../../api/modules";
import { STATUS_LABELS } from "../../utils/constants";
import { formatDate, formatDateShort } from "../../utils/format";
import type { Batch } from "../../types";
import StageTimeline from "../../components/StageTimeline.vue";

const appStore = useAppStore();
const batch = ref<Batch | null>(null);

const isTrial = computed(() => batch.value?.batchType === "trial");

function statusLabel(status: string) {
  return STATUS_LABELS[status] || status;
}

function priorityLabel(priority: string) {
  return appStore.getPriorityLabel(priority);
}

function getStatusColor(status: string): string {
  return appStore.getStatusColor(status);
}

const isOverdue = computed(() => {
  if (!batch.value?.expectedDelivery || batch.value.status !== "active") return false;
  return new Date(batch.value.expectedDelivery) < new Date();
});

const overdueDays = computed(() => {
  if (!batch.value?.expectedDelivery) return 0;
  const diff = Date.now() - new Date(batch.value.expectedDelivery).getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

function goRecordProgress() {
  if (!batch.value) return;
  // Switch to progress entry tab and pass batch info
  uni.switchTab({
    url: "/pages/progress/entry",
    success: () => {
      // Use eventChannel or storage to pass batch id
      uni.setStorageSync("pendingBatchId", batch.value!.id);
    }
  });
}

onLoad(async (query) => {
  if (query?.id) {
    try {
      batch.value = await batchApi.get(Number(query.id));
    } catch (e: unknown) {
      uni.showToast({ title: "加载失败", icon: "none" });
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
.overdue-warning {
  padding: 12rpx 20rpx;
  background: #fff2f0;
  border-radius: 8rpx;
  border-left: 6rpx solid #fa5151;
  color: #fa5151;
}
.trial-tag {
  font-size: 24rpx;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  background: #fff7e6;
  color: #ff9900;
  margin-left: 8rpx;
  vertical-align: middle;
}
.btn-primary {
  background: #0083ff;
  color: #fff;
  border: none;
  border-radius: 12rpx;
  padding: 24rpx 0;
  font-size: 32rpx;
  text-align: center;
  min-height: 88rpx;
}
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  align-items: center;
}
.info-tag {
  font-size: 24rpx;
  padding: 4rpx 14rpx;
  border-radius: 6rpx;
  background: #e8f4ff;
  color: #0083ff;
}
</style>
