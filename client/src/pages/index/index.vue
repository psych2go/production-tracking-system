<template>
  <view class="container">
    <!-- Login gate -->
    <view v-if="!userStore.isLoggedIn" class="login-section">
      <view class="card login-card">
        <text class="login-title text-lg text-bold">生产进度追踪</text>
        <text class="login-desc text-secondary mt-sm">产品加工进度管理系统</text>
        <button class="login-btn mt-lg" @click="handleLogin" :loading="loading">登录</button>
      </view>
    </view>

    <!-- Dashboard -->
    <view v-else>
      <!-- Stats cards -->
      <view class="stats-row">
        <view class="stat-card card">
          <text class="stat-value text-primary">{{ dashboard?.stats.activeBatches ?? 0 }}</text>
          <text class="stat-label text-secondary text-sm">活跃批次</text>
        </view>
        <view class="stat-card card">
          <text class="stat-value text-success">{{ dashboard?.stats.todayRecords ?? 0 }}</text>
          <text class="stat-label text-secondary text-sm">今日录入</text>
        </view>
        <view class="stat-card card">
          <text class="stat-value" style="color: #0083ff;">
            {{ dashboard?.stats.totalBatches ?? 0 }}
          </text>
          <text class="stat-label text-secondary text-sm">总批次</text>
        </view>
      </view>

      <!-- Anomaly alerts -->
      <view v-if="dashboard?.anomalies?.length" class="card alert-card mt-md">
        <view class="flex-between">
          <text class="section-title text-bold">异常预警</text>
          <text class="text-primary text-sm" @click="goStats">查看详情</text>
        </view>
        <view v-for="(a, i) in dashboard.anomalies.slice(0, 3)" :key="i" class="alert-item">
          <view class="alert-dot" :class="`dot-${a.severity}`"></view>
          <text class="text-sm" :class="a.batchNo ? '' : ''">
            {{ a.batchNo ? `[${a.batchNo}] ` : '' }}{{ a.description }}
          </text>
        </view>
      </view>

      <!-- Stage filter: view products by stage -->
      <view class="card mt-md">
        <text class="section-title text-bold">按工序查看</text>
        <scroll-view scroll-x class="stage-scroll mt-sm">
          <view
            v-for="stage in appStore.stages"
            :key="stage.id"
            class="stage-chip"
            @click="goStageProducts(stage.id, stage.name)"
          >
            {{ stage.name }}
          </view>
        </scroll-view>
      </view>

      <!-- Active batches -->
      <view class="mt-md">
        <view class="flex-between mb-sm">
          <text class="section-title text-bold">活跃批次</text>
          <text class="text-primary text-sm" @click="goBatchList">查看全部</text>
        </view>
        <BatchCard
          v-for="batch in dashboard?.activeBatchList"
          :key="batch.id"
          :batch="batch"
          @click="goBatchDetail(batch.id)"
        />
        <view v-if="!dashboard?.activeBatchList?.length" class="empty-state card">
          <text class="text-secondary">暂无活跃批次</text>
        </view>
      </view>

      <!-- Recent activity -->
      <view class="mt-md">
        <text class="section-title text-bold">最近动态</text>
        <view v-for="record in dashboard?.recentActivity" :key="record.id" class="activity-item card">
          <view class="flex-between">
            <text class="text-bold">{{ record.batch?.batchNo }}</text>
            <text class="text-secondary text-sm">{{ formatTime(record.createdAt) }}</text>
          </view>
          <view class="mt-sm">
            <text class="text-sm">{{ record.stage?.name }} - {{ record.operator?.name }}</text>
            <text v-if="record.outputQuantity != null" class="text-sm text-secondary ml-sm">
              出{{ record.outputQuantity }}
            </text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { onPullDownRefresh } from "@dcloudio/uni-app";
import { useUserStore } from "../../store/user";
import { useAppStore } from "../../store/app";
import { progressApi } from "../../api/modules";
import type { DashboardData } from "../../types";
import BatchCard from "../../components/BatchCard.vue";

const userStore = useUserStore();
const appStore = useAppStore();
const dashboard = ref<DashboardData | null>(null);
const loading = ref(false);

async function handleLogin() {
  loading.value = true;
  try {
    await userStore.devLogin();
    await loadData();
  } catch (e: unknown) {
    uni.showToast({ title: (e as Error).message || "登录失败", icon: "none" });
  } finally {
    loading.value = false;
  }
}

async function loadData() {
  try {
    dashboard.value = await progressApi.dashboard();
  } catch (e: unknown) {
    console.error("Failed to load dashboard:", e);
  }
}

function goStageProducts(stageId: number, stageName: string) {
  uni.navigateTo({ url: `/pages/progress/history?stageId=${stageId}&stageName=${stageName}` });
}

function goBatchDetail(id: number) {
  uni.navigateTo({ url: `/pages/batch/detail?id=${id}` });
}

function goBatchList() {
  uni.switchTab({ url: "/pages/batch/list" });
}

function goStats() {
  uni.switchTab({ url: "/pages/stats/index" });
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

onMounted(async () => {
  await appStore.loadStages();
  if (userStore.isLoggedIn) {
    await loadData();
  }
});

onPullDownRefresh(async () => {
  await loadData();
  uni.stopPullDownRefresh();
});
</script>

<style scoped lang="scss">
.login-section {
  display: flex;
  justify-content: center;
  padding-top: 200rpx;
}
.login-card {
  width: 600rpx;
  text-align: center;
  padding: 60rpx 40rpx;
}
.login-title { display: block; }
.login-desc { display: block; }
.login-btn {
  background: #0083ff;
  color: #fff;
  border: none;
  border-radius: 12rpx;
  padding: 20rpx 0;
  font-size: 32rpx;
}
.stats-row {
  display: flex;
  gap: 16rpx;
}
.stat-card {
  flex: 1;
  text-align: center;
  padding: 28rpx 12rpx;
}
.stat-value {
  display: block;
  font-size: 44rpx;
  font-weight: 700;
}
.stat-label {
  display: block;
  margin-top: 8rpx;
}
.section-title {
  font-size: 30rpx;
  margin-bottom: 12rpx;
}
.stage-scroll {
  white-space: nowrap;
}
.stage-chip {
  display: inline-block;
  padding: 12rpx 24rpx;
  background: #f0f7ff;
  color: #0083ff;
  border-radius: 24rpx;
  font-size: 26rpx;
  margin-right: 16rpx;
}
.empty-state {
  text-align: center;
  padding: 60rpx;
}
.activity-item {
  padding: 20rpx 24rpx;
}
.text-warning { color: #ff9900; }
.alert-card {
  border-left: 6rpx solid #fa5151;
}
.alert-item {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 12rpx 0;
}
.alert-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  flex-shrink: 0;
}
.dot-critical { background: #fa5151; }
.dot-major { background: #ff9900; }
.dot-minor { background: #999; }
</style>
