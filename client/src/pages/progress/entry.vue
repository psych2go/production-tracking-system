<template>
  <view class="container">
    <view v-if="!userStore.isLoggedIn" class="card" style="text-align:center;padding:80rpx">
      <text class="text-secondary">请先在首页登录</text>
    </view>

    <view v-else>
      <!-- Stage filter with counts -->
      <view class="card" v-if="step === 1 && appStore.stages.length">
        <view class="flex-between">
          <text class="section-title text-bold">按工序查看</text>
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
        <view class="flex-between mt-md">
          <text class="section-title text-bold">按封装形式查看</text>
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
            v-for="pt in packageTypes"
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
          <text class="section-title text-bold">选择批次</text>
        </view>
        <view class="search-box mt-sm">
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
                <text v-if="batch.batchType === 'trial'" class="trial-tag">试验</text>
                <view v-if="batch.priority === 'urgent'" class="urgent-tag">紧急</view>
              </view>
              <text class="text-secondary text-sm">{{ batch.packageType }}</text>
            </view>
            <view class="flex-between mt-sm">
              <text v-if="batch.batchType !== 'trial'" class="text-sm text-secondary">数量: {{ batch.quantity }}</text>
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
          <text class="nav-back-default" @click="step = 1">&lt;</text>
          <text class="section-title text-bold">选择工序</text>
          <view style="width: 60rpx;"></view>
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
            }"
            @click="confirmStage(stage)"
          >
            <view class="stage-order" :class="{ 'order-done': isStageCompleted(stage.id), 'order-current': isCurrentStage(stage.id) }">
              <text v-if="isStageCompleted(stage.id)" class="check-mark">&#10003;</text>
              <text v-else>{{ stage.stageOrder }}</text>
            </view>
            <text class="stage-name">{{ stage.name }}</text>
            <text v-if="isCurrentStage(stage.id)" class="text-primary text-sm">当前</text>
          </view>
          <!-- 第14道「已完成」工序，闪烁显示 -->
          <view
            v-if="completedStage"
            class="stage-option stage-completed-blink"
            :class="{ done: isStageCompleted(completedStage.id) }"
            @click="confirmStage(completedStage)"
          >
            <view class="stage-order" :class="{ 'order-done': isStageCompleted(completedStage.id) }">
              <text v-if="isStageCompleted(completedStage.id)" class="check-mark">&#10003;</text>
              <text v-else>14</text>
            </view>
            <text class="stage-name">已完成</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { useUserStore } from "../../store/user";
import { useAppStore } from "../../store/app";
import { batchApi, progressApi, settingsApi } from "../../api/modules";
import type { Batch, PackageType, ProcessStage, DashboardData } from "../../types";

const userStore = useUserStore();
const appStore = useAppStore();
const dashboard = ref<DashboardData | null>(null);

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
  if (!dashboard.value?.activeBatchList) return counts;
  for (const batch of dashboard.value.activeBatchList) {
    const records = batch.progressRecords || [];
    if (!records.length) continue;
    // Find the latest completed record by stageOrder
    const sorted = [...records].sort((a, b) => {
      const oa = appStore.stages.find(s => s.id === a.stageId)?.stageOrder ?? 0;
      const ob = appStore.stages.find(s => s.id === b.stageId)?.stageOrder ?? 0;
      return ob - oa;
    });
    const latestStageId = sorted[0].stageId;
    counts[latestStageId] = (counts[latestStageId] || 0) + 1;
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

/** Count batches per package type (from dashboard active batches) */
const packageBatchCounts = computed(() => {
  const counts: Record<string, number> = {};
  if (!dashboard.value?.activeBatchList) return counts;
  for (const batch of dashboard.value.activeBatchList) {
    if (batch.packageType) {
      counts[batch.packageType] = (counts[batch.packageType] || 0) + 1;
    }
  }
  return counts;
});

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

/** Get the current (latest completed) stage for a batch */
function getCurrentStage(batch: Batch): ProcessStage | null {
  if (!appStore.stages.length || !batch.progressRecords?.length) return null;
  const completed = batch.progressRecords
    .filter((r) => r.status === "completed")
    .sort((a, b) => {
      const oa = appStore.stages.find((s) => s.id === a.stageId)?.stageOrder ?? 0;
      const ob = appStore.stages.find((s) => s.id === b.stageId)?.stageOrder ?? 0;
      return ob - oa;
    });
  return completed[0]?.stage ?? null;
}

function isCurrentStage(stageId: number): boolean {
  if (!selectedBatch.value) return false;
  const current = getCurrentStage(selectedBatch.value);
  return current?.id === stageId;
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
    const res = await batchApi.list({ status: "active", keyword: batchKeyword.value || undefined });
    batches.value = res.items;
  } catch (e: unknown) {
    uni.showToast({ title: (e as Error).message, icon: "none" });
  }
}

function selectBatch(batch: Batch) {
  selectedBatch.value = batch;
  step.value = 2;
}

async function confirmStage(stage: ProcessStage) {
  if (submitting.value) return;

  const res = await uni.showModal({
    title: "确认流转",
    content: `确认将 ${selectedBatch.value?.batchNo} 流转到「${stage.name}」工序？`,
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
    uni.showToast({ title: (e as Error).message, icon: "none" });
  } finally {
    submitting.value = false;
  }
}

onShow(async () => {
  if (userStore.isLoggedIn) {
    searchBatches();
    try { dashboard.value = await progressApi.dashboard(); } catch { /* ignore */ }
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
</script>

<style scoped lang="scss">
.nav-back-default {
  font-size: 36rpx;
  color: #333;
  font-weight: 500;
  width: 60rpx;
}
.search-box {
  background: #f5f5f5;
  border-radius: 12rpx;
  padding: 16rpx 24rpx;
}
.search-input {
  font-size: 28rpx;
}
.batch-option {
  padding: 24rpx;
  border: 2rpx solid #e5e5e5;
  border-radius: 12rpx;
  margin-bottom: 16rpx;
}
.current-stage-hint-inline {
  background: #f0f7ff;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}
.hint-text {
  display: block;
  font-size: 24rpx;
  color: #999;
}
.stage-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.stage-option {
  display: flex;
  align-items: center;
  padding: 24rpx;
  border: 2rpx solid #e5e5e5;
  border-radius: 12rpx;
  gap: 20rpx;
  min-height: 88rpx;
  &.done { opacity: 0.5; }
  &.current { border-color: #0083ff; background: #f0f7ff; border-width: 3rpx; }
}
.stage-order {
  width: 52rpx;
  height: 52rpx;
  border-radius: 50%;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  color: #666;
  flex-shrink: 0;
  &.order-done { background: #07c160; color: #fff; }
  &.order-current { background: #0083ff; color: #fff; }
}
.check-mark { color: #fff; font-size: 24rpx; }
.stage-name { flex: 1; }
.stage-completed-blink {
  border-color: #07c160;
  background: linear-gradient(135deg, #f0fff0 0%, #e8f5e9 100%);
  animation: blink-border 1.5s ease-in-out infinite;
}
.stage-completed-blink.done {
  animation: none;
  opacity: 0.5;
}
@keyframes blink-border {
  0%, 100% { border-color: #07c160; box-shadow: 0 0 0rpx transparent; }
  50% { border-color: #07c160; box-shadow: 0 0 12rpx rgba(7, 193, 96, 0.4); }
}
.batch-summary {
  padding: 16rpx 24rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
  font-size: 26rpx;
}
.section-title { font-size: 32rpx; }
.stage-scroll {
  white-space: nowrap;
}
.stage-chip {
  display: inline-flex;
  align-items: center;
  padding: 16rpx 28rpx;
  background: #f0f7ff;
  color: #0083ff;
  border-radius: 24rpx;
  font-size: 26rpx;
  margin-right: 16rpx;
  min-height: 60rpx;
  &.active {
    background: #0083ff;
    color: #fff;
  }
  &.active .stage-chip-count {
    background: rgba(255, 255, 255, 0.3);
    color: #fff;
  }
}
.stage-chip-count {
  background: #0083ff;
  color: #fff;
  font-size: 20rpx;
  padding: 2rpx 10rpx;
  border-radius: 16rpx;
  margin-left: 8rpx;
  min-width: 32rpx;
  text-align: center;
}
</style>
