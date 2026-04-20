<template>
  <view class="container">
    <!-- Stage selector -->
    <view class="card stage-bar">
      <scroll-view scroll-x class="stage-scroll">
        <view
          v-for="stage in stages"
          :key="stage.id"
          class="stage-chip"
          :class="{ active: selectedStageId === stage.id }"
          @click="selectStage(stage.id)"
        >
          {{ stage.name }}
        </view>
      </scroll-view>
    </view>

    <!-- Action bar (admin only, shown when stage selected and has items) -->
    <view v-if="userStore.isAdmin() && selectedStageId && queue.length" class="card action-bar">
      <text class="action-hint">{{ editing ? '点击箭头调整顺序' : '点击「修改」调整加工顺序' }}</text>
      <view class="action-btn" :class="editing ? 'action-btn-confirm' : 'action-btn-edit'" @click="toggleEdit">
        {{ editing ? '确认' : '修改' }}
      </view>
    </view>

    <!-- Queue list -->
    <view v-if="queue.length" class="queue-list">
      <view
        v-for="item in queue"
        :key="item.batchId"
        class="card queue-item"
        :class="{ editing }"
      >
        <view class="queue-left">
          <view class="order-badge" :class="{ 'order-badge-editing': editing }">{{ item.orderNum }}</view>
        </view>

        <view class="queue-center" @click="!editing && goDetail(item.batchId)">
          <view class="batch-header">
            <text class="text-bold">{{ item.batch.batchNo }}</text>
            <text v-if="item.batch.product?.model" class="ml-sm">{{ item.batch.product.model }}</text>
            <view v-if="item.batch.priority === 'urgent'" class="urgent-tag">紧急</view>
            <view v-if="item.batch.batchType === 'trial'" class="trial-tag">试验</view>
          </view>
          <view v-if="item.batch.batchType === 'trial' && item.batch.trialContent" class="mt-sm">
            <text class="text-sm text-secondary trial-content">{{ item.batch.trialContent }}</text>
          </view>
          <view class="batch-meta mt-sm">
            <text v-if="item.batch.batchType === 'product'" class="text-sm text-secondary">数量: {{ item.batch.quantity }}</text>
            <text v-if="item.batch.packageType" class="text-sm text-secondary">{{ item.batch.packageType }}</text>
            <text v-if="item.batch.customerDelivery" class="text-sm text-secondary">客户交期: {{ formatDate(item.batch.customerDelivery) }}</text>
          </view>
        </view>

        <view v-if="editing" class="queue-arrows">
          <view
            class="arrow-btn"
            :class="{ disabled: item.orderNum === 1 }"
            @click="move(item.batchId, 'up')"
          >
            <text>&#9650;</text>
          </view>
          <view
            class="arrow-btn"
            :class="{ disabled: item.orderNum === queue.length }"
            @click="move(item.batchId, 'down')"
          >
            <text>&#9660;</text>
          </view>
        </view>
      </view>
    </view>

    <view v-else class="card text-center mt-lg">
      <text class="text-secondary">{{ selectedStageId ? '当前工序无待排单批次' : '请选择工序' }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { useUserStore } from "../../store/user";
import { useAppStore } from "../../store/app";
import { scheduleApi } from "../../api/modules";
import type { ScheduleItem, ProcessStage } from "../../types";

const userStore = useUserStore();
const appStore = useAppStore();

const stages = ref<ProcessStage[]>([]);
const selectedStageId = ref<number | null>(null);
const queue = ref<ScheduleItem[]>([]);
const editing = ref(false);

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  return dateStr.slice(0, 10);
}

function toggleEdit() {
  editing.value = !editing.value;
}

async function selectStage(stageId: number) {
  selectedStageId.value = stageId;
  editing.value = false;
  await loadQueue();
}

async function loadQueue() {
  if (!selectedStageId.value) return;
  try {
    queue.value = await scheduleApi.getQueue(selectedStageId.value);
  } catch (e: unknown) {
    uni.showToast({ title: (e as Error).message, icon: "none" });
  }
}

async function move(batchId: number, direction: "up" | "down") {
  if (!selectedStageId.value) return;
  try {
    queue.value = await scheduleApi.reorder(selectedStageId.value, batchId, direction);
  } catch (e: unknown) {
    uni.showToast({ title: (e as Error).message, icon: "none" });
  }
}

function goDetail(id: number) {
  uni.navigateTo({ url: `/pages/batch/detail?id=${id}` });
}

onLoad(async (options) => {
  // Load stages
  const allStages = await appStore.loadStages();
  stages.value = allStages;

  // Auto-select stage if provided
  if (options?.stageId) {
    const stageId = parseInt(options.stageId, 10);
    if (!isNaN(stageId)) {
      await selectStage(stageId);
    }
  }
});
</script>

<style scoped lang="scss">
.stage-bar {
  padding: 16rpx 20rpx;
}
.stage-scroll {
  white-space: nowrap;
}
.stage-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12rpx 28rpx;
  border-radius: 24rpx;
  font-size: 26rpx;
  color: #666;
  background: #f5f5f5;
  margin-right: 16rpx;
  min-height: 60rpx;
  &.active {
    background: #0083ff;
    color: #fff;
  }
}
.action-bar {
  margin-top: 16rpx;
  padding: 16rpx 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.action-hint {
  font-size: 24rpx;
  color: #999;
}
.action-btn {
  padding: 10rpx 36rpx;
  border-radius: 24rpx;
  font-size: 26rpx;
  font-weight: 500;
}
.action-btn-edit {
  background: #0083ff;
  color: #fff;
}
.action-btn-confirm {
  background: #07c160;
  color: #fff;
}
.queue-list {
  margin-top: 16rpx;
}
.queue-item {
  display: flex;
  align-items: center;
  padding: 24rpx;
  gap: 20rpx;
  transition: all 0.2s;
  &.editing {
    border-left: 6rpx solid #0083ff;
    padding-left: 18rpx;
  }
}
.queue-left {
  flex-shrink: 0;
}
.order-badge {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: #0083ff;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26rpx;
  font-weight: 600;
  transition: all 0.2s;
}
.order-badge-editing {
  background: #ff9900;
}
.queue-center {
  flex: 1;
  min-width: 0;
}
.batch-header {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8rpx;
}
.urgent-tag {
  background: #fa5151;
  color: #fff;
  font-size: 22rpx;
  padding: 2rpx 12rpx;
  border-radius: 6rpx;
}
.trial-tag {
  background: #ff9900;
  color: #fff;
  font-size: 22rpx;
  padding: 2rpx 12rpx;
  border-radius: 6rpx;
}
.trial-content {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.batch-meta {
  display: flex;
  gap: 20rpx;
  flex-wrap: wrap;
}
.queue-arrows {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  flex-shrink: 0;
}
.arrow-btn {
  width: 64rpx;
  height: 64rpx;
  border-radius: 12rpx;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  color: #333;
  &.disabled {
    opacity: 0.3;
  }
}
</style>
