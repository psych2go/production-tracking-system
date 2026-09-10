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
          <text class="stat-value">{{ card.value }}</text>
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
        <scroll-view v-if="!collapsed.alerts" scroll-x class="alert-scroll">
          <view class="alert-row">
            <view
              v-for="a in dashboard.anomalies"
              :key="a.batchId"
              class="alert-card"
              @click="a.batchId && goBatchDetail(a.batchId)"
            >
              <text class="alert-card-title">{{ [a.batchNo, a.productModel].filter(Boolean).join(' ') || '未知批次' }}</text>
              <view class="alert-card-days">
                <text class="alert-card-days-num">{{ a.value }}</text>
                <text class="alert-card-days-unit">天未更新</text>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- Pre-production tasks (admin only) -->
      <view v-if="userStore.isAdmin()" class="section-block">
        <view class="section-header">
          <view class="flex-center">
            <text class="section-title">待制卡</text>
            <text class="section-count">{{ pendingCardBatches.length }}</text>
          </view>
          <text class="collapse-btn" @click="collapsed.pendingCard = !collapsed.pendingCard">{{ collapsed.pendingCard ? '展开' : '收起' }}</text>
        </view>
        <scroll-view v-if="!collapsed.pendingCard && pendingCardBatches.length" scroll-x class="preproduction-scroll">
          <view class="preproduction-row">
            <view
              v-for="item in pendingCardBatches"
              :key="item.id"
              class="preproduction-block"
              :class="{ 'preproduction-block-paused': item.pausedAt }"
              @click="goBatchDetail(item.id)"
            >
              <view class="preproduction-block-top">
                <text class="preproduction-block-no">{{ item.orderNo }}</text>
                <view class="badge-group">
                  <view v-if="item.pausedAt" class="paused-tag">暂停中</view>
                  <view v-if="item.priority === 'urgent'" class="urgent-tag">紧急</view>
                </view>
              </view>
              <text class="preproduction-block-model">{{ item.product?.model || '' }}</text>
              <view class="preproduction-block-sub">
                <text class="preproduction-block-customer">{{ item.customerCode || '' }}</text>
                <text v-for="(pkg, i) in getPackageTypes(item)" :key="i" class="preproduction-block-pkg">{{ pkg }}</text>
              </view>
              <view class="preproduction-block-meta">
                <text class="preproduction-block-qty">{{ item.quantity }}只</text>
                <view class="preproduction-action" @click.stop="goCard(item.id)">去制卡 ›</view>
              </view>
              <text v-if="item.pausedAt" class="preproduction-block-pause-reason">暂停：{{ item.pauseReason }}</text>
            </view>
          </view>
        </scroll-view>
        <view v-else-if="!collapsed.pendingCard" class="empty-state card"><text>暂无待制卡订单</text></view>
      </view>

      <view v-if="userStore.isAdmin()" class="section-block">
        <view class="section-header">
          <view class="flex-center">
            <text class="section-title">待投产</text>
            <text class="section-count">{{ pendingProductionBatches.length }}</text>
          </view>
          <text class="collapse-btn" @click="collapsed.pendingProduction = !collapsed.pendingProduction">{{ collapsed.pendingProduction ? '展开' : '收起' }}</text>
        </view>
        <scroll-view v-if="!collapsed.pendingProduction && pendingProductionBatches.length" scroll-x class="preproduction-scroll">
          <view class="preproduction-row">
            <view
              v-for="item in pendingProductionBatches"
              :key="item.id"
              class="preproduction-block pending-production-block"
              :class="{ 'preproduction-block-paused': item.pausedAt }"
              @click="goBatchDetail(item.id)"
            >
              <view class="preproduction-block-top">
                <text class="preproduction-block-no">{{ item.batchNo }}</text>
                <view class="badge-group">
                  <view v-if="item.pausedAt" class="paused-tag">暂停中</view>
                  <view v-if="item.priority === 'urgent'" class="urgent-tag">紧急</view>
                </view>
              </view>
              <text class="preproduction-block-model">{{ item.product?.model || '' }}</text>
              <view class="preproduction-block-sub">
                <text class="preproduction-block-customer">{{ item.customerCode || '' }}</text>
                <text v-for="(pkg, i) in getPackageTypes(item)" :key="i" class="preproduction-block-pkg">{{ pkg }}</text>
              </view>
              <view class="preproduction-block-meta">
                <text class="preproduction-block-qty">{{ item.quantity }}只</text>
                <view class="preproduction-action" @click.stop="startProduction(item)">投入加工 ›</view>
              </view>
              <text v-if="item.pausedAt" class="preproduction-block-pause-reason">暂停：{{ item.pauseReason }}</text>
            </view>
          </view>
        </scroll-view>
        <view v-else-if="!collapsed.pendingProduction" class="empty-state card"><text>暂无待投产任务</text></view>
      </view>

      <!-- Active batches kanban -->
      <view class="section-block">
        <view class="section-header">
          <text class="section-title">正在加工</text>
          <view class="section-header-actions">
            <text class="collapse-btn" @click="collapsed.batches = !collapsed.batches">{{ collapsed.batches ? '展开' : '收起' }}</text>
          </view>
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
                    :class="{ 'kanban-card-paused': batch.pausedAt }"
                    @click="goBatchDetail(batch.id)"
                  >
                    <view class="kanban-card-top">
                      <text class="kanban-card-no">{{ batch.batchNo }}</text>
                      <view class="badge-group">
                        <view v-if="batch.pausedAt" class="paused-tag">暂停中</view>
                        <view v-if="batch.priority === 'urgent'" class="urgent-tag">紧急</view>
                      </view>
                    </view>
                    <text class="kanban-card-model">{{ batch.product?.model || '-' }}</text>
                    <view class="kanban-card-sub">
                      <text class="kanban-customer-code">{{ batch.customerCode || '-' }}</text>
                      <text v-if="kanbanGroupMode === 'stage' && batch.packageType" class="kanban-pkg">{{ getPrimaryPackageType(batch) }}</text>
                      <text v-else-if="kanbanGroupMode === 'package'" class="kanban-stage">{{ getCurrentStage(batch)?.name || firstStageName }}</text>
                    </view>
                    <view class="kanban-card-meta">
                      <text class="kanban-card-qty">{{ batch.quantity }}只</text>
                      <view v-if="!batch.pausedAt" class="kanban-action" @click.stop="goRecordProgress(batch.id)">流转 ›</view>
                    </view>
                    <text v-if="batch.pausedAt" class="kanban-paused-reason">暂停：{{ batch.pauseReason }}</text>
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

      <!-- Floating create-order button (admin only) -->
      <view v-if="userStore.isAdmin()" class="fab-create" @click="goCreateOrder">
        <view class="fab-circle">
          <UIcon name="plus" :size="44" color="#ffffff" />
        </view>
        <text class="fab-label">订单录入</text>
      </view>

    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { onPullDownRefresh, onShow } from "@dcloudio/uni-app";
import { useUserStore } from "../../store/user";
import { useAppStore } from "../../store/app";
import { batchApi, progressApi } from "../../api/modules";
import { getCurrentStage } from "../../utils/format";
import type { Batch, DashboardData } from "../../types";
import UIcon from "../../components/UIcon.vue";

const userStore = useUserStore();
const appStore = useAppStore();
const dashboard = ref<DashboardData | null>(null);
const loading = ref(false);
const loginPassword = ref("");
const collapsed = ref({ alerts: false, pendingCard: false, pendingProduction: false, batches: false });
const kanbanGroupMode = ref<"stage" | "package">("stage");

const pendingCardBatches = computed(() => dashboard.value?.pendingCardList ?? []);
const pendingProductionBatches = computed(() => dashboard.value?.pendingProductionList ?? []);

const statCards = computed(() => {
  if (!dashboard.value) return [];
  const s = dashboard.value.stats;
  const cards = [
    { value: s.activeProductBatches, label: "在线产品总批次" },
    { value: s.activeProductQuantity, label: "在线产品总数量" },
  ];
  if (userStore.isAdmin()) {
    cards.push(
      { value: pendingCardBatches.value.length, label: "待制卡批次" },
      { value: pendingProductionBatches.value.length, label: "待投产批次" },
    );
  }
  return cards;
});

const visibleActiveBatches = computed(() => dashboard.value?.activeBatchList ?? []);

const firstStageName = computed(() => appStore.stages.find((s) => s.code !== "completed")?.name || "来料检验");

function getPrimaryPackageType(batch: Batch): string {
  return batch.packageType?.split(",")[0]?.trim() || "未设置封装";
}

function getPackageTypes(batch: Batch): string[] {
  return (batch.packageType || "").split(",").map((s) => s.trim()).filter(Boolean);
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
  // 投入加工后批次即进入首道工序（来料检验），尚无流转记录的批次归入首道工序列
  return stages.map((s, i) => ({
    key: `stage-${s.id}`,
    name: s.name,
    batches: batches.filter(
      (b) => getCurrentStage(b)?.id === s.id || (i === 0 && getCurrentStage(b) === null),
    ),
  }));
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
  uni.navigateTo({ url: `/pages/batch/detail?id=${id}&from=home` });
}

function goRecordProgress(id: number) {
  uni.navigateTo({ url: `/pages/progress/entry?batchId=${id}&returnTo=home` });
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
    await loadData();
  } catch (e: unknown) {
    uni.showModal({ title: "操作失败", content: (e as Error).message, showCancel: false });
  }
}

function goCreateOrder() {
  uni.navigateTo({ url: "/pages/batch/create" });
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
  gap: 12rpx;
}
.stat-card {
  position: relative;
  flex: 1;
  min-width: 0;
  background: #fff;
  border: 2rpx solid #dfe4e4;
  border-radius: 12rpx;
  box-shadow: 0 5rpx 18rpx rgba(23, 35, 39, 0.06);
  padding: 18rpx 14rpx 16rpx;
  overflow: hidden;
}
.stat-card::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 6rpx;
  background: #087f8c;
}
.stat-card-2::before {
  background: #d97706;
}
.stat-card-3::before {
  background: #c9483f;
}
.stat-card-4::before {
  background: #27865f;
}
.stat-value {
  display: block;
  color: #172327;
  font-size: 38rpx;
  font-weight: 700;
  line-height: 1.2;
}
.stat-label {
  display: block;
  margin-top: 4rpx;
  font-size: 18rpx;
  color: #657174;
  white-space: nowrap;
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
.alert-scroll { white-space: nowrap; }
.alert-row { display: inline-flex; gap: 14rpx; padding: 2rpx 2rpx 10rpx; }
.alert-card {
  display: inline-block;
  width: 264rpx;
  padding: 16rpx;
  vertical-align: top;
  background: #fff;
  border: 2rpx solid #dfe4e4;
  border-top: 6rpx solid #c9483f;
  border-radius: 10rpx;
  box-shadow: 0 2rpx 8rpx rgba(23, 35, 39, 0.04);
  &:active { border-color: #c9483f; }
}
.alert-card-title {
  display: block;
  overflow: hidden;
  color: #657174;
  font-size: 20rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.alert-card-days {
  display: flex;
  align-items: baseline;
  gap: 6rpx;
  margin-top: 8rpx;
}
.alert-card-days-num {
  color: #c9483f;
  font-size: 40rpx;
  font-weight: 700;
  line-height: 1.1;
}
.alert-card-days-unit {
  color: #c9483f;
  font-size: 20rpx;
  font-weight: 600;
}

.section-header-actions {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.collapse-btn {
  padding: 8rpx 4rpx 8rpx 16rpx;
  color: #087f8c;
  font-size: 22rpx;
}

/* Pre-production */
.paused-tag {
  flex-shrink: 0;
  padding: 3rpx 10rpx;
  border-radius: 6rpx;
  background: #c9483f;
  color: #fff;
  font-size: 20rpx;
  font-weight: 600;
  white-space: nowrap;
}
.section-count {
  min-width: 34rpx;
  margin-left: 10rpx;
  padding: 1rpx 8rpx;
  border-radius: 5rpx;
  background: #edf0f0;
  color: #657174;
  font-size: 20rpx;
  text-align: center;
}
.preproduction-scroll { white-space: nowrap; }
.preproduction-row { display: inline-flex; gap: 14rpx; padding: 2rpx 2rpx 10rpx; }
.preproduction-block {
  display: inline-block;
  width: 282rpx;
  padding: 16rpx;
  vertical-align: top;
  background: #fff;
  border: 2rpx solid #dfe4e4;
  border-left: 6rpx solid #d97706;
  border-radius: 10rpx;
  box-shadow: 0 2rpx 8rpx rgba(23, 35, 39, 0.04);
  &:active { border-color: #d97706; }
  &.pending-production-block { border-left-color: #087f8c; }
  &.preproduction-block-paused { border-color: #c9483f; box-shadow: 0 2rpx 10rpx rgba(201, 72, 63, 0.18); }
}
.preproduction-block-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 6rpx;
}
.preproduction-block-no {
  overflow: hidden;
  min-width: 0;
  color: #657174;
  font-size: 22rpx;
  font-weight: 400;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.preproduction-block-model {
  display: block;
  overflow: hidden;
  color: #172327;
  font-size: 22rpx;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.preproduction-block-pause-reason {
  display: block;
  margin-top: 8rpx;
  color: #c9483f;
  font-size: 20rpx;
  font-weight: 600;
  line-height: 1.5;
  white-space: normal;
  word-break: break-all;
}
.preproduction-block-sub {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4rpx 8rpx;
  margin-top: 6rpx;
  min-width: 0;
}
.preproduction-block-customer {
  display: block;
  overflow: hidden;
  min-width: 0;
  color: #7d898b;
  font-size: 20rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.preproduction-block-pkg {
  flex-shrink: 0;
  margin-left: auto;
  overflow: hidden;
  max-width: 150rpx;
  color: #657174;
  font-size: 20rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.preproduction-block-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10rpx;
}
.preproduction-block-qty { font-size: 22rpx; color: #087f8c; font-weight: 700; }
.preproduction-action {
  flex-shrink: 0;
  padding: 8rpx 13rpx;
  border-radius: 6rpx;
  background: #e6f4f3;
  color: #075e68;
  font-size: 21rpx;
  font-weight: 600;
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
  &.kanban-card-paused { border-color: #c9483f; box-shadow: 0 2rpx 10rpx rgba(201, 72, 63, 0.18); }
}
.kanban-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6rpx;
}
.kanban-card-no { font-size: 24rpx; font-weight: 400; color: #657174; }
.kanban-paused-reason {
  display: block;
  margin-top: 8rpx;
  color: #c9483f;
  font-size: 20rpx;
  font-weight: 600;
  line-height: 1.5;
  white-space: normal;
  word-break: break-all;
}
.kanban-card-model {
  display: block;
  overflow: hidden;
  color: #172327;
  font-size: 22rpx;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.kanban-card-sub {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4rpx 8rpx;
  margin-top: 5rpx;
  min-width: 0;
}
.kanban-customer-code {
  display: block;
  overflow: hidden;
  min-width: 0;
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
.kanban-action {
  flex-shrink: 0;
  padding: 8rpx 13rpx;
  border-radius: 6rpx;
  background: #e6f4f3;
  color: #075e68;
  font-size: 21rpx;
  font-weight: 600;
}
.kanban-pkg {
  margin-left: auto;
  overflow: hidden;
  max-width: 140rpx;
  color: #657174;
  font-size: 20rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.kanban-stage {
  margin-left: auto;
  overflow: hidden;
  max-width: 140rpx;
  color: #657174;
  font-size: 20rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.kanban-empty {
  font-size: 22rpx;
  color: #c0c4cc;
  text-align: center;
  padding: 24rpx 0;
}

/* Floating create-order button */
.fab-create {
  position: fixed;
  right: 36rpx;
  bottom: 160rpx;
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}
.fab-circle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: #087f8c;
  box-shadow: 0 8rpx 24rpx rgba(8, 127, 140, 0.35);
  transition: transform 0.15s;
  &:active { transform: scale(0.92); }
}
.fab-label {
  padding: 3rpx 12rpx;
  border: 2rpx solid #dfe4e4;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.95);
  color: #087f8c;
  font-size: 20rpx;
  font-weight: 700;
  white-space: nowrap;
}
</style>
