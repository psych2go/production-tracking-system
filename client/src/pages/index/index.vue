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
          <text class="stat-value text-primary">{{ dashboard?.stats.activeProductBatches ?? 0 }}</text>
          <text class="stat-label text-secondary text-sm">在线产品总批次</text>
        </view>
        <view class="stat-card card">
          <text class="stat-value text-success">{{ dashboard?.stats.activeProductQuantity ?? 0 }}</text>
          <text class="stat-label text-secondary text-sm">在线产品总数量</text>
        </view>
        <view class="stat-card card">
          <text class="stat-value" style="color: #ff9900;">
            {{ dashboard?.stats.totalTrialBatches ?? 0 }}
          </text>
          <text class="stat-label text-secondary text-sm">试验总批次</text>
        </view>
      </view>

      <!-- Anomaly alerts -->
      <view class="section-block mt-md" v-if="dashboard?.anomalies?.length">
        <view class="section-header">
          <view class="flex-center">
            <text class="alert-count">{{ dashboard.anomalies.length }}</text>
            <text class="section-title text-bold">异常预警</text>
          </view>
          <text class="collapse-btn" @click="collapsed.alerts = !collapsed.alerts">{{ collapsed.alerts ? '展开' : '收起' }}</text>
        </view>
        <view v-if="!collapsed.alerts" class="section-body card">
          <view
            v-for="(a, i) in dashboard.anomalies.slice(0, 5)"
            :key="i"
            class="alert-item"
            @click="a.batchId && goBatchDetail(a.batchId)"
          >
            <view class="alert-dot" :class="`dot-${a.severity}`"></view>
            <view class="alert-content">
              <text class="text-sm">{{ a.description }}</text>
            </view>
            <text v-if="a.batchId" class="alert-arrow">></text>
          </view>
        </view>
      </view>

      <!-- Quick actions for workers -->
      <view class="card mt-md quick-actions" v-if="!userStore.isAdmin()">
        <text class="section-title text-bold">快捷操作</text>
        <view class="action-grid mt-sm">
          <view class="action-item" @click="goEntry">
            <view class="action-icon action-icon-primary">
              <text class="action-icon-text">+</text>
            </view>
            <text class="action-label text-sm">工序流转</text>
          </view>
          <view class="action-item" @click="go('/pages/progress/history')">
            <view class="action-icon action-icon-success">
              <text class="action-icon-text">&#9776;</text>
            </view>
            <text class="action-label text-sm">我的记录</text>
          </view>
        </view>
      </view>

      <!-- Active batches -->
      <view class="section-block mt-md">
        <view class="section-header">
          <text class="section-title text-bold">正在加工</text>
          <text class="collapse-btn" @click="collapsed.batches = !collapsed.batches">{{ collapsed.batches ? '展开' : '收起' }}</text>
        </view>
        <view v-if="!collapsed.batches" class="section-body">
          <BatchCard
            v-for="batch in dashboard?.activeBatchList"
            :key="batch.id"
            :batch="batch"
            @click="goBatchDetail(batch.id)"
          />
          <view v-if="!dashboard?.activeBatchList?.length" class="empty-state card">
            <text class="text-secondary">暂无正在加工批次</text>
          </view>
        </view>
      </view>

      <!-- Recent activity -->
      <view class="section-block mt-md">
        <view class="section-header">
          <text class="section-title text-bold">最近动态</text>
          <text class="collapse-btn" @click="collapsed.activity = !collapsed.activity">{{ collapsed.activity ? '展开' : '收起' }}</text>
        </view>
        <view v-if="!collapsed.activity" class="section-body">
          <view v-for="record in dashboard?.recentActivity" :key="record.id" class="activity-item card">
            <view class="flex-between">
              <view class="flex-center">
                <text class="text-bold">{{ record.batch?.batchNo }} {{ record.batch?.product?.model || '' }}</text>
                <view v-if="record.batch?.priority === 'urgent'" class="urgent-tag">紧急</view>
              </view>
              <text class="text-secondary text-sm">{{ formatTime(record.createdAt) }}</text>
            </view>
            <view class="mt-sm">
              <text class="text-sm">流转到 {{ record.stage?.name }}</text>
              <text class="text-sm text-secondary ml-sm">{{ record.operator?.name }}</text>
            </view>
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
import { formatTime } from "../../utils/format";
import type { DashboardData } from "../../types";
import BatchCard from "../../components/BatchCard.vue";

const userStore = useUserStore();
const appStore = useAppStore();
const dashboard = ref<DashboardData | null>(null);
const loading = ref(false);
const collapsed = ref({ alerts: false, batches: false, activity: false });

async function handleLogin() {
  if (loading.value) return;
  loading.value = true;
  try {
    await userStore.devLogin();
    await appStore.loadStages();
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

function goBatchDetail(id: number) {
  uni.navigateTo({ url: `/pages/batch/detail?id=${id}` });
}

function goEntry() {
  uni.switchTab({ url: "/pages/progress/entry" });
}

function go(url: string) {
  uni.navigateTo({ url });
}

onMounted(async () => {
  if (userStore.isLoggedIn) {
    await appStore.loadStages();
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
  padding: 24rpx 0;
  font-size: 32rpx;
  min-height: 88rpx;
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

/* Section blocks - consistent layout */
.section-block {
  display: flex;
  flex-direction: column;
}
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 4rpx;
  margin-bottom: 16rpx;
}
.section-title {
  font-size: 30rpx;
}
.section-body {
  margin-top: 0;
}

.alert-count {
  display: inline-block;
  background: #fa5151;
  color: #fff;
  font-size: 22rpx;
  padding: 2rpx 12rpx;
  border-radius: 20rpx;
  margin-right: 8rpx;
  min-width: 36rpx;
  text-align: center;
}
.alert-item {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
  min-height: 72rpx;
  &:last-child { border-bottom: none; }
}
.alert-content { flex: 1; }
.alert-arrow { color: #ccc; font-size: 28rpx; }
.alert-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  flex-shrink: 0;
}
.dot-critical { background: #fa5151; }
.dot-major { background: #ff9900; }
.dot-minor { background: #999; }

/* Quick actions */
.action-grid {
  display: flex;
  gap: 32rpx;
}
.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  min-width: 120rpx;
}
.action-icon {
  width: 88rpx;
  height: 88rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.action-icon-primary { background: #e8f4ff; }
.action-icon-success { background: #e8f8ee; }
.action-icon-text { font-size: 36rpx; font-weight: 600; }
.action-label { color: #666; }

.empty-state {
  text-align: center;
  padding: 60rpx;
}
.activity-item {
  padding: 20rpx 24rpx;
}
.collapse-btn {
  font-size: 24rpx;
  color: #0083ff;
  padding: 4rpx 16rpx;
  border: 1rpx solid #0083ff;
  border-radius: 20rpx;
}
</style>
