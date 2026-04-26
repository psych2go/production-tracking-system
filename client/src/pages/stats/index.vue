<template>
  <view class="container">
    <!-- Tab bar -->
    <view class="tabs">
      <view
        v-for="tab in tabs"
        :key="tab.key"
        :class="['tab-item', { active: activeTab === tab.key }]"
        @click="switchTab(tab.key)"
      >
        <text>{{ tab.label }}</text>
      </view>
    </view>

    <!-- Export button -->
    <view class="card export-bar">
      <view class="export-left">
        <text class="export-hint" v-if="activeTab === 'online'">统计规则：分别统计在线产品和在线试验的详细信息及当前工序</text>
        <text class="export-hint" v-else-if="activeTab === 'durations'">统计规则：耗时 = 相邻两道工序流转记录的时间差，按工序汇总平均/最短/最长值</text>
        <text class="export-hint" v-else-if="activeTab === 'production'">统计规则：仅统计产品批次（不含试验），按完成日期汇总产量（加工数量之和）</text>
        <text class="export-hint" v-else>统计规则：活跃批次超过 5 天无进度更新则标记为延迟预警</text>
      </view>
      <button class="btn-export" @click="onExport">导出 Excel</button>
    </view>

    <!-- Tab: Online batches -->
    <view v-if="activeTab === 'online'">
      <!-- Product batches -->
      <view class="card">
        <text class="section-title text-bold">在线产品</text>
        <scroll-view scroll-x class="mt-sm" v-if="onlineProducts.length">
          <view class="online-table">
            <view class="online-header">
              <text class="online-col online-col-no">生产批号</text>
              <text class="online-col online-col-model">产品型号</text>
              <text class="online-col online-col-qty">数量</text>
              <text class="online-col online-col-pkg">封装形式</text>
              <text class="online-col online-col-customer">客户代码</text>
              <text class="online-col online-col-order">订单编号</text>
              <text class="online-col online-col-priority">优先级</text>
              <text class="online-col online-col-delivery">客户要求交期</text>
              <text class="online-col online-col-delivery">生产预计交期</text>
              <text class="online-col online-col-stage">当前工序</text>
              <text class="online-col online-col-notes">备注</text>
              <text class="online-col online-col-date">创建时间</text>
            </view>
            <view v-for="batch in onlineProducts" :key="batch.id" class="online-row" @click="goBatchDetail(batch.id)">
              <text class="online-col online-col-no">{{ batch.batchNo }}</text>
              <text class="online-col online-col-model">{{ batch.product?.model || '-' }}</text>
              <text class="online-col online-col-qty">{{ batch.quantity }}</text>
              <text class="online-col online-col-pkg">{{ batch.packageType || '-' }}</text>
              <text class="online-col online-col-customer">{{ batch.customerCode || '-' }}</text>
              <text class="online-col online-col-order">{{ batch.orderNo || '-' }}</text>
              <text class="online-col online-col-priority">
                <text v-if="batch.priority === 'urgent'" class="urgent-tag">紧急</text>
                <text v-else>普通</text>
              </text>
              <text class="online-col online-col-delivery">{{ batch.customerDelivery ? batch.customerDelivery.slice(0, 10) : '-' }}</text>
              <text class="online-col online-col-delivery">{{ batch.productionDelivery ? batch.productionDelivery.slice(0, 10) : '-' }}</text>
              <text class="online-col online-col-stage">{{ getBatchStageName(batch) }}</text>
              <text class="online-col online-col-notes">{{ batch.notes || '-' }}</text>
              <text class="online-col online-col-date">{{ batch.createdAt.slice(0, 10) }}</text>
            </view>
          </view>
        </scroll-view>
        <view v-else class="empty-chart">
          <text class="text-secondary">暂无在线产品批次</text>
        </view>
      </view>

      <!-- Trial batches -->
      <view class="card mt-md">
        <text class="section-title text-bold">在线试验</text>
        <scroll-view scroll-x class="mt-sm" v-if="onlineTrials.length">
          <view class="online-table">
            <view class="online-header">
              <text class="online-col trial-col-no">批号</text>
              <text class="online-col trial-col-content">试验内容</text>
              <text class="online-col trial-col-pkg">封装形式</text>
              <text class="online-col trial-col-qty">数量</text>
              <text class="online-col trial-col-deadline">要求完成时间</text>
              <text class="online-col trial-col-notes">备注</text>
              <text class="online-col trial-col-stage">当前工序</text>
              <text class="online-col trial-col-date">创建时间</text>
            </view>
            <view v-for="batch in onlineTrials" :key="batch.id" class="online-row" @click="goBatchDetail(batch.id)">
              <text class="online-col trial-col-no">{{ batch.batchNo }}</text>
              <text class="online-col trial-col-content">{{ batch.trialContent || '-' }}</text>
              <text class="online-col trial-col-pkg">{{ batch.packageType || '-' }}</text>
              <text class="online-col trial-col-qty">{{ formatTrialQty(batch) }}</text>
              <text class="online-col trial-col-deadline">{{ batch.customerDelivery ? batch.customerDelivery.slice(0, 10) : '-' }}</text>
              <text class="online-col trial-col-notes">{{ batch.notes || '-' }}</text>
              <text class="online-col trial-col-stage">{{ getBatchStageName(batch) }}</text>
              <text class="online-col trial-col-date">{{ batch.createdAt.slice(0, 10) }}</text>
            </view>
          </view>
        </scroll-view>
        <view v-else class="empty-chart">
          <text class="text-secondary">暂无在线试验批次</text>
        </view>
      </view>
    </view>

    <!-- Tab: Durations -->
    <view v-if="activeTab === 'durations'" class="card">
      <text class="section-title text-bold">工序耗时</text>
      <view class="filter-bar mt-sm">
        <picker :range="timeRanges" :range-key="'label'" @change="onTimeRange">
          <view class="filter-btn">{{ selectedRange.label }}</view>
        </picker>
      </view>
      <Charts v-if="durationData.series.length" type="bar" :chartData="durationData" :height="450" />
      <view v-else class="empty-chart">
        <text class="text-secondary">暂无耗时数据</text>
      </view>
      <view class="data-table mt-md" v-if="durationList.length">
        <view class="table-header">
          <text class="col col-name">工序</text>
          <text class="col">平均(分钟)</text>
          <text class="col">最短(分钟)</text>
          <text class="col">最长(分钟)</text>
          <text class="col">样本</text>
        </view>
        <view v-for="(item, i) in durationList" :key="i" class="table-row">
          <text class="col col-name">{{ item.stageName }}</text>
          <text class="col">{{ item.avgMinutes }}</text>
          <text class="col">{{ item.minMinutes }}</text>
          <text class="col">{{ item.maxMinutes }}</text>
          <text class="col">{{ item.recordCount }}</text>
        </view>
      </view>
    </view>

    <!-- Tab: Production -->
    <view v-if="activeTab === 'production'" class="card">
      <text class="section-title text-bold">产量趋势</text>
      <view class="filter-bar mt-sm">
        <view
          v-for="g in groupOptions"
          :key="g.value"
          :class="['filter-btn', { active: groupBy === g.value }]"
          @click="groupBy = g.value; loadProduction()"
        >
          {{ g.label }}
        </view>
      </view>
      <Charts v-if="productionData.series.length" type="line" :chartData="productionData" :height="450" />
      <view v-else class="empty-chart">
        <text class="text-secondary">暂无产量数据</text>
      </view>
    </view>

    <!-- Tab: Anomalies (batch delay only) -->
    <view v-if="activeTab === 'anomalies'" class="card">
      <text class="section-title text-bold">批次延迟预警</text>
      <view v-if="anomalies.length === 0" class="empty-chart">
        <text class="text-success">暂无延迟批次</text>
      </view>
      <view v-for="(a, i) in anomalies" :key="i" class="anomaly-item sev-major" @click="a.batchId && goBatchDetail(a.batchId)">
        <view class="flex-between">
          <text class="text-bold">{{ a.batchNo }}</text>
          <text class="severity-tag tag-major">延迟</text>
        </view>
        <text class="text-sm mt-sm">{{ a.description }}</text>
        <text class="text-sm text-primary mt-sm">点击查看详情 ></text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { statsApi, batchApi } from "../../api/modules";
import { useAppStore } from "../../store/app";
import { useUserStore } from "../../store/user";
import { getCurrentStage } from "../../utils/format";
import type { Batch, ProcessDurationData, ProductionTrendData, AnomalyItem } from "../../types";
import Charts from "../../components/Charts.vue";

const appStore = useAppStore();
const userStore = useUserStore();

const tabs = [
  { key: "online", label: "在线" },
  { key: "durations", label: "耗时" },
  { key: "production", label: "产量" },
  { key: "anomalies", label: "预警" },
];

const timeRanges = [
  { label: "近7天", value: 7 },
  { label: "近30天", value: 30 },
  { label: "全部", value: 0 },
];

const groupOptions = [
  { label: "按天", value: "day" },
  { label: "按周", value: "week" },
  { label: "按月", value: "month" },
];

const activeTab = ref("online");
const selectedRange = ref(timeRanges[1]);
const groupBy = ref("day");

const durationList = ref<ProcessDurationData[]>([]);
const productionList = ref<ProductionTrendData[]>([]);
const anomalies = ref<AnomalyItem[]>([]);
const onlineBatches = ref<Batch[]>([]);
const onlineProducts = computed(() => onlineBatches.value.filter(b => b.batchType === "product"));
const onlineTrials = computed(() => onlineBatches.value.filter(b => b.batchType === "trial"));

function formatTrialQty(batch: Batch): string {
  if (batch.quantityDetail) {
    try {
      const parsed = JSON.parse(batch.quantityDetail);
      const parts: string[] = [];
      if (parsed["条"] && Number(parsed["条"]) > 0) parts.push(`${parsed["条"]}条`);
      if (parsed["只"] && Number(parsed["只"]) > 0) parts.push(`${parsed["只"]}只`);
      if (parts.length) return parts.join("+");
    } catch { /* fallback */ }
  }
  return batch.quantity ? String(batch.quantity) : "-";
}

function getBatchStageName(batch: Batch): string {
  return getCurrentStage(batch)?.name || '未开始';
}

const durationData = computed(() => ({
  categories: durationList.value.map((d) => d.stageName),
  series: [{ name: "平均耗时(分钟)", data: durationList.value.map((d) => d.avgMinutes) }],
}));

const productionData = computed(() => ({
  categories: productionList.value.map((p) => p.period.slice(5)),
  series: [{ name: "产量", data: productionList.value.map((p) => p.totalQuantity) }],
}));

function getDateRange() {
  if (selectedRange.value.value === 0) return {};
  const endDate = new Date().toISOString().slice(0, 10);
  const d = new Date();
  d.setDate(d.getDate() - selectedRange.value.value);
  const startDate = d.toISOString().slice(0, 10);
  return { startDate, endDate };
}

function switchTab(key: string) {
  activeTab.value = key;
  loadData();
}

function onTimeRange(e: { detail: { value: number } }) {
  selectedRange.value = timeRanges[e.detail.value];
  loadData();
}

function onExport() {
  const type = activeTab.value;
  const range = getDateRange();
  const exportInfo = statsApi.exportExcel(type, range);
  const token = userStore.token;
  // #ifdef H5
  // Use fetch + blob to avoid leaking token in URL
  fetch(exportInfo.url, {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((res) => {
      if (!res.ok) throw new Error("导出失败");
      return res.blob();
    })
    .then((blob) => {
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `${type}_report.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    })
    .catch(() => uni.showToast({ title: "导出失败", icon: "none" }));
  // #endif
  // #ifndef H5
  uni.downloadFile({
    url: exportInfo.url,
    header: { Authorization: `Bearer ${token}` },
    success: (res) => {
      if (res.statusCode === 200) {
        uni.openDocument({ filePath: res.tempFilePath, fileType: "xlsx" });
      } else {
        uni.showToast({ title: "导出失败", icon: "none" });
      }
    },
    fail: () => {
      uni.showToast({ title: "导出失败", icon: "none" });
    },
  });
  // #endif
}

async function loadData() {
  const range = getDateRange();
  try {
    switch (activeTab.value) {
      case "online": {
        const res = await batchApi.list({ status: "active", pageSize: 9999 });
        onlineBatches.value = res.items;
        break;
      }
      case "durations": {
        const data = await statsApi.durations(range);
        durationList.value = data;
        break;
      }
      case "production": {
        await loadProduction();
        break;
      }
      case "anomalies": {
        const data = await statsApi.anomalies();
        anomalies.value = data;
        break;
      }
    }
  } catch (e: unknown) {
    uni.showToast({ title: (e as Error).message, icon: "none" });
  }
}

async function loadProduction() {
  const range = getDateRange();
  const data = await statsApi.production({ groupBy: groupBy.value, ...range });
  productionList.value = data;
}

onMounted(async () => {
  await appStore.loadStages();
  loadData();
});

function goBatchDetail(id: number) {
  uni.navigateTo({ url: `/pages/batch/detail?id=${id}` });
}
</script>

<style scoped lang="scss">
.tabs {
  display: flex;
  background: #fff;
  border-radius: 12rpx;
  margin-bottom: 16rpx;
  overflow: hidden;
}
.tab-item {
  flex: 1;
  text-align: center;
  padding: 20rpx 0;
  font-size: 26rpx;
  color: #666;
  border-bottom: 4rpx solid transparent;
  &.active {
    color: #0083ff;
    border-bottom-color: #0083ff;
    font-weight: bold;
  }
}
.export-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 24rpx;
}
.export-left { flex: 1; margin-right: 20rpx; }
.export-hint {
  font-size: 22rpx;
  color: #999;
  line-height: 1.6;
}
.btn-export {
  font-size: 24rpx;
  padding: 8rpx 24rpx;
  background: #0083ff;
  color: #fff;
  border: none;
  border-radius: 8rpx;
}
.section-title { font-size: 32rpx; }
.filter-bar { display: flex; gap: 16rpx; flex-wrap: wrap; }
.filter-btn {
  font-size: 24rpx;
  padding: 8rpx 20rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
  color: #666;
  &.active { background: #0083ff; color: #fff; }
}
.empty-chart { text-align: center; padding: 60rpx 0; }
.data-table { width: 100%; }
.table-header {
  display: flex;
  padding: 14rpx 0;
  border-bottom: 2rpx solid #e5e5e5;
  font-size: 22rpx;
  color: #999;
}
.table-row {
  display: flex;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
  font-size: 24rpx;
  &:last-child { border-bottom: none; }
}
.col { flex: 1; text-align: center; }
.col-name { flex: 1.5; text-align: left; }
.text-success { color: #07c160; }
.anomaly-item {
  padding: 20rpx;
  margin-top: 16rpx;
  border-radius: 12rpx;
  border-left: 6rpx solid #ff9900;
  &.sev-major { border-left-color: #ff9900; background: #fffbf0; }
}
.severity-tag {
  font-size: 22rpx;
  padding: 2rpx 12rpx;
  border-radius: 6rpx;
}
.tag-major { background: #fff8e8; color: #ff9900; }

/* Online table */
.online-table {
  min-width: 1100rpx;
}
.online-header {
  display: flex;
  padding: 14rpx 0;
  border-bottom: 2rpx solid #e5e5e5;
  font-size: 22rpx;
  color: #999;
  background: #fafafa;
}
.online-row {
  display: flex;
  padding: 18rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
  font-size: 24rpx;
  &:last-child { border-bottom: none; }
  &:active { background: #f5f5f5; }
}
.online-col {
  flex-shrink: 0;
  padding: 0 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.online-col-no { width: 180rpx; justify-content: flex-start; font-weight: 500; }
.online-col-model { width: 220rpx; }
.online-col-qty { width: 100rpx; }
.online-col-pkg { width: 200rpx; }
.online-col-customer { width: 140rpx; }
.online-col-order { width: 160rpx; }
.online-col-priority { width: 100rpx; }
.online-col-delivery { width: 180rpx; }
.online-col-stage { width: 140rpx; color: #0083ff; font-weight: 500; }
.online-col-notes { width: 200rpx; justify-content: flex-start; }
.online-col-date { width: 160rpx; }

/* Trial table columns */
.trial-col-no { width: 180rpx; justify-content: flex-start; font-weight: 500; }
.trial-col-content { width: 400rpx; justify-content: flex-start; }
.trial-col-pkg { width: 400rpx; }
.trial-col-qty { width: 200rpx; }
.trial-col-deadline { width: 180rpx; }
.trial-col-notes { width: 180rpx; justify-content: flex-start; }
.trial-col-stage { width: 140rpx; color: #0083ff; font-weight: 500; }
.trial-col-date { width: 160rpx; }
</style>
