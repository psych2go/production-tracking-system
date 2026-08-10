<template>
  <view class="container">
    <view v-if="!userStore.isLoggedIn" class="card" style="text-align:center;padding:80rpx">
      <text class="text-secondary">请先在首页登录</text>
    </view>

    <view v-else>
      <!-- Stage filter with counts -->
      <view class="card filter-panel" v-if="step === 1 && appStore.stages.length">
        <view class="filter-label">
          <text class="filter-index">A</text>
          <text>按工序查看</text>
        </view>
        <scroll-view scroll-x class="stage-scroll mt-sm">
          <view
            class="stage-chip"
            :class="{ active: !selectedStageId }"
            @click="selectedStageId = null"
          >
            全部
          </view>
          <view
            v-for="stage in regularStages"
            :key="stage.id"
            class="stage-chip"
            :class="{ active: selectedStageId === stage.id }"
            @click="selectedStageId = selectedStageId === stage.id ? null : stage.id"
          >
            {{ stage.name }}
            <text class="stage-chip-count" v-if="stageBatchCounts[stage.id]">
              {{ stageBatchCounts[stage.id] }}
            </text>
          </view>
        </scroll-view>
        <!-- 按封装形式查看 -->
        <view class="filter-label mt-md">
          <text class="filter-index">B</text>
          <text>按封装形式查看</text>
        </view>
        <scroll-view scroll-x class="stage-scroll mt-sm">
          <view
            class="stage-chip"
            :class="{ active: !selectedPackageType }"
            @click="selectedPackageType = ''"
          >
            全部
          </view>
          <view
            v-for="pt in activePackageTypes"
            :key="pt.id"
            class="stage-chip"
            :class="{ active: selectedPackageType === pt.name }"
            @click="selectedPackageType = selectedPackageType === pt.name ? '' : pt.name"
          >
            {{ pt.name }}
            <text class="stage-chip-count" v-if="packageBatchCounts[pt.name]">
              {{ packageBatchCounts[pt.name] }}
            </text>
          </view>
        </scroll-view>
      </view>

      <!-- Step 1: Select Batch -->
      <view v-if="step === 1" class="card">
        <view class="flex-between">
          <text class="section-title">选择批次</text>
        </view>
        <view class="search-box mt-sm">
          <text class="search-mark">⌕</text>
          <input
            v-model="batchKeyword"
            placeholder="搜索批号或型号"
            class="search-input"
            @confirm="searchBatches"
            @input="onBatchInput"
          />
        </view>
        <view class="mt-md">
          <view
            v-for="batch in filteredBatches"
            :key="batch.id"
            class="batch-option"
            @click="selectBatch(batch)"
          >
            <view class="flex-between">
              <view class="flex-center">
                <text class="text-bold">{{ batch.batchNo }} {{ batch.product?.model || '' }}</text>
                <view v-if="batch.priority === 'urgent'" class="urgent-tag">紧急</view>
              </view>
              <text class="text-secondary text-sm">{{ batch.packageType }}</text>
            </view>
            <view class="flex-between mt-sm">
              <text class="text-sm text-secondary">数量: {{ batch.quantity }}</text>
              <view v-if="getCurrentStage(batch)" class="current-stage-hint-inline">
                <text class="text-sm">当前: {{ getCurrentStage(batch)?.name }}</text>
              </view>
            </view>
          </view>
          <view v-if="!filteredBatches.length" class="text-center mt-lg text-secondary">
            <text>{{ batchKeyword || selectedStageId || selectedPackageType ? '无匹配批次' : '加载中...' }}</text>
          </view>
        </view>
      </view>

      <!-- Step 2: Select Stage (click to submit) -->
      <view v-if="step === 2" class="card">
        <view class="flex-between">
          <view class="nav-back" @click="step = 1">
            <UIcon name="back" :size="40" color="#087f8c" />
            <text class="nav-back-text">返回</text>
          </view>
          <text class="section-title">选择工序</text>
          <view class="nav-back-placeholder"></view>
        </view>
        <view class="batch-summary mt-sm">
          <text>{{ selectedBatch?.batchNo }} {{ selectedBatch?.product?.model }}</text>
        </view>
        <text class="hint-text mt-md">点击工序确认流转</text>
        <view class="stage-list mt-sm">
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
            <view class="stage-order" :class="{ 'order-done': isStageCompleted(stage.id), 'order-current': isCurrentStage(stage.id), 'order-suggested': isSuggestedStage(stage.id) }">
              <text v-if="isStageCompleted(stage.id)" class="check-mark">&#10003;</text>
              <text v-else>{{ stage.stageOrder }}</text>
            </view>
            <text class="stage-name">{{ stage.name }}</text>
            <text v-if="isCurrentStage(stage.id)" class="text-primary text-sm">当前</text>
            <text v-if="isSuggestedStage(stage.id)" class="suggest-tag">下一步</text>
          </view>
          <!-- 第14道「已完成」工序，闪烁显示 -->
          <view
            v-if="completedStage"
            class="stage-option stage-completed-blink"
            :class="{ done: isStageCompleted(completedStage.id), suggested: isSuggestedStage(completedStage.id) }"
            @click="confirmStage(completedStage)"
          >
            <view class="stage-order" :class="{ 'order-done': isStageCompleted(completedStage.id) }">
              <text v-if="isStageCompleted(completedStage.id)" class="check-mark">&#10003;</text>
              <text v-else>14</text>
            </view>
            <text class="stage-name">已完成</text>
            <text v-if="isSuggestedStage(completedStage.id)" class="suggest-tag">下一步</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { useUserStore } from "../../store/user";
import { useAppStore } from "../../store/app";
import { batchApi, progressApi, settingsApi } from "../../api/modules";
import { getCurrentStage } from "../../utils/format";
import UIcon from "../../components/UIcon.vue";
import type { Batch, PackageType, ProcessStage } from "../../types";

const userStore = useUserStore();
const appStore = useAppStore();

/** 已完成工序（code === "completed"） */
const completedStage = computed(() =>
  appStore.stages.find(s => s.code === "completed") ?? null
);

/** 常规工序（排除已完成） */
const regularStages = computed(() =>
  appStore.stages.filter(s => s.code !== "completed")
);

/** Compute batch count per stage: count batches whose CURRENT (latest completed) stage is this one */
const stageBatchCounts = computed(() => {
  const counts: Record<number, number> = {};
  for (const batch of batches.value) {
    const current = getCurrentStage(batch);
    if (current) {
      counts[current.id] = (counts[current.id] || 0) + 1;
    }
  }
  return counts;
});

const step = ref(1);
const batchKeyword = ref("");
const batches = ref<Batch[]>([]);
const selectedBatch = ref<Batch | null>(null);
const selectedStageId = ref<number | null>(null);
const selectedPackageType = ref("");
const submitting = ref(false);
const packageTypes = ref<PackageType[]>([]);

/** Count batches per package type */
const packageBatchCounts = computed(() => {
  const counts: Record<string, number> = {};
  for (const batch of batches.value) {
    if (batch.packageType) {
      counts[batch.packageType] = (counts[batch.packageType] || 0) + 1;
    }
  }
  return counts;
});

/** Only show package types that have active batches */
const activePackageTypes = computed(() =>
  packageTypes.value.filter(pt => pt.name in packageBatchCounts.value)
);

/** Filter batches by selected stage, package type, and keyword */
const filteredBatches = computed(() => {
  let result = batches.value;
  if (selectedStageId.value) {
    result = result.filter(b => {
      const current = getCurrentStage(b);
      return current?.id === selectedStageId.value;
    });
  }
  if (selectedPackageType.value) {
    result = result.filter(b => b.packageType === selectedPackageType.value);
  }
  return result;
});

/** 推荐下一步工序 */
const suggestedStage = computed(() => {
  if (!selectedBatch.value) return null;
  const current = getCurrentStage(selectedBatch.value);
  if (!current) return regularStages.value[0] ?? null;
  const nextStages = regularStages.value
    .filter(s => s.stageOrder > current.stageOrder)
    .sort((a, b) => a.stageOrder - b.stageOrder);
  if (nextStages.length > 0) return nextStages[0];
  return completedStage.value;
});

function isCurrentStage(stageId: number): boolean {
  if (!selectedBatch.value) return false;
  const current = getCurrentStage(selectedBatch.value);
  return current?.id === stageId;
}

function isSuggestedStage(stageId: number): boolean {
  return suggestedStage.value?.id === stageId;
}

function scrollToSuggestedStage() {
  nextTick(() => {
    setTimeout(() => {
      uni.createSelectorQuery()
        .select('.stage-option.suggested')
        .boundingClientRect((rect) => {
          const info = Array.isArray(rect) ? rect[0] : rect;
          if (info && info.top != null) {
            uni.pageScrollTo({
              scrollTop: info.top - 40,
              duration: 300,
            });
          }
        })
        .exec();
    }, 150);
  });
}

function isStageCompleted(stageId: number): boolean {
  return selectedBatch.value?.progressRecords?.some(
    (r) => r.stageId === stageId && r.status === "completed"
  ) ?? false;
}

let searchTimer: ReturnType<typeof setTimeout> | null = null;

function onBatchInput() {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => searchBatches(), 300);
}

async function searchBatches() {
  try {
    const res = await batchApi.list({ status: "active", keyword: batchKeyword.value || undefined, pageSize: 200 });
    batches.value = res.items;
  } catch (e: unknown) {
    uni.showToast({ title: (e as Error).message, icon: "none" });
  }
}

function selectBatch(batch: Batch) {
  selectedBatch.value = batch;
  step.value = 2;
  scrollToSuggestedStage();
}

async function confirmStage(stage: ProcessStage) {
  if (submitting.value) return;

  // Front-end guard: already completed
  if (isStageCompleted(stage.id)) {
    uni.showModal({
      title: "不可重复流转",
      content: `「${stage.name}」工序已完成流转，不能再次流转。`,
      showCancel: false,
    });
    return;
  }

  const res = await uni.showModal({
    title: "确认流转",
    content: `确认将 ${selectedBatch.value?.product?.model ?? selectedBatch.value?.batchNo} 流转到「${stage.name}」工序？`,
  });
  if (res.cancel) return;

  submitting.value = true;
  try {
    await progressApi.create({
      batchId: selectedBatch.value!.id,
      stageId: stage.id,
    });
    uni.showToast({ title: "流转成功", icon: "success" });

    // Reset and refresh
    selectedBatch.value = null;
    step.value = 1;
    await searchBatches();
  } catch (e: unknown) {
    uni.showModal({ title: "流转失败", content: (e as Error).message, showCancel: false });
  } finally {
    submitting.value = false;
  }
}

onShow(async () => {
  if (userStore.isLoggedIn) {
    searchBatches();
    if (!packageTypes.value.length) {
      try { packageTypes.value = await settingsApi.listPackageTypes(); } catch { /* ignore */ }
    }
    const pendingId = uni.getStorageSync("pendingBatchId");
    if (pendingId) {
      uni.removeStorageSync("pendingBatchId");
      const batch = batches.value.find((b) => b.id === pendingId);
      if (batch) {
        selectBatch(batch);
      } else {
        try {
          const b = await batchApi.get(pendingId);
          batches.value.unshift(b);
          selectBatch(b);
        } catch { /* ignore */ }
      }
    }
  }
});

onMounted(() => {
  appStore.loadStages();
});

onBeforeUnmount(() => {
  if (searchTimer) {
    clearTimeout(searchTimer);
    searchTimer = null;
  }
});
</script>

<style scoped lang="scss">
.filter-panel {
  border-top: 5rpx solid #087f8c;
}
.filter-label {
  display: flex;
  align-items: center;
  color: #2c383c;
  font-size: 25rpx;
  font-weight: 700;
}
.filter-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34rpx;
  height: 34rpx;
  margin-right: 12rpx;
  border-radius: 5rpx;
  background: #16343a;
  color: #fff;
  font-size: 19rpx;
}
.nav-back {
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 12rpx 8rpx;
  min-width: 140rpx;
}
.nav-back-text {
  font-size: 30rpx;
  color: #087f8c;
}
.nav-back-placeholder {
  min-width: 140rpx;
  flex-shrink: 0;
}
.search-box {
  display: flex;
  align-items: center;
  min-height: 82rpx;
  background: #f1f4f3;
  border: 2rpx solid transparent;
  border-radius: 8rpx;
  padding: 0 20rpx;
  &:focus-within { background: #fff; border-color: #087f8c; }
}
.search-mark { margin-right: 14rpx; color: #657174; font-size: 34rpx; }
.search-input { flex: 1; height: 80rpx; font-size: 28rpx; }
.batch-option {
  padding: 24rpx;
  border: 2rpx solid #dfe4e4;
  border-left: 6rpx solid #087f8c;
  border-radius: 8rpx;
  margin-bottom: 16rpx;
  transition: all 0.15s;
  &:active { border-color: #087f8c; background: #f5f7f7; }
}
.current-stage-hint-inline {
  background: #e6f4f3;
  color: #075e68;
  padding: 4rpx 14rpx;
  border-radius: 5rpx;
}
.hint-text {
  display: block;
  font-size: 24rpx;
  color: #8a8f99;
}
.stage-list { display: flex; flex-direction: column; gap: 12rpx; }
.stage-option {
  display: flex;
  align-items: center;
  padding: 24rpx;
  border: 2rpx solid #dfe4e4;
  border-radius: 8rpx;
  gap: 20rpx;
  min-height: 88rpx;
  transition: all 0.15s;
  &.done { opacity: 0.5; }
  &.current { border-color: #087f8c; background: #e6f4f3; border-width: 3rpx; }
  &.suggested { border-color: #d97706; background: #fff3df; border-width: 3rpx; }
}
.stage-order {
  width: 52rpx;
  height: 52rpx;
  border-radius: 6rpx;
  background: #edf0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  color: #657174;
  flex-shrink: 0;
  &.order-done { background: #27865f; color: #fff; }
  &.order-current { background: #087f8c; color: #fff; }
  &.order-suggested { background: #d97706; color: #fff; }
}
.check-mark { color: #fff; font-size: 24rpx; }
.suggest-tag {
  font-size: 22rpx;
  padding: 4rpx 18rpx;
  background: #d97706;
  color: #fff;
  border-radius: 5rpx;
  white-space: nowrap;
}
.stage-name { flex: 1; }
.stage-completed-blink {
  border-color: #27865f;
  background: #e6f3ec;
  animation: blink-border 1.5s ease-in-out infinite;
}
.stage-completed-blink.done {
  animation: none;
  opacity: 0.5;
}
@keyframes blink-border {
  0%, 100% { border-color: #27865f; box-shadow: 0 0 0rpx transparent; }
  50% { border-color: #27865f; box-shadow: 0 0 12rpx rgba(39, 134, 95, 0.32); }
}
.batch-summary {
  padding: 16rpx 24rpx;
  background: #16343a;
  border-radius: 8rpx;
  color: #fff;
  font-size: 26rpx;
}
.stage-scroll { white-space: nowrap; }
.stage-chip {
  display: inline-flex;
  align-items: center;
  padding: 13rpx 20rpx;
  background: #edf0f0;
  color: #485458;
  border: 2rpx solid transparent;
  border-radius: 6rpx;
  font-size: 24rpx;
  margin-right: 10rpx;
  min-height: 60rpx;
  &.active {
    background: #087f8c;
    color: #fff;
  }
  &.active .stage-chip-count {
    background: rgba(255, 255, 255, 0.3);
    color: #fff;
  }
}
.stage-chip-count {
  background: #fff;
  color: #087f8c;
  font-size: 20rpx;
  padding: 2rpx 10rpx;
  border-radius: 4rpx;
  margin-left: 8rpx;
  min-width: 32rpx;
  text-align: center;
}
</style>
