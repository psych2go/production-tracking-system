<template>
  <view class="container">
    <!-- Search and filter -->
    <view class="card filter-bar">
      <view class="search-wrap">
        <text class="search-mark">⌕</text>
        <input v-model="keyword" placeholder="搜索批号或型号" class="search-input" @confirm="loadData" />
      </view>
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
    </view>

    <!-- Batch list -->
    <BatchCard
      v-for="batch in filteredBatches"
      :key="batch.id"
      :batch="batch"
      @click="goDetail(batch.id)"
    />

    <view v-if="loadingMore" class="load-more-tip">
      <text class="text-secondary text-sm">加载中...</text>
    </view>
    <view v-else-if="hasMore && filteredBatches.length" class="load-more-tip" @click="loadMore">
      <text class="text-primary text-sm">点击加载更多</text>
    </view>
    <view v-else-if="!hasMore && filteredBatches.length" class="load-more-tip">
      <text class="text-secondary text-sm">已加载全部</text>
    </view>

    <view v-if="!filteredBatches.length && !loading" class="card text-center mt-lg">
      <text class="text-secondary">{{ keyword || smartFilter ? '无匹配批次' : '暂无批次' }}</text>
    </view>

    <view class="fab-spacer"></view>

    <!-- 浮动新建按钮 -->
    <view v-if="userStore.isAdmin()" class="fab" @click="goCreate">
      <UIcon name="plus" :size="52" color="#ffffff" />
    </view>

  </view>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { onShow, onReachBottom } from "@dcloudio/uni-app";
import { useUserStore } from "../../store/user";
import { batchApi } from "../../api/modules";
import type { Batch } from "../../types";
import BatchCard from "../../components/BatchCard.vue";
import UIcon from "../../components/UIcon.vue";
import { isOverdue as checkOverdue } from "../../utils/format";

const userStore = useUserStore();
const batches = ref<Batch[]>([]);
const keyword = ref("");
const currentTab = ref("active");
const smartFilter = ref("");
const currentPage = ref(1);
const hasMore = ref(false);
const loading = ref(false);
const loadingMore = ref(false);

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
    result = result.filter((b) => checkOverdue(b.customerDelivery, b.status));
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
  loading.value = true;
  currentPage.value = 1;
  try {
    const res = await batchApi.list({
      status: currentTab.value || undefined,
      keyword: keyword.value || undefined,
      page: 1,
    });
    batches.value = res.items;
    hasMore.value = res.items.length < res.total;
  } catch (e: unknown) {
    uni.showToast({ title: (e as Error).message, icon: "none" });
  } finally {
    loading.value = false;
  }
}

async function loadMore() {
  if (loadingMore.value || !hasMore.value) return;
  loadingMore.value = true;
  currentPage.value++;
  try {
    const res = await batchApi.list({
      status: currentTab.value || undefined,
      keyword: keyword.value || undefined,
      page: currentPage.value,
    });
    batches.value = [...batches.value, ...res.items];
    hasMore.value = batches.value.length < res.total;
  } catch (e: unknown) {
    uni.showToast({ title: (e as Error).message, icon: "none" });
  } finally {
    loadingMore.value = false;
  }
}

onReachBottom(() => {
  if (hasMore.value && !loadingMore.value) loadMore();
});

function goDetail(id: number) {
  uni.navigateTo({ url: `/pages/batch/detail?id=${id}` });
}

function goCreate() {
  uni.navigateTo({ url: "/pages/batch/create" });
}

onShow(async () => {
  loadData();
  loadCounts();
});
</script>

<style scoped lang="scss">
.filter-bar {
  padding: 20rpx;
  border-top: 5rpx solid #087f8c;
}
.search-wrap {
  display: flex;
  align-items: center;
  min-height: 82rpx;
  background: #f1f4f3;
  border: 2rpx solid transparent;
  border-radius: 8rpx;
  padding: 0 20rpx;
  &:focus-within {
    background: #fff;
    border-color: #087f8c;
  }
}
.search-mark {
  margin-right: 14rpx;
  color: #657174;
  font-size: 34rpx;
  line-height: 1;
}
.search-input {
  flex: 1;
  height: 80rpx;
  font-size: 28rpx;
}
.filter-tabs {
  display: flex;
  gap: 10rpx;
  align-items: center;
  flex-wrap: wrap;
  padding-top: 16rpx;
  border-top: 2rpx solid #edf0f0;
}
.filter-tab {
  padding: 10rpx 18rpx;
  border-radius: 6rpx;
  font-size: 24rpx;
  color: #657174;
  background: #edf0f0;
  min-height: 56rpx;
  display: inline-flex;
  align-items: center;
  transition: all 0.2s;
  &.active {
    background: #16343a;
    color: #fff;
    font-weight: 600;
  }
}
.tab-count {
  font-size: 20rpx;
  padding: 0 8rpx;
  border-radius: 4rpx;
  margin-left: 8rpx;
  background: rgba(23, 35, 39, 0.08);
  color: inherit;
}
.filter-tab.active .tab-count {
  background: rgba(255, 255, 255, 0.25);
  color: #fff;
}
.filter-divider {
  width: 2rpx;
  height: 28rpx;
  background: #cbd2d2;
  margin: 0 4rpx;
}
.smart-filter-tag {
  padding: 9rpx 17rpx;
  border-radius: 6rpx;
  font-size: 24rpx;
  background: #fff;
  border: 2rpx solid #dfe4e4;
  color: #657174;
  min-height: 56rpx;
  display: inline-flex;
  align-items: center;
  &.active {
    border-color: #c9483f;
    color: #c9483f;
    background: #fcecea;
  }
}
.fab {
  position: fixed;
  right: 40rpx;
  bottom: 140rpx;
  width: 112rpx;
  height: 112rpx;
  border-radius: 50%;
  background: #087f8c;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 6rpx solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 10rpx 28rpx rgba(8, 127, 140, 0.32);
  z-index: 100;
  &:active { transform: scale(0.94); }
}
.fab-spacer {
  height: 160rpx;
}
.load-more-tip {
  text-align: center;
  padding: 24rpx 0;
}
</style>
