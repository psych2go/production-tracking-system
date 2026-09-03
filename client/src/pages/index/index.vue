<template>
  <view class="container">
    <!-- Login gate -->
    <view v-if="!userStore.isLoggedIn" class="login-section">
      <view class="card login-card">
        <view class="login-brand">
          <view class="login-logo">
            <UIcon name="check" :size="52" variant="primary" />
          </view>
          <view class="brand-rule"></view>
          <text class="brand-code">PTS</text>
        </view>
        <text class="login-title">生产进度追踪</text>
        <text class="login-desc">车间生产控制台</text>
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
      <view class="dashboard-heading">
        <view>
          <text class="dashboard-kicker">PRODUCTION CONTROL</text>
          <text class="dashboard-title">生产总览</text>
        </view>
        <view class="live-status">
          <view class="live-dot"></view>
          <text>实时</text>
        </view>
      </view>

      <!-- Stats cards -->
      <view class="stats-row">
        <view v-for="(card, i) in statCards" :key="i" class="stat-card" :class="`stat-card-${i + 1}`">
          <view class="stat-index">0{{ i + 1 }}</view>
          <view>
            <text class="stat-value">{{ card.value }}</text>
            <text class="stat-label">{{ card.label }}</text>
          </view>
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
            <view class="action-copy">
              <text class="action-label">工序流转</text>
              <text class="action-meta">录入当前进度</text>
            </view>
            <UIcon name="chevron-right" :size="30" color="#7d898b" />
          </view>
          <view class="action-item" @click="go('/pages/progress/history')">
            <UIcon name="menu" :size="48" variant="soft-success" />
            <view class="action-copy">
              <text class="action-label">我的记录</text>
              <text class="action-meta">查看流转历史</text>
            </view>
            <UIcon name="chevron-right" :size="30" color="#7d898b" />
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
          <view class="kanban-mode-switch">
            <view
              class="kanban-mode-option"
              :class="{ active: kanbanGroupMode === 'stage' }"
              @click="kanbanGroupMode = 'stage'"
            >按工序</view>
            <view
              class="kanban-mode-option"
              :class="{ active: kanbanGroupMode === 'package' }"
              @click="kanbanGroupMode = 'package'"
            >按封装形式</view>
          </view>
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
                    <text class="kanban-customer-code">{{ batch.customerCode || '-' }}</text>
                    <view class="kanban-card-meta">
                      <text class="kanban-card-qty">{{ batch.quantity }}只</text>
                      <text v-if="kanbanGroupMode === 'stage' && batch.packageType" class="kanban-pkg">{{ getPrimaryPackageType(batch) }}</text>
                      <text v-else-if="kanbanGroupMode === 'package'" class="kanban-stage">{{ getCurrentStage(batch)?.name || '未开始' }}</text>
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
import { onPullDownRefresh, onShow } from "@dcloudio/uni-app";
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
const kanbanGroupMode = ref<"stage" | "package">("stage");

const statCards = computed(() => {
  if (!dashboard.value) return [];
  const s = dashboard.value.stats;
  return [
    { value: s.activeProductBatches, label: "在线产品总批次" },
    { value: s.activeProductQuantity, label: "在线产品总数量" },
  ];
});

const visibleActiveBatches = computed(() =>
  dashboard.value?.activeBatchList ?? []
);

function getPrimaryPackageType(batch: Batch): string {
  return batch.packageType?.split(",")[0]?.trim() || "未设置封装";
}

const kanbanColumns = computed(() => {
  const batches = visibleActiveBatches.value;

  if (kanbanGroupMode.value === "package") {
    const packageNames = [...new Set(batches.map(getPrimaryPackageType))].sort((a, b) => {
      if (a === "未设置封装") return 1;
      if (b === "未设置封装") return -1;
      return a.localeCompare(b, "zh-CN");
    });

    return packageNames.map((name) => ({
      key: `package-${name}`,
      name,
      batches: batches.filter((batch) => getPrimaryPackageType(batch) === name),
    }));
  }

  const stages = appStore.stages.filter((s) => s.code !== "completed");
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

onShow(() => {
  if (userStore.isLoggedIn) {
    loadData();
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
  min-height: calc(100vh - 220rpx);
  align-items: center;
  padding: 48rpx 0;
}
.login-card {
  width: 620rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 56rpx 48rpx 48rpx;
  overflow: hidden;
  border-top: 8rpx solid #087f8c;
  box-shadow: 0 18rpx 48rpx rgba(23, 35, 39, 0.12);
}
.login-card::after {
  content: "";
  position: absolute;
  right: -60rpx;
  top: -60rpx;
  width: 180rpx;
  height: 180rpx;
  border: 2rpx solid rgba(8, 127, 140, 0.12);
  transform: rotate(45deg);
}
.login-brand {
  display: flex;
  align-items: center;
  margin-bottom: 28rpx;
}
.brand-rule {
  width: 2rpx;
  height: 40rpx;
  margin: 0 18rpx;
  background: #cbd2d2;
}
.brand-code {
  color: #657174;
  font-size: 22rpx;
  font-weight: 700;
}
.login-title {
  font-size: 40rpx;
  font-weight: 700;
  color: #172327;
}
.login-desc {
  font-size: 24rpx;
  color: #657174;
  margin-top: 8rpx;
}
.login-input-wrap {
  width: 100%;
  margin-top: 44rpx;
  border: 2rpx solid #dfe4e4;
  border-radius: 10rpx;
  background: #f5f7f7;
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

/* Heading */
.dashboard-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin: 8rpx 0 24rpx;
}
.dashboard-kicker {
  display: block;
  color: #087f8c;
  font-size: 18rpx;
  font-weight: 700;
}
.dashboard-title {
  display: block;
  margin-top: 4rpx;
  color: #172327;
  font-size: 42rpx;
  font-weight: 700;
}
.live-status {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 8rpx 14rpx;
  border: 2rpx solid #cbd2d2;
  border-radius: 6rpx;
  color: #657174;
  font-size: 22rpx;
  background: rgba(255, 255, 255, 0.76);
}
.live-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: #27865f;
  box-shadow: 0 0 0 6rpx rgba(39, 134, 95, 0.12);
}

/* Stats */
.stats-row {
  display: flex;
  gap: 16rpx;
}
.stat-card {
  position: relative;
  flex: 1;
  background: #fff;
  border: 2rpx solid #dfe4e4;
  border-radius: 12rpx;
  box-shadow: 0 5rpx 18rpx rgba(23, 35, 39, 0.06);
  padding: 26rpx 22rpx 24rpx;
  overflow: hidden;
}
.stat-card::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 7rpx;
  background: #087f8c;
}
.stat-card-2::before {
  background: #d97706;
}
.stat-index {
  position: absolute;
  right: 16rpx;
  top: 12rpx;
  color: #cbd2d2;
  font-size: 18rpx;
  font-weight: 700;
}
.stat-value {
  display: block;
  color: #172327;
  font-size: 52rpx;
  font-weight: 700;
  line-height: 1.2;
}
.stat-label {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #657174;
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
.alert-count { margin-right: 12rpx; background: #c9483f; }
.alert-card { padding: 8rpx 24rpx; border-left: 6rpx solid #c9483f; }
.alert-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx 0;
  border-bottom: 2rpx solid #edf0f0;
  &:last-child { border-bottom: none; }
}
.alert-content { flex: 1; }

/* Quick actions */
.quick-actions { padding-bottom: 12rpx; }
.action-grid {
  display: flex;
  flex-direction: column;
  margin-top: 14rpx;
}
.action-item {
  display: flex;
  align-items: center;
  gap: 18rpx;
  min-height: 86rpx;
  border-bottom: 2rpx solid #edf0f0;
  &:last-child { border-bottom: none; }
}
.action-copy {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.action-label {
  font-size: 27rpx;
  font-weight: 600;
  color: #172327;
}
.action-meta {
  margin-top: 2rpx;
  font-size: 21rpx;
  color: #7d898b;
}

.activity-item { padding: 24rpx; }

.collapse-btn {
  font-size: 22rpx;
  color: #087f8c;
  padding: 8rpx 4rpx 8rpx 20rpx;
}

/* Kanban */
.kanban-mode-switch {
  display: inline-flex;
  margin: 0 2rpx 16rpx;
  padding: 5rpx;
  border: 2rpx solid #dfe4e4;
  border-radius: 9rpx;
  background: #edf1f1;
}
.kanban-mode-option {
  min-width: 112rpx;
  padding: 10rpx 20rpx;
  border-radius: 6rpx;
  color: #657174;
  font-size: 22rpx;
  font-weight: 600;
  line-height: 1.2;
  text-align: center;
  transition: color 0.2s, background-color 0.2s, box-shadow 0.2s;
  &.active {
    color: #fff;
    background: #087f8c;
    box-shadow: 0 3rpx 8rpx rgba(8, 127, 140, 0.22);
  }
}
.kanban-scroll { white-space: nowrap; }
.kanban-board { display: inline-flex; gap: 16rpx; padding: 2rpx 2rpx 10rpx; }
.kanban-column {
  display: inline-block;
  width: 274rpx;
  vertical-align: top;
  background: #e9eeee;
  border-radius: 10rpx;
  padding: 16rpx 12rpx;
  border-top: 5rpx solid #7d898b;
}
.kanban-col-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
  padding: 0 4rpx;
}
.kanban-col-name { font-size: 24rpx; font-weight: 700; color: #2c383c; }
.kanban-col-count {
  font-size: 20rpx;
  background: #087f8c;
  color: #fff;
  border-radius: 5rpx;
  padding: 0 10rpx;
  min-width: 28rpx;
  text-align: center;
}
.kanban-col-body { display: flex; flex-direction: column; gap: 12rpx; }
.kanban-card {
  background: #fff;
  border-radius: 8rpx;
  padding: 16rpx;
  border: 2rpx solid #dfe4e4;
  box-shadow: 0 2rpx 8rpx rgba(23, 35, 39, 0.04);
  &:active { border-color: #087f8c; }
}
.kanban-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6rpx;
}
.kanban-card-no { font-size: 24rpx; font-weight: 700; color: #172327; }
.kanban-card-model {
  display: block;
  overflow: hidden;
  color: #657174;
  font-size: 22rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.kanban-customer-code {
  display: block;
  overflow: hidden;
  margin-top: 5rpx;
  color: #7d898b;
  font-size: 20rpx;
  font-weight: 400;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.kanban-card-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10rpx;
}
.kanban-card-qty { font-size: 22rpx; color: #087f8c; font-weight: 700; }
.kanban-pkg,
.kanban-stage {
  overflow: hidden;
  max-width: 128rpx;
  border-radius: 4rpx;
  padding: 2rpx 8rpx;
  font-size: 18rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.kanban-pkg {
  background: #e6f4f3;
  color: #075e68;
}
.kanban-stage {
  background: #fff1dc;
  color: #9a5a00;
}
.kanban-empty {
  font-size: 22rpx;
  color: #c0c4cc;
  text-align: center;
  padding: 24rpx 0;
}
</style>
