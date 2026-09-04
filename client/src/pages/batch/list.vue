<template>
  <view class="container">
    <view class="card filter-bar">
      <view class="search-wrap">
        <text class="search-mark">⌕</text>
        <input
          v-model="keyword"
          placeholder="搜索订单号、批号、型号或客户代码"
          class="search-input"
          @confirm="loadData"
        />
      </view>
      <scroll-view scroll-x class="status-scroll mt-sm">
        <view class="filter-tabs">
          <view
            v-for="tab in visibleTabs"
            :key="tab.value"
            class="filter-tab"
            :class="{ active: currentTab === tab.value }"
            @click="selectTab(tab.value)"
          >
            <text>{{ tab.label }}</text>
            <text class="tab-count">{{ tabCounts[tab.value || 'all'] || 0 }}</text>
          </view>
        </view>
      </scroll-view>
      <view class="smart-filters">
        <text class="smart-filter-tag" :class="{ active: smartFilter === 'overdue' }" @click="toggleSmartFilter('overdue')">逾期</text>
        <text class="smart-filter-tag" :class="{ active: smartFilter === 'urgent' }" @click="toggleSmartFilter('urgent')">紧急</text>
      </view>
    </view>

    <BatchCard
      v-for="batch in filteredBatches"
      :key="batch.id"
      :batch="batch"
      :is-admin="userStore.isAdmin()"
      @click="goDetail(batch.id)"
      @action="handleCardAction(batch)"
    />

    <view v-if="loadingMore" class="load-more-tip"><text class="text-secondary text-sm">加载中...</text></view>
    <view v-else-if="hasMore && filteredBatches.length" class="load-more-tip" @click="loadMore">
      <text class="text-primary text-sm">点击加载更多</text>
    </view>
    <view v-else-if="!hasMore && filteredBatches.length" class="load-more-tip"><text class="text-secondary text-sm">已加载全部</text></view>

    <view v-if="!filteredBatches.length && !loading" class="card text-center mt-lg">
      <text class="text-secondary">{{ keyword || smartFilter ? '无匹配生产任务' : '暂无生产任务' }}</text>
    </view>

    <view class="fab-spacer"></view>
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
const currentTab = ref(userStore.isAdmin() ? "pending_card" : "active");
const smartFilter = ref("");
const currentPage = ref(1);
const hasMore = ref(false);
const loading = ref(false);
const loadingMore = ref(false);
const tabCounts = ref<Record<string, number>>({});

const adminTabs = [
  { label: "待制卡", value: "pending_card" },
  { label: "待投产", value: "pending" },
  { label: "加工中", value: "active" },
  { label: "已完成", value: "completed" },
  { label: "已归档", value: "archived" },
  { label: "已取消", value: "cancelled" },
  { label: "全部", value: "" },
];
const workerTabs = [
  { label: "加工中", value: "active" },
  { label: "已完成", value: "completed" },
  { label: "已归档", value: "archived" },
  { label: "全部", value: "" },
];
const visibleTabs = computed(() => userStore.isAdmin() ? adminTabs : workerTabs);
const filteredBatches = computed(() => {
  if (smartFilter.value === "overdue") return batches.value.filter((batch) => checkOverdue(batch.customerDelivery, batch.status));
  if (smartFilter.value === "urgent") return batches.value.filter((batch) => batch.priority === "urgent");
  return batches.value;
});

function selectTab(value: string) {
  currentTab.value = value;
  loadData();
}

function toggleSmartFilter(filter: string) {
  smartFilter.value = smartFilter.value === filter ? "" : filter;
}

async function loadCounts() {
  try { tabCounts.value = await batchApi.counts(); } catch { /* non-critical */ }
}

async function loadData() {
  loading.value = true;
  currentPage.value = 1;
  try {
    const result = await batchApi.list({
      status: currentTab.value || undefined,
      keyword: keyword.value.trim() || undefined,
      page: 1,
    });
    batches.value = result.items;
    hasMore.value = result.items.length < result.total;
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
    const result = await batchApi.list({
      status: currentTab.value || undefined,
      keyword: keyword.value.trim() || undefined,
      page: currentPage.value,
    });
    batches.value = [...batches.value, ...result.items];
    hasMore.value = batches.value.length < result.total;
  } catch (e: unknown) {
    uni.showToast({ title: (e as Error).message, icon: "none" });
  } finally {
    loadingMore.value = false;
  }
}

function goDetail(id: number) {
  uni.navigateTo({ url: `/pages/batch/detail?id=${id}` });
}

function goCreate() {
  uni.navigateTo({ url: "/pages/batch/create" });
}

function goCard(id: number) {
  uni.navigateTo({ url: `/pages/batch/card?id=${id}` });
}

async function startProduction(batch: Batch) {
  const result = await uni.showModal({
    title: "确认投入加工",
    content: `${batch.batchNo || ''} ${batch.product?.model || ''}\n数量：${batch.quantity}只\n封装形式：${batch.packageType || ''}`,
  });
  if (result.cancel) return;
  try {
    await batchApi.startProduction(batch.id);
    uni.showToast({ title: "已投入加工", icon: "success" });
    await Promise.all([loadData(), loadCounts()]);
  } catch (e: unknown) {
    uni.showModal({ title: "操作失败", content: (e as Error).message, showCancel: false });
  }
}

async function archiveBatch(batch: Batch) {
  const result = await uni.showModal({ title: "确认归档", content: `确定归档 ${batch.batchNo || ''} ${batch.product?.model || ''} 吗？` });
  if (result.cancel) return;
  try {
    await batchApi.update(batch.id, { status: "archived" });
    uni.showToast({ title: "已归档", icon: "success" });
    await Promise.all([loadData(), loadCounts()]);
  } catch (e: unknown) {
    uni.showModal({ title: "归档失败", content: (e as Error).message, showCancel: false });
  }
}

function handleCardAction(batch: Batch) {
  if (userStore.isAdmin() && batch.status === "pending_card") {
    goCard(batch.id);
  } else if (userStore.isAdmin() && batch.status === "pending") {
    startProduction(batch);
  } else if (userStore.isAdmin() && batch.status === "completed") {
    archiveBatch(batch);
  } else {
    goDetail(batch.id);
  }
}

onReachBottom(() => {
  if (hasMore.value && !loadingMore.value) loadMore();
});

onShow(() => {
  loadData();
  loadCounts();
});
</script>

<style scoped lang="scss">
.filter-bar { padding: 20rpx; border-top: 5rpx solid #087f8c; }
.search-wrap {
  display: flex;
  align-items: center;
  min-height: 82rpx;
  padding: 0 20rpx;
  border: 2rpx solid transparent;
  border-radius: 8rpx;
  background: #f1f4f3;
  &:focus-within { border-color: #087f8c; background: #fff; }
}
.search-mark { margin-right: 14rpx; color: #657174; font-size: 34rpx; line-height: 1; }
.search-input { flex: 1; height: 80rpx; font-size: 27rpx; }
.status-scroll { width: 100%; padding-top: 14rpx; border-top: 2rpx solid #edf0f0; white-space: nowrap; }
.filter-tabs { display: inline-flex; gap: 10rpx; padding: 2rpx 2rpx 8rpx; }
.filter-tab {
  display: inline-flex;
  align-items: center;
  min-height: 56rpx;
  padding: 10rpx 16rpx;
  border-radius: 6rpx;
  background: #edf0f0;
  color: #657174;
  font-size: 23rpx;
  &.active { background: #16343a; color: #fff; font-weight: 600; }
}
.tab-count {
  min-width: 30rpx;
  margin-left: 7rpx;
  padding: 0 7rpx;
  border-radius: 4rpx;
  background: rgba(23, 35, 39, 0.08);
  font-size: 19rpx;
  text-align: center;
}
.filter-tab.active .tab-count { background: rgba(255,255,255,0.22); }
.smart-filters { display: flex; gap: 10rpx; margin-top: 10rpx; }
.smart-filter-tag {
  padding: 7rpx 16rpx;
  border: 2rpx solid #dfe4e4;
  border-radius: 6rpx;
  background: #fff;
  color: #657174;
  font-size: 22rpx;
  &.active { border-color: #087f8c; background: #e6f4f3; color: #075e68; font-weight: 600; }
}
.load-more-tip { padding: 24rpx; text-align: center; }
.fab-spacer { height: 120rpx; }
.fab {
  position: fixed;
  z-index: 50;
  right: 36rpx;
  bottom: calc(120rpx + env(safe-area-inset-bottom));
  display: flex;
  align-items: center;
  justify-content: center;
  width: 92rpx;
  height: 92rpx;
  border-radius: 50%;
  background: #087f8c;
  box-shadow: 0 10rpx 26rpx rgba(8, 127, 140, 0.32);
}
</style>
