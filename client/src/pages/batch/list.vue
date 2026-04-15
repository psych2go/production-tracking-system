<template>
  <view class="container">
    <!-- Search and filter -->
    <view class="card filter-bar">
      <input v-model="keyword" placeholder="搜索批号或型号" class="search-input" @confirm="loadData" />
      <view class="filter-tabs mt-sm">
        <text
          v-for="tab in tabs"
          :key="tab.value"
          class="filter-tab"
          :class="{ active: currentTab === tab.value }"
          @click="currentTab = tab.value; loadData()"
        >
          {{ tab.label }}
          <text v-if="tabCounts[tab.value]" class="tab-count">{{ tabCounts[tab.value] }}</text>
        </text>
        <text class="filter-divider"></text>
        <text
          class="smart-filter-tag"
          :class="{ active: smartFilter === 'overdue' }"
          @click="toggleSmartFilter('overdue')"
        >逾期</text>
        <text
          class="smart-filter-tag"
          :class="{ active: smartFilter === 'urgent' }"
          @click="toggleSmartFilter('urgent')"
        >紧急</text>
      </view>
      <!-- Action buttons -->
      <view class="action-row mt-sm" v-if="userStore.isAdmin()">
        <view class="action-item" @click="goCreate">
          <view class="action-circle">
            <text class="action-icon">＋</text>
          </view>
          <text class="action-label">新建批次</text>
        </view>
        <view class="action-item" @click="goSchedule">
          <view class="action-circle">
            <text class="action-icon">📋</text>
          </view>
          <text class="action-label">排单</text>
        </view>
      </view>
    </view>

    <!-- Batch list -->
    <BatchCard
      v-for="batch in filteredBatches"
      :key="batch.id"
      :batch="batch"
      @click="goDetail(batch.id)"
    />

    <view v-if="!filteredBatches.length" class="card text-center mt-lg">
      <text class="text-secondary">{{ keyword || smartFilter ? '无匹配批次' : '暂无批次' }}</text>
    </view>

  </view>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { useUserStore } from "../../store/user";
import { batchApi } from "../../api/modules";
import type { Batch } from "../../types";
import BatchCard from "../../components/BatchCard.vue";

const userStore = useUserStore();
const batches = ref<Batch[]>([]);
const keyword = ref("");
const currentTab = ref("active");
const smartFilter = ref("");

const tabs = [
  { label: "正在加工", value: "active" },
  { label: "已完成", value: "completed" },
  { label: "全部", value: "" },
];

/** Counts per tab (fetched separately) */
const tabCounts = ref<Record<string, number>>({});

/** Client-side filtering for overdue/urgent */
const filteredBatches = computed(() => {
  let result = batches.value;
  if (smartFilter.value === "overdue") {
    result = result.filter((b) =>
      b.expectedDelivery &&
      new Date(b.expectedDelivery) < new Date() &&
      b.status === "active"
    );
  } else if (smartFilter.value === "urgent") {
    result = result.filter((b) => b.priority === "urgent");
  }
  return result;
});

function toggleSmartFilter(filter: string) {
  smartFilter.value = smartFilter.value === filter ? "" : filter;
}

async function loadCounts() {
  try {
    const [active, completed, all] = await Promise.all([
      batchApi.list({ status: "active", page: 1 }),
      batchApi.list({ status: "completed", page: 1 }),
      batchApi.list({ page: 1 }),
    ]);
    tabCounts.value = {
      active: active.total,
      completed: completed.total,
      "": all.total,
    };
  } catch { /* ignore */ }
}

async function loadData() {
  try {
    const res = await batchApi.list({
      status: currentTab.value || undefined,
      keyword: keyword.value || undefined,
    });
    batches.value = res.items;
  } catch (e: unknown) {
    uni.showToast({ title: (e as Error).message, icon: "none" });
  }
}

function goDetail(id: number) {
  uni.navigateTo({ url: `/pages/batch/detail?id=${id}` });
}

function goCreate() {
  uni.navigateTo({ url: "/pages/batch/create" });
}

function goSchedule() {
  uni.navigateTo({ url: "/pages/schedule/index" });
}

onShow(async () => {
  loadData();
  loadCounts();
});
</script>

<style scoped lang="scss">
.filter-bar {
  padding: 20rpx 24rpx;
}
.search-input {
  background: #f5f5f5;
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
  font-size: 28rpx;
}
.filter-tabs {
  display: flex;
  gap: 16rpx;
  align-items: center;
}
.filter-tab {
  padding: 12rpx 24rpx;
  border-radius: 24rpx;
  font-size: 26rpx;
  color: #666;
  background: #f5f5f5;
  min-height: 56rpx;
  display: inline-flex;
  align-items: center;
  &.active {
    background: #0083ff;
    color: #fff;
  }
}
.tab-count {
  font-size: 20rpx;
  padding: 0rpx 8rpx;
  border-radius: 16rpx;
  margin-left: 6rpx;
  background: rgba(255,255,255,0.3);
}
.filter-tab.active .tab-count {
  background: rgba(255,255,255,0.3);
  color: #fff;
}
.filter-divider {
  width: 2rpx;
  height: 32rpx;
  background: #ddd;
  margin: 0 8rpx;
}
.smart-filter-tag {
  padding: 8rpx 20rpx;
  border-radius: 8rpx;
  font-size: 24rpx;
  background: #fff;
  border: 2rpx solid #e5e5e5;
  color: #666;
  min-height: 56rpx;
  display: inline-flex;
  align-items: center;
  &.active {
    border-color: #fa5151;
    color: #fa5151;
    background: #fff2f0;
  }
}
.action-row {
  display: flex;
  gap: 32rpx;
  padding-top: 8rpx;
}
.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}
.action-circle {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: #0083ff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 12rpx rgba(0, 131, 255, 0.35);
}
.action-icon {
  font-size: 36rpx;
  color: #fff;
}
.action-label {
  font-size: 22rpx;
  color: #0083ff;
  white-space: nowrap;
  font-weight: 500;
}
</style>
