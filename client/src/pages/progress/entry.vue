<template>
  <view class="container">
    <view v-if="!userStore.isLoggedIn" class="card empty-panel">
      <text class="text-secondary">请先在首页登录</text>
    </view>

    <view v-else-if="loading" class="card empty-panel">
      <text class="text-secondary">正在加载批次...</text>
    </view>

    <view v-else-if="loadError || !selectedBatch" class="card empty-panel">
      <text class="error-title">无法进入工序流转</text>
      <text class="text-secondary text-sm">{{ loadError || '未指定生产批次' }}</text>
      <button class="btn btn-outline btn-sm mt-md" @click="goBack">返回</button>
    </view>

    <template v-else>
      <view class="card batch-context-card">
        <view class="batch-context-top">
          <view class="batch-title-wrap">
            <text class="context-kicker">当前批次</text>
            <text class="batch-title">{{ selectedBatch.batchNo }} {{ selectedBatch.product?.model || '' }}</text>
          </view>
          <view v-if="selectedBatch.priority === 'urgent'" class="urgent-tag">紧急</view>
        </view>
        <view class="batch-meta-grid">
          <view class="batch-meta-item">
            <text class="batch-meta-label">当前工序</text>
            <text class="batch-meta-value text-primary">{{ getCurrentStage(selectedBatch)?.name || '未开始' }}</text>
          </view>
          <view class="batch-meta-item">
            <text class="batch-meta-label">加工数量</text>
            <text class="batch-meta-value">{{ selectedBatch.quantity }}只</text>
          </view>
          <view class="batch-meta-item">
            <text class="batch-meta-label">封装形式</text>
            <text class="batch-meta-value">{{ selectedBatch.packageType || '-' }}</text>
          </view>
          <view class="batch-meta-item">
            <text class="batch-meta-label">客户代码</text>
            <text class="batch-meta-value">{{ selectedBatch.customerCode || '-' }}</text>
          </view>
        </view>
      </view>

      <view class="card stage-card">
        <view class="stage-card-heading">
          <view>
            <text class="section-title">选择工序</text>
            <text class="hint-text">点击工序后确认本次流转</text>
          </view>
          <text v-if="suggestedStage" class="suggest-summary">推荐：{{ suggestedStage.name }}</text>
        </view>

        <view class="stage-list mt-md">
          <view
            v-for="stage in regularStages"
            :key="stage.id"
            class="stage-option"
            :class="{
              done: isStageCompleted(stage.id),
              current: isCurrentStage(stage.id),
              suggested: isSuggestedStage(stage.id),
            }"
            @click="confirmStage(stage)"
          >
            <view
              class="stage-order"
              :class="{
                'order-done': isStageCompleted(stage.id),
                'order-current': isCurrentStage(stage.id),
                'order-suggested': isSuggestedStage(stage.id),
              }"
            >
              <text v-if="isStageCompleted(stage.id)" class="check-mark">&#10003;</text>
              <text v-else>{{ stage.stageOrder }}</text>
            </view>
            <text class="stage-name">{{ stage.name }}</text>
            <text v-if="isCurrentStage(stage.id)" class="current-tag">当前</text>
            <text v-if="isSuggestedStage(stage.id)" class="suggest-tag">下一步</text>
          </view>

          <view
            v-if="completedStage"
            class="stage-option stage-completed-blink"
            :class="{
              done: isStageCompleted(completedStage.id),
              suggested: isSuggestedStage(completedStage.id),
            }"
            @click="confirmStage(completedStage)"
          >
            <view
              class="stage-order"
              :class="{
                'order-done': isStageCompleted(completedStage.id),
                'order-suggested': isSuggestedStage(completedStage.id),
              }"
            >
              <text v-if="isStageCompleted(completedStage.id)" class="check-mark">&#10003;</text>
              <text v-else>{{ completedStage.stageOrder }}</text>
            </view>
            <text class="stage-name">{{ completedStage.name }}</text>
            <text v-if="isSuggestedStage(completedStage.id)" class="suggest-tag">下一步</text>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { useUserStore } from "../../store/user";
import { useAppStore } from "../../store/app";
import { batchApi, progressApi } from "../../api/modules";
import { getCurrentStage } from "../../utils/format";
import type { Batch, ProcessStage } from "../../types";

const userStore = useUserStore();
const appStore = useAppStore();
const selectedBatch = ref<Batch | null>(null);
const submitting = ref(false);
const loading = ref(true);
const loadError = ref("");
const returnToHome = ref(false);

const completedStage = computed(() =>
  appStore.stages.find((stage) => stage.code === "completed") ?? null
);

const regularStages = computed(() =>
  appStore.stages.filter((stage) => stage.code !== "completed")
);

const suggestedStage = computed(() => {
  if (!selectedBatch.value) return null;
  const current = getCurrentStage(selectedBatch.value);
  if (!current) return regularStages.value[0] ?? null;
  const nextStage = regularStages.value
    .filter((stage) => stage.stageOrder > current.stageOrder)
    .sort((a, b) => a.stageOrder - b.stageOrder)[0];
  return nextStage ?? completedStage.value;
});

function isCurrentStage(stageId: number): boolean {
  if (!selectedBatch.value) return false;
  return getCurrentStage(selectedBatch.value)?.id === stageId;
}

function isSuggestedStage(stageId: number): boolean {
  return suggestedStage.value?.id === stageId;
}

function isStageCompleted(stageId: number): boolean {
  return selectedBatch.value?.progressRecords?.some(
    (record) => record.stageId === stageId && record.status === "completed"
  ) ?? false;
}

function scrollToSuggestedStage() {
  nextTick(() => {
    setTimeout(() => {
      uni.createSelectorQuery()
        .select(".stage-option.suggested")
        .boundingClientRect((rect) => {
          const info = Array.isArray(rect) ? rect[0] : rect;
          if (info && info.top != null) {
            uni.pageScrollTo({ scrollTop: Math.max(info.top - 40, 0), duration: 300 });
          }
        })
        .exec();
    }, 150);
  });
}

async function confirmStage(stage: ProcessStage) {
  if (submitting.value || !selectedBatch.value) return;

  if (isStageCompleted(stage.id)) {
    uni.showModal({
      title: "不可重复流转",
      content: `「${stage.name}」工序已完成流转，不能再次流转。`,
      showCancel: false,
    });
    return;
  }

  const result = await uni.showModal({
    title: "确认流转",
    content: `确认将 ${selectedBatch.value.product?.model ?? selectedBatch.value.batchNo} 流转到「${stage.name}」工序？`,
  });
  if (result.cancel) return;

  submitting.value = true;
  try {
    await progressApi.create({
      batchId: selectedBatch.value.id,
      stageId: stage.id,
    });
    uni.showToast({ title: "流转成功", icon: "success" });
    if (returnToHome.value) {
      uni.switchTab({ url: "/pages/index/index" });
    } else {
      uni.navigateBack();
    }
  } catch (e: unknown) {
    uni.showModal({ title: "流转失败", content: (e as Error).message, showCancel: false });
  } finally {
    submitting.value = false;
  }
}

function goBack() {
  uni.navigateBack({
    fail: () => uni.switchTab({ url: "/pages/index/index" }),
  });
}

onLoad(async (query) => {
  returnToHome.value = query?.returnTo === "home";
  const batchId = Number(query?.batchId);
  if (!Number.isInteger(batchId) || batchId <= 0) {
    loadError.value = "批次参数无效，请从批次详情重新进入。";
    loading.value = false;
    return;
  }

  try {
    const [, batch] = await Promise.all([
      appStore.loadStages(),
      batchApi.get(batchId),
    ]);
    selectedBatch.value = batch;
    scrollToSuggestedStage();
  } catch (e: unknown) {
    loadError.value = (e as Error).message || "批次加载失败，请稍后重试。";
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped lang="scss">
.empty-panel {
  display: flex;
  min-height: 280rpx;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  text-align: center;
}
.error-title {
  margin-bottom: 10rpx;
  color: #172327;
  font-size: 30rpx;
  font-weight: 700;
}
.batch-context-card {
  overflow: hidden;
  border-top: 6rpx solid #087f8c;
}
.batch-context-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
}
.batch-title-wrap {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}
.context-kicker {
  color: #087f8c;
  font-size: 19rpx;
  font-weight: 700;
}
.batch-title {
  overflow: hidden;
  margin-top: 3rpx;
  color: #172327;
  font-size: 32rpx;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.batch-meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 20rpx;
  overflow: hidden;
  border: 2rpx solid #edf0f0;
  border-radius: 9rpx;
  background: #edf0f0;
  gap: 2rpx;
}
.batch-meta-item {
  display: flex;
  min-width: 0;
  min-height: 80rpx;
  padding: 11rpx 14rpx;
  flex-direction: column;
  justify-content: center;
  background: #fff;
}
.batch-meta-label { color: #7d898b; font-size: 19rpx; }
.batch-meta-value {
  overflow: hidden;
  margin-top: 2rpx;
  color: #2c383c;
  font-size: 23rpx;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.stage-card { border-left: 6rpx solid #16343a; }
.stage-card-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
}
.hint-text {
  display: block;
  margin-top: 3rpx;
  color: #8a8f99;
  font-size: 21rpx;
}
.suggest-summary {
  flex-shrink: 0;
  padding: 5rpx 10rpx;
  border-radius: 5rpx;
  background: #fff3df;
  color: #9a5a00;
  font-size: 19rpx;
  font-weight: 600;
}
.stage-list { display: flex; flex-direction: column; gap: 12rpx; }
.stage-option {
  display: flex;
  align-items: center;
  min-height: 88rpx;
  padding: 20rpx;
  border: 2rpx solid #dfe4e4;
  border-radius: 8rpx;
  gap: 18rpx;
  transition: all 0.15s;
  &.done { opacity: 0.5; }
  &.current { border-color: #087f8c; background: #e6f4f3; border-width: 3rpx; }
  &.suggested { border-color: #d97706; background: #fff3df; border-width: 3rpx; }
}
.stage-order {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52rpx;
  height: 52rpx;
  flex-shrink: 0;
  border-radius: 6rpx;
  background: #edf0f0;
  color: #657174;
  font-size: 24rpx;
  &.order-done { background: #27865f; color: #fff; }
  &.order-current { background: #087f8c; color: #fff; }
  &.order-suggested { background: #d97706; color: #fff; }
}
.check-mark { color: #fff; font-size: 24rpx; }
.stage-name { flex: 1; color: #172327; font-weight: 600; }
.current-tag {
  flex-shrink: 0;
  color: #087f8c;
  font-size: 21rpx;
  font-weight: 600;
}
.suggest-tag {
  flex-shrink: 0;
  padding: 4rpx 14rpx;
  border-radius: 5rpx;
  background: #d97706;
  color: #fff;
  font-size: 20rpx;
  white-space: nowrap;
}
.stage-completed-blink {
  border-color: #27865f;
  background: #e6f3ec;
  animation: blink-border 1.5s ease-in-out infinite;
}
.stage-completed-blink.done { animation: none; opacity: 0.5; }
@keyframes blink-border {
  0%, 100% { border-color: #27865f; box-shadow: 0 0 0 transparent; }
  50% { border-color: #27865f; box-shadow: 0 0 12rpx rgba(39, 134, 95, 0.32); }
}
</style>
