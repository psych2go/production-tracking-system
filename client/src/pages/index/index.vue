<template>
  <view class="container">
    <!-- Login gate -->
    <view v-if="!userStore.isLoggedIn" class="login-section">
      <view class="card login-card">
        <view class="login-logo">
          <UIcon name="check" :size="56" variant="primary" />
        </view>
        <text class="login-title">生产进度追踪</text>
        <text class="login-desc">产品加工进度管理</text>
        <view class="login-input-wrap">
          <input
            class="login-input"
            type="text"
            password
            v-model="loginPassword"
            placeholder="请输入密码"
            placeholder-class="login-placeholder"
            @confirm="handleLogin"
          />
        </view>
        <button class="btn btn-primary btn-block btn-lg login-btn" @click="handleLogin" :loading="loading">登录</button>
      </view>
    </view>

    <!-- Dashboard -->
    <view v-else>
      <!-- Stats cards -->
      <view class="stats-row">
        <view v-for="(card, i) in statCards" :key="i" class="stat-card">
          <text class="stat-value" :style="{ color: card.color }">{{ card.value }}</text>
          <text class="stat-label">{{ card.label }}</text>
        </view>
      </view>

      <!-- Anomaly alerts -->
      <view class="section-block" v-if="dashboard?.anomalies?.length">
        <view class="section-header">
          <view class="flex-center">
            <view class="badge alert-count">{{ dashboard.anomalies.length }}</view>
            <text class="section-title">异常预警</text>
          </view>
          <text class="collapse-btn" @click="collapsed.alerts = !collapsed.alerts">{{ collapsed.alerts ? '展开' : '收起' }}</text>
        </view>
        <view v-if="!collapsed.alerts" class="card alert-card">
          <view
            v-for="(a, i) in dashboard.anomalies.slice(0, 5)"
            :key="i"
            class="alert-item"
            @click="a.batchId && goBatchDetail(a.batchId)"
          >
            <view class="dot" :class="{ 'dot-danger': a.severity === 'critical', 'dot-warning': a.severity === 'major' }"></view>
            <text class="alert-content text-sm">{{ a.description }}</text>
            <UIcon v-if="a.batchId" name="chevron-right" :size="28" color="#c0c4cc" />
          </view>
        </view>
      </view>

      <!-- Quick actions for workers -->
      <view class="card quick-actions" v-if="!userStore.isAdmin()">
        <text class="section-title">快捷操作</text>
        <view class="action-grid">
          <view class="action-item" @click="goEntry">
            <UIcon name="plus" :size="48" variant="soft" />
            <text class="action-label">工序流转</text>
          </view>
          <view class="action-item" @click="go('/pages/progress/history')">
            <UIcon name="menu" :size="48" variant="soft-success" />
            <text class="action-label">我的记录</text>
          </view>
        </view>
      </view>

      <!-- Active batches kanban -->
      <view class="section-block">
        <view class="section-header">
          <text class="section-title">正在加工</text>
          <text class="collapse-btn" @click="collapsed.batches = !collapsed.batches">{{ collapsed.batches ? '展开' : '收起' }}</text>
        </view>
        <view v-if="!collapsed.batches">
          <scroll-view scroll-x class="kanban-scroll" v-if="visibleActiveBatches.length">
            <view class="kanban-board">
              <view v-for="col in kanbanColumns" :key="col.key" class="kanban-column">
                <view class="kanban-col-header">
                  <text class="kanban-col-name">{{ col.name }}</text>
                  <text class="kanban-col-count">{{ col.batches.length }}</text>
                </view>
                <view class="kanban-col-body">
                  <view
                    v-for="batch in col.batches"
                    :key="batch.id"
                    class="kanban-card"
                    @click="goBatchDetail(batch.id)"
                  >
                    <view class="kanban-card-top">
                      <text class="kanban-card-no">{{ batch.batchNo }}</text>
                      <view v-if="batch.priority === 'urgent'" class="urgent-tag">紧急</view>
                    </view>
                    <text class="kanban-card-model">{{ batch.product?.model || '-' }}</text>
                    <view class="kanban-card-meta">
                      <text class="kanban-card-qty">{{ batch.quantity }}只</text>
                      <text v-if="batch.packageType" class="kanban-pkg">{{ batch.packageType.split(',')[0].trim() }}</text>
                    </view>
                  </view>
                  <view v-if="!col.batches.length" class="kanban-empty">暂无</view>
                </view>
              </view>
            </view>
          </scroll-view>
          <view v-else class="empty-state card">
            <text>暂无正在加工批次</text>
          </view>
        </view>
      </view>

    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { onPullDownRefresh } from "@dcloudio/uni-app";
import { useUserStore } from "../../store/user";
import { useAppStore } from "../../store/app";
import { progressApi } from "../../api/modules";
import { getCurrentStage } from "../../utils/format";
import type { Batch, DashboardData } from "../../types";
import UIcon from "../../components/UIcon.vue";

const userStore = useUserStore();
const appStore = useAppStore();
const dashboard = ref<DashboardData | null>(null);
const loading = ref(false);
const loginPassword = ref("");
const collapsed = ref({ alerts: false, batches: false });

const statCards = computed(() => {
  if (!dashboard.value) return [];
  const s = dashboard.value.stats;
  return [
    { value: s.activeProductBatches, label: "在线产品总批次", color: "#0083ff" },
    { value: s.activeProductQuantity, label: "在线产品总数量", color: "#07c160" },
  ];
});

const visibleActiveBatches = computed(() =>
  dashboard.value?.activeBatchList ?? []
);

const kanbanColumns = computed(() => {
  const stages = appStore.stages.filter((s) => s.code !== "completed");
  const batches = visibleActiveBatches.value;
  const cols = stages.map((s) => ({
    key: `stage-${s.id}`,
    name: s.name,
    batches: batches.filter((b) => getCurrentStage(b)?.id === s.id),
  }));
  const notStarted = batches.filter((b) => getCurrentStage(b) === null);
  cols.push({ key: "not-started", name: "未开始", batches: notStarted });
  return cols;
});

async function handleLogin() {
  if (loading.value) return;
  if (!loginPassword.value.trim()) {
    uni.showToast({ title: "请输入密码", icon: "none" });
    return;
  }
  loading.value = true;
  try {
    await userStore.passwordLogin(loginPassword.value.trim());
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
  } catch { /* dashboard is non-critical */ }
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
/* Login */
.login-section {
  display: flex;
  justify-content: center;
  padding-top: 200rpx;
}
.login-card {
  width: 620rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 64rpx 48rpx;
}
.login-logo { margin-bottom: 24rpx; }
.login-title {
  font-size: 38rpx;
  font-weight: 700;
  color: #1f2329;
}
.login-desc {
  font-size: 26rpx;
  color: #8a8f99;
  margin-top: 8rpx;
}
.login-input-wrap {
  width: 100%;
  margin-top: 48rpx;
  border: 2rpx solid #e5e7eb;
  border-radius: 12rpx;
  background: #f7f8fa;
}
.login-input {
  width: 100%;
  height: 96rpx;
  padding: 0 24rpx;
  font-size: 30rpx;
  box-sizing: border-box;
}
.login-placeholder { color: #c0c4cc; }
.login-btn { margin-top: 24rpx; }

/* Stats */
.stats-row {
  display: flex;
  gap: 16rpx;
}
.stat-card {
  flex: 1;
  background: #fff;
  border-radius: 16rpx;
  box-shadow: 0 4rpx 16rpx rgba(17, 24, 39, 0.06);
  padding: 28rpx 12rpx;
  text-align: center;
}
.stat-value {
  display: block;
  font-size: 48rpx;
  font-weight: 700;
  line-height: 1.2;
}
.stat-label {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #8a8f99;
}

/* Sections */
.section-block { margin-top: 24rpx; }
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 4rpx;
  margin-bottom: 16rpx;
}

/* Alerts */
.alert-count { margin-right: 12rpx; }
.alert-card { padding: 8rpx 24rpx; }
.alert-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx 0;
  border-bottom: 2rpx solid #f0f1f4;
  &:last-child { border-bottom: none; }
}
.alert-content { flex: 1; }

/* Quick actions */
.quick-actions { padding-bottom: 28rpx; }
.action-grid {
  display: flex;
  gap: 40rpx;
  margin-top: 24rpx;
}
.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  min-width: 120rpx;
}
.action-label {
  font-size: 24rpx;
  color: #6b7280;
}

.activity-item { padding: 24rpx; }

.collapse-btn {
  font-size: 22rpx;
  color: #0083ff;
  padding: 6rpx 20rpx;
  border: 2rpx solid #0083ff;
  border-radius: 999rpx;
  background: #fff;
}

/* Kanban */
.kanban-scroll { white-space: nowrap; }
.kanban-board { display: inline-flex; gap: 16rpx; padding-bottom: 8rpx; }
.kanban-column {
  display: inline-block;
  width: 260rpx;
  vertical-align: top;
  background: #f7f8fa;
  border-radius: 12rpx;
  padding: 16rpx 12rpx;
}
.kanban-col-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
  padding: 0 4rpx;
}
.kanban-col-name { font-size: 24rpx; font-weight: 600; color: #1f2329; }
.kanban-col-count {
  font-size: 20rpx;
  background: #0083ff;
  color: #fff;
  border-radius: 999rpx;
  padding: 0 10rpx;
  min-width: 28rpx;
  text-align: center;
}
.kanban-col-body { display: flex; flex-direction: column; gap: 12rpx; }
.kanban-card {
  background: #fff;
  border-radius: 10rpx;
  padding: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(17, 24, 39, 0.05);
  &:active { background: #f5f5f5; }
}
.kanban-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6rpx;
}
.kanban-card-no { font-size: 24rpx; font-weight: 600; color: #1f2329; }
.kanban-card-model { font-size: 22rpx; color: #6b7280; display: block; }
.kanban-card-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8rpx;
}
.kanban-card-qty { font-size: 22rpx; color: #0083ff; font-weight: 500; }
.kanban-pkg {
  font-size: 18rpx;
  background: #e8f4ff;
  color: #0083ff;
  border-radius: 4rpx;
  padding: 2rpx 8rpx;
}
.kanban-empty {
  font-size: 22rpx;
  color: #c0c4cc;
  text-align: center;
  padding: 24rpx 0;
}
</style>
