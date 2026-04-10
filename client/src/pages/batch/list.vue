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
        >{{ tab.label }}</text>
      </view>
    </view>

    <!-- Batch list -->
    <BatchCard
      v-for="batch in batches"
      :key="batch.id"
      :batch="batch"
      @click="goDetail(batch.id)"
    />

    <view v-if="!batches.length" class="card text-center mt-lg">
      <text class="text-secondary">暂无批次</text>
    </view>

    <!-- Create button (admin/supervisor only) -->
    <view v-if="userStore.isAdmin()" class="fab" @click="goCreate">
      <text class="fab-text">+</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { useUserStore } from "../../store/user";
import { batchApi } from "../../api/modules";
import type { Batch } from "../../types";
import BatchCard from "../../components/BatchCard.vue";

const userStore = useUserStore();
const batches = ref<Batch[]>([]);
const keyword = ref("");
const currentTab = ref("active");

const tabs = [
  { label: "活跃", value: "active" },
  { label: "已完成", value: "completed" },
  { label: "全部", value: "" },
];

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

onShow(() => {
  loadData();
});
</script>

<style scoped lang="scss">
.filter-bar {
  padding: 20rpx 24rpx;
}
.search-input {
  background: #f5f5f5;
  border-radius: 12rpx;
  padding: 16rpx 24rpx;
  font-size: 28rpx;
}
.filter-tabs {
  display: flex;
  gap: 16rpx;
}
.filter-tab {
  padding: 8rpx 24rpx;
  border-radius: 24rpx;
  font-size: 26rpx;
  color: #666;
  background: #f5f5f5;
  &.active {
    background: #0083ff;
    color: #fff;
  }
}
.fab {
  position: fixed;
  right: 40rpx;
  bottom: 140rpx;
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background: #0083ff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 16rpx rgba(0, 131, 255, 0.4);
}
.fab-text {
  color: #fff;
  font-size: 48rpx;
  font-weight: 300;
}
</style>
