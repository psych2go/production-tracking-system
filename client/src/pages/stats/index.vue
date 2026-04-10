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
      <picker :range="exportTypes" @change="onExport">
        <button class="btn-export">导出 Excel</button>
      </picker>
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
          <text class="col">工序</text>
          <text class="col">平均(分)</text>
          <text class="col">最短</text>
          <text class="col">最长</text>
          <text class="col">样本</text>
        </view>
        <view v-for="(item, i) in durationList" :key="i" class="table-row">
          <text class="col">{{ item.stageName }}</text>
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
      <view v-for="(a, i) in anomalies" :key="i" class="anomaly-item sev-major">
        <view class="flex-between">
          <text class="text-bold">{{ a.batchNo }}</text>
          <text class="severity-tag tag-major">延迟</text>
        </view>
        <text class="text-sm mt-sm">{{ a.description }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { statsApi } from "../../api/modules";
import type { ProcessDurationData, ProductionTrendData, AnomalyItem } from "../../types";
import Charts from "../../components/Charts.vue";

const tabs = [
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

const exportTypes = ["工序耗时", "产量趋势"];
const exportTypeMap: Record<string, string> = { "工序耗时": "durations", "产量趋势": "production" };

const activeTab = ref("durations");
const selectedRange = ref(timeRanges[1]);
const groupBy = ref("day");

const durationList = ref<ProcessDurationData[]>([]);
const productionList = ref<ProductionTrendData[]>([]);
const anomalies = ref<AnomalyItem[]>([]);

const durationData = computed(() => ({
  categories: durationList.value.map((d) => d.stageName),
  series: [{ name: "平均耗时(分)", data: durationList.value.map((d) => d.avgMinutes) }],
}));

const productionData = computed(() => ({
  categories: productionList.value.map((p) => p.period.slice(5)),
  series: [{ name: "产出", data: productionList.value.map((p) => p.totalOutput) }],
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

function onExport(e: { detail: { value: number } }) {
  const type = exportTypeMap[exportTypes[e.detail.value]];
  if (!type) return;
  const range = getDateRange();
  const url = statsApi.exportExcel(type, range);
  uni.downloadFile({
    url,
    success: (res) => {
      if (res.statusCode === 200) {
        uni.openDocument({ filePath: res.tempFilePath, fileType: "xlsx" });
      }
    },
    fail: () => {
      window.open(url, "_blank");
    },
  });
}

async function loadData() {
  const range = getDateRange();
  try {
    switch (activeTab.value) {
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

onMounted(loadData);
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
.export-bar { display: flex; justify-content: flex-end; padding: 16rpx 24rpx; }
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
  padding: 12rpx 0;
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
</style>
