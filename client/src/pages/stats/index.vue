<template>
  <view class="container">
    <!-- 区块切换 -->
    <view class="section-switch">
      <view class="switch-option" :class="{ active: activeSection === 'online' }" @click="activeSection = 'online'">
        <text class="switch-label">在线产品加工统计</text>
      </view>
      <view class="switch-option" :class="{ active: activeSection === 'yield' }" @click="activeSection = 'yield'">
        <text class="switch-label">良率统计</text>
      </view>
      <view class="switch-option" :class="{ active: activeSection === 'cycle' }" @click="switchToCycle">
        <text class="switch-label">加工交付周期</text>
      </view>
      <view class="switch-option" :class="{ active: activeSection === 'shipment' }" @click="switchToShipment">
        <text class="switch-label">发货数量统计</text>
      </view>
    </view>

    <!-- 在线产品加工统计 -->
    <view class="card" v-if="activeSection === 'online'">
      <view class="export-bar">
        <view class="export-left">
          <text class="export-title">在线产品加工统计</text>
          <text class="export-hint">按《高可靠在线产品在线加工统计表》格式展示，可导出 Excel</text>
        </view>
        <button class="btn-export" @click="onExport">导出 Excel</button>
      </view>
      <scroll-view scroll-x class="mt-sm" v-if="displayRows.length">
        <view class="online-table">
          <view class="online-header">
            <text class="online-col col-customer">客户代码</text>
            <text class="online-col col-customer-name">客户名称</text>
            <text class="online-col col-model">产品型号</text>
            <text class="online-col col-batch">生产批号</text>
            <text class="online-col col-order">订单编码</text>
            <text class="online-col col-pkg">封装形式</text>
            <text class="online-col col-qty">数量</text>
            <text class="online-col col-date">投产时间</text>
            <text class="online-col col-date">加工开始时间（镜检）</text>
            <text class="online-col col-date">客户要求交期</text>
            <text class="online-col col-date">生产预计交期</text>
            <text class="online-col col-stage">当前站点</text>
            <text class="online-col col-type">客户类型</text>
            <text class="online-col col-qty">已交付数量</text>
            <text class="online-col col-qty">未交付数量</text>
            <text class="online-col col-notes">备注</text>
          </view>
          <view v-for="batch in displayRows" :key="batch.id" class="online-row" @click="goBatchDetail(batch.id)">
            <text class="online-col col-customer">{{ batch.customerCode || '' }}</text>
            <text class="online-col col-customer-name">{{ batch.customerName || '' }}</text>
            <text class="online-col col-model">{{ batch.product?.model || '' }}</text>
            <text class="online-col col-batch">{{ batch.batchNo || '' }}</text>
            <text class="online-col col-order">{{ batch.orderNo || '' }}</text>
            <text class="online-col col-pkg">{{ batch.packageType || '' }}</text>
            <text class="online-col col-qty">{{ batch.quantity }}</text>
            <text class="online-col col-date">{{ formatDateCell(batch.startedAt) }}</text>
            <text class="online-col col-date">{{ formatDateCell(mirrorTime(batch)) }}</text>
            <text class="online-col col-date" :class="{ 'text-danger': isOverdueBatch(batch) }">{{ formatDateCell(batch.customerDelivery) }}</text>
            <text class="online-col col-date">{{ formatDateCell(batch.productionDelivery) }}</text>
            <text class="online-col col-stage">{{ currentStageName(batch) }}</text>
            <text class="online-col col-type">{{ customerTypeLabel(batch.customerType) }}</text>
            <text class="online-col col-qty">0</text>
            <text class="online-col col-qty">{{ batch.quantity }}</text>
            <text class="online-col col-notes">{{ onlineNotes(batch) }}</text>
          </view>
        </view>
      </scroll-view>
      <view v-else class="empty-chart">
        <text class="text-secondary">暂无在线批次</text>
      </view>
    </view>

    <!-- 良率统计 -->
    <view class="card" v-else-if="activeSection === 'yield'">
      <view class="yield-bar">
        <view class="export-left">
          <text class="export-title">良率统计</text>
          <text class="export-hint">所内：上月16日-本月15日；所外：上月26日-本月25日</text>
        </view>
        <view class="month-select-group">
          <picker mode="selector" :range="yearOptions" :value="yieldYearIndex" @change="onYieldYearChange">
            <view class="month-picker">{{ yieldMonth.slice(0, 4) }}年 ▾</view>
          </picker>
          <picker mode="selector" :range="monthNumOptions" :value="yieldMonthIndex" @change="onYieldMonthNumChange">
            <view class="month-picker">{{ Number(yieldMonth.slice(5, 7)) }}月 ▾</view>
          </picker>
        </view>
        <button class="btn-export" @click="onExportYield">导出</button>
      </view>
      <text v-if="yieldSummary" class="yield-summary">共 {{ yieldRows.length }} 个批次，月良率 {{ yieldSummary.monthYield }}（目标 {{ yieldSummary.monthTarget }}）</text>
      <text v-if="unclassifiedCount" class="yield-unclassified" @click="showUnclassifiedDetail = !showUnclassifiedDetail">另有 {{ unclassifiedCount }} 条批次未纳入统计（不属于本统计周期，或客户类型/归档数据待完善），点击展开明细 {{ showUnclassifiedDetail ? '▴' : '▾' }}</text>
      <view v-if="unclassifiedCount && showUnclassifiedDetail" class="yield-unclassified-list">
        <text v-for="(u, i) in yieldUnclassified" :key="i" class="yield-unclassified-item">{{ u.batchNo }}（{{ u.model || '无型号' }}）：{{ u.reason }}</text>
      </view>
      <scroll-view scroll-x class="mt-sm" v-if="yieldRows.length">
        <view class="online-table">
          <view class="online-header">
            <text class="online-col col-date">发货时间</text>
            <text class="online-col col-batch">生产批号</text>
            <text class="online-col col-customer">客户代码</text>
            <text class="online-col col-model">产品型号</text>
            <text class="online-col col-pkg">封装类型</text>
            <text class="online-col col-qty">上芯数</text>
            <text class="online-col col-qty">发货数</text>
            <text class="online-col col-qty">批次良率</text>
            <text class="online-col col-qty">单批次目标良率</text>
            <text class="online-col col-qty">月良率</text>
            <text class="online-col col-qty">目标月良率</text>
          </view>
          <view v-for="(row, i) in yieldRows" :key="`${row.batchNo}-${row.model}-${i}`" class="online-row">
            <text class="online-col col-date">{{ row.shippedDate }}</text>
            <text class="online-col col-batch">{{ row.batchNo }}</text>
            <text class="online-col col-customer">{{ row.customerCode }}</text>
            <text class="online-col col-model">{{ row.model }}</text>
            <text class="online-col col-pkg">{{ row.packageType }}</text>
            <text class="online-col col-qty">{{ row.dieQuantity }}</text>
            <text class="online-col col-qty">{{ row.shippedQuantity }}</text>
            <text class="online-col col-qty" :class="row.batchYield >= row.batchTarget ? 'yield-good' : 'yield-bad'">{{ pct(row.batchYield) }}</text>
            <text class="online-col col-qty">{{ pct(row.batchTarget) }}</text>
            <text class="online-col col-qty">{{ pct(yieldData?.monthYield) }}</text>
            <text class="online-col col-qty">{{ pct(yieldData?.monthTarget) }}</text>
          </view>
        </view>
      </scroll-view>
      <view v-else class="empty-chart">
        <text class="text-secondary">该月暂无发货数据</text>
      </view>
    </view>

    <!-- 加工交付周期 -->
    <view class="card" v-else-if="activeSection === 'cycle'">
      <view class="yield-bar">
        <view class="export-left">
          <text class="export-title">加工交付周期</text>
          <text class="export-hint">筛选时间段内发货的批次，统计从投产/镜检到发货的周期（天）</text>
        </view>
        <picker mode="date" :value="cycleStart" @change="onCycleStartChange">
          <view class="month-picker">{{ cycleStart }}</view>
        </picker>
        <text class="cycle-sep">至</text>
        <picker mode="date" :value="cycleEnd" @change="onCycleEndChange">
          <view class="month-picker">{{ cycleEnd }}</view>
        </picker>
        <button class="btn-export" @click="onExportCycle">导出</button>
      </view>
      <scroll-view scroll-x class="mt-sm" v-if="cycleRows.length">
        <view class="online-table">
          <view class="online-header">
            <text class="online-col col-customer">客户代码</text>
            <text class="online-col col-customer-name">客户名称</text>
            <text class="online-col col-model">产品型号</text>
            <text class="online-col col-batch">生产批号</text>
            <text class="online-col col-pkg">封装形式</text>
            <text class="online-col col-qty">下单数量</text>
            <text class="online-col col-date">投产时间</text>
            <text class="online-col col-date">开始加工时间</text>
            <text class="online-col col-date">发货日期</text>
            <text class="online-col col-qty">加工周期（从镜检开始）</text>
            <text class="online-col col-qty">投产后经过时间周期</text>
            <text class="online-col col-type">客户类型</text>
            <text class="online-col col-notes">备注</text>
          </view>
          <view v-for="row in cycleRows" :key="`${row.batchNo}-${row.model}-${row.shippedDate}`" class="online-row">
            <text class="online-col col-customer">{{ row.customerCode }}</text>
            <text class="online-col col-customer-name">{{ row.customerName }}</text>
            <text class="online-col col-model">{{ row.model }}</text>
            <text class="online-col col-batch">{{ row.batchNo }}</text>
            <text class="online-col col-pkg">{{ row.packageType }}</text>
            <text class="online-col col-qty">{{ row.quantity }}</text>
            <text class="online-col col-date">{{ row.startedAt }}</text>
            <text class="online-col col-date">{{ row.mirrorTime }}</text>
            <text class="online-col col-date">{{ row.shippedDate }}</text>
            <text class="online-col col-qty">{{ row.mirrorCycle ?? '' }}</text>
            <text class="online-col col-qty">{{ row.totalCycle ?? '' }}</text>
            <text class="online-col col-type">{{ row.customerType }}</text>
            <text class="online-col col-notes">{{ row.notes }}</text>
          </view>
        </view>
      </scroll-view>
      <view v-else class="empty-chart">
        <text class="text-secondary">该时间段内暂无发货批次</text>
      </view>
    </view>

    <!-- 发货数量统计 -->
    <view class="card" v-else-if="activeSection === 'shipment'">
      <view class="yield-bar">
        <view class="export-left">
          <text class="export-title">发货数量统计</text>
          <text class="export-hint">{{ shipmentData?.windows?.internal || '' }}；{{ shipmentData?.windows?.external || '' }}</text>
        </view>
        <view class="month-select-group">
          <picker mode="selector" :range="yearOptions" :value="shipmentYearIndex" @change="onShipmentYearChange">
            <view class="month-picker">{{ shipmentMonth.slice(0, 4) }}年 ▾</view>
          </picker>
          <picker mode="selector" :range="monthNumOptions" :value="shipmentMonthIndex" @change="onShipmentMonthNumChange">
            <view class="month-picker">{{ Number(shipmentMonth.slice(5, 7)) }}月 ▾</view>
          </picker>
        </view>
        <button class="btn-export" @click="onExportShipment">导出</button>
      </view>

      <view class="shipment-overview">
        <view
          v-for="m in shipmentMonths"
          :key="m.month"
          class="shipment-month-block"
          :class="{ current: m.month === shipmentMonth }"
          @click="shipmentMonth = m.month; loadShipment()"
        >
          <text class="shipment-month-label">{{ m.label }}发货{{ m.isCurrent ? '（实时）' : '' }}</text>
          <text class="shipment-month-total">{{ m.total }}</text>
          <text class="shipment-month-split">所内 {{ m.internalTotal }} · 所外 {{ m.externalTotal }}</text>
        </view>
      </view>

      <text v-if="shipmentRows.length" class="yield-summary">
        {{ shipmentMonthLabel }}共发货 {{ shipmentTotal }} 只（所内 {{ shipmentInternalTotal }} · 所外 {{ shipmentExternalTotal }}），共 {{ shipmentRows.length }} 批
      </text>

      <scroll-view scroll-x class="mt-sm" v-if="shipmentRows.length">
        <view class="online-table">
          <view class="online-header">
            <text class="online-col col-date">发货时间</text>
            <text class="online-col col-batch">生产批号</text>
            <text class="online-col col-customer">客户代码</text>
            <text class="online-col col-customer-name">客户名称</text>
            <text class="online-col col-model">产品型号</text>
            <text class="online-col col-pkg">封装形式</text>
            <text class="online-col col-type">客户类型</text>
            <text class="online-col col-qty">发货数</text>
          </view>
          <view v-for="(row, i) in shipmentRows" :key="`${row.batchNo}-${row.model}-${i}`" class="online-row">
            <text class="online-col col-date">{{ row.shippedDate }}</text>
            <text class="online-col col-batch">{{ row.batchNo }}</text>
            <text class="online-col col-customer">{{ row.customerCode }}</text>
            <text class="online-col col-customer-name">{{ row.customerName }}</text>
            <text class="online-col col-model">{{ row.model }}</text>
            <text class="online-col col-pkg">{{ row.packageType }}</text>
            <text class="online-col col-type">{{ row.customerType }}</text>
            <text class="online-col col-qty">{{ row.shippedQuantity }}</text>
          </view>
          <view class="online-row shipment-total-row">
            <text class="online-col col-date shipment-total-label">合计</text>
            <text class="online-col col-batch"></text>
            <text class="online-col col-customer"></text>
            <text class="online-col col-customer-name"></text>
            <text class="online-col col-model"></text>
            <text class="online-col col-pkg"></text>
            <text class="online-col col-type"></text>
            <text class="online-col col-qty shipment-total-value">{{ shipmentTotal }}</text>
          </view>
        </view>
      </scroll-view>
      <view v-else class="empty-chart">
        <text class="text-secondary">该月暂无发货数据</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { batchApi } from "../../api/modules";
import { api } from "../../api/index";
import { useAppStore } from "../../store/app";
import { useUserStore } from "../../store/user";
import { getCurrentStage, isOverdue as checkOverdue } from "../../utils/format";
import { CUSTOMER_TYPE_LABELS } from "../../utils/constants";
import type { Batch, ProgressRecord, ProcessStage } from "../../types";

const appStore = useAppStore();
const userStore = useUserStore();

const onlineBatches = ref<Batch[]>([]);
const onlineCount = computed(() => onlineBatches.value.length);
const activeSection = ref<"online" | "yield" | "cycle" | "shipment">("online");

const stageOrderMap = computed(() => new Map(appStore.stages.map((stage) => [stage.code, stage.stageOrder])));

function latestStageRecord(batch: Batch, code: string): ProgressRecord | undefined {
  return (batch.progressRecords || [])
    .filter((record) => record.status === "completed" && (record.stage as ProcessStage | undefined)?.code === code)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
}

function mirrorTime(batch: Batch): string {
  return latestStageRecord(batch, "in_process_inspection")?.createdAt || "";
}

function currentStageName(batch: Batch): string {
  // 待制卡/待投产无工序记录，直接显示业务状态
  if (batch.status === "pending_card") return "待制卡";
  if (batch.status === "pending") return "待投产";
  return getCurrentStage(batch)?.name || "未开始";
}

// 备注列：基础备注 + 暂停中的暂停原因
function onlineNotes(batch: Batch): string {
  return [batch.notes, batch.pausedAt ? `暂停：${batch.pauseReason || ""}` : ""].filter(Boolean).join("；");
}

function formatDateCell(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : "";
}

function customerTypeLabel(type: string | null | undefined): string {
  return type ? CUSTOMER_TYPE_LABELS[type] || "" : "";
}

function isOverdueBatch(batch: Batch): boolean {
  return checkOverdue(batch.customerDelivery, batch.status);
}

// 在途：越接近完成的排前面（当前工序靠后优先），同工序按客户交期、创建时间；未开始的排在最后
const sortedActive = computed(() => {
  const list = [...onlineBatches.value];
  list.sort((a, b) => {
    const orderA = currentStageOrder(a);
    const orderB = currentStageOrder(b);
    if (orderA !== orderB) return orderB - orderA;
    const deliveryA = a.customerDelivery ? new Date(a.customerDelivery).getTime() : Number.MAX_SAFE_INTEGER;
    const deliveryB = b.customerDelivery ? new Date(b.customerDelivery).getTime() : Number.MAX_SAFE_INTEGER;
    if (deliveryA !== deliveryB) return deliveryA - deliveryB;
    return a.createdAt.localeCompare(b.createdAt);
  });
  return list;
});

function currentStageOrder(batch: Batch): number {
  const stage = getCurrentStage(batch);
  return stage ? stageOrderMap.value.get(stage.code) ?? -1 : -1;
}

const displayRows = computed(() => sortedActive.value);

interface YieldRow {
  shippedDate: string;
  batchNo: string;
  customerCode: string;
  model: string;
  packageType: string;
  dieQuantity: number;
  shippedQuantity: number;
  batchYield: number;
  batchTarget: number;
}
interface YieldStats {
  month: string;
  title: string;
  rows: YieldRow[];
  monthYield: number | null;
  monthTarget: number;
  unclassified: Array<{ batchNo: string; model: string; reason: string }>;
}

function defaultYieldMonth(): string {
  const d = new Date();
  const target = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}`;
}
const yieldMonth = ref(defaultYieldMonth());
const yieldData = ref<YieldStats | null>(null);
const yieldLoading = ref(false);
const yieldRows = computed(() => yieldData.value?.rows ?? []);
const yieldSummary = computed(() => {
  if (!yieldData.value?.monthYield) return null;
  return { monthYield: pct(yieldData.value.monthYield), monthTarget: pct(yieldData.value.monthTarget) };
});

// 月份选择：年份 + 月份两个下拉（selector picker 跨端一致）
const yearOptions = computed(() => {
  const y = new Date().getFullYear();
  return [y - 2, y - 1, y, y + 1];
});
const monthNumOptions = Array.from({ length: 12 }, (_, i) => i + 1);
const yieldYearIndex = computed(() => {
  const idx = yearOptions.value.indexOf(Number(yieldMonth.value.slice(0, 4)));
  return idx === -1 ? yearOptions.value.indexOf(new Date().getFullYear()) : idx;
});
const yieldMonthIndex = computed(() => Number(yieldMonth.value.slice(5, 7)) - 1);
function onYieldYearChange(event: any) {
  yieldMonth.value = `${yearOptions.value[Number(event.detail.value)]}-${yieldMonth.value.slice(5, 7)}`;
  loadYield();
}
function onYieldMonthNumChange(event: any) {
  yieldMonth.value = `${yieldMonth.value.slice(0, 4)}-${String(Number(event.detail.value) + 1).padStart(2, "0")}`;
  loadYield();
}
const unclassifiedCount = computed(() => yieldData.value?.unclassified.length ?? 0);
const yieldUnclassified = computed(() => yieldData.value?.unclassified ?? []);
const showUnclassifiedDetail = ref(false);

function pct(value: number | null | undefined): string {
  return value == null ? "—" : `${(value * 100).toFixed(2)}%`;
}

async function loadYield() {
  yieldLoading.value = true;
  try {
    yieldData.value = await api.get<YieldStats>(`/api/statistics/yield?month=${yieldMonth.value}`);
  } catch (e: unknown) {
    uni.showToast({ title: (e as Error).message, icon: "none" });
  } finally {
    yieldLoading.value = false;
  }
}

interface DeliveryCycleRow {
  customerCode: string;
  customerName: string;
  model: string;
  batchNo: string;
  packageType: string;
  quantity: number;
  startedAt: string;
  mirrorTime: string;
  shippedDate: string;
  mirrorCycle: number | null;
  totalCycle: number | null;
  customerType: string;
  notes: string;
}

function localYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function defaultCycleStart(): string {
  const d = new Date();
  d.setDate(d.getDate() - 13);
  return localYMD(d);
}
const cycleStart = ref(defaultCycleStart());
const cycleEnd = ref(localYMD(new Date()));
const cycleRows = ref<DeliveryCycleRow[]>([]);
const cycleCount = computed(() => cycleRows.value.length);

async function loadCycle() {
  try {
    cycleRows.value = await api.get<DeliveryCycleRow[]>(
      `/api/statistics/delivery-cycle?start=${cycleStart.value}&end=${cycleEnd.value}`,
    );
  } catch (e: unknown) {
    uni.showToast({ title: (e as Error).message, icon: "none" });
  }
}

function switchToCycle() {
  activeSection.value = "cycle";
  loadCycle();
}

function onCycleStartChange(event: any) {
  cycleStart.value = event.detail.value ?? cycleStart.value;
  loadCycle();
}

function onCycleEndChange(event: any) {
  cycleEnd.value = event.detail.value ?? cycleEnd.value;
  loadCycle();
}

function onExportCycle() {
  const token = userStore.token;
  const url = `/api/statistics/delivery-cycle/export?start=${cycleStart.value}&end=${cycleEnd.value}`;
  // #ifdef H5
  fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    .then((res) => {
      if (!res.ok) throw new Error("导出失败");
      return res.blob();
    })
    .then((blob) => {
      const blobUrl = URL.createObjectURL(blob);
      try {
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = `高可靠加工交付周期${cycleStart.value}至${cycleEnd.value}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } finally {
        URL.revokeObjectURL(blobUrl);
      }
    })
    .catch(() => uni.showToast({ title: "导出失败", icon: "none" }));
  // #endif
  // #ifndef H5
  uni.downloadFile({
    url: `${api.getBaseUrl()}${url}`,
    header: { Authorization: `Bearer ${token}` },
    success: (res) => {
      if (res.statusCode !== 200) { uni.showToast({ title: "导出失败", icon: "none" }); return; }
      uni.openDocument({ filePath: res.tempFilePath, showMenu: true });
    },
    fail: () => uni.showToast({ title: "导出失败", icon: "none" }),
  });
  // #endif
}

interface ShipmentMonthSummary {
  month: string;
  label: string;
  isCurrent: boolean;
  internalTotal: number;
  externalTotal: number;
  total: number;
}
interface ShipmentStats {
  month: string;
  windows: { internal: string; external: string };
  months: ShipmentMonthSummary[];
  rows: Array<{
    shippedDate: string;
    batchNo: string;
    customerCode: string;
    customerName: string;
    model: string;
    packageType: string;
    customerType: string;
    shippedQuantity: number;
  }>;
  internalTotal: number;
  externalTotal: number;
  total: number;
  unclassifiedCount: number;
}

function defaultShipmentMonth(): string {
  const d = new Date();
  const target = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}`;
}
const shipmentMonth = ref(defaultShipmentMonth());
const shipmentData = ref<ShipmentStats | null>(null);
const shipmentRows = computed(() => shipmentData.value?.rows ?? []);
const shipmentMonths = computed(() => shipmentData.value?.months ?? []);
const shipmentTotal = computed(() => shipmentData.value?.total ?? 0);
const shipmentInternalTotal = computed(() => shipmentData.value?.internalTotal ?? 0);
const shipmentExternalTotal = computed(() => shipmentData.value?.externalTotal ?? 0);
const shipmentMonthLabel = computed(() => {
  const m = shipmentMonth.value;
  return m ? `${Number(m.slice(5, 7))}月` : "";
});
const shipmentYearIndex = computed(() => {
  const idx = yearOptions.value.indexOf(Number(shipmentMonth.value.slice(0, 4)));
  return idx === -1 ? yearOptions.value.indexOf(new Date().getFullYear()) : idx;
});
const shipmentMonthIndex = computed(() => Number(shipmentMonth.value.slice(5, 7)) - 1);
function onShipmentYearChange(event: any) {
  shipmentMonth.value = `${yearOptions.value[Number(event.detail.value)]}-${shipmentMonth.value.slice(5, 7)}`;
  loadShipment();
}
function onShipmentMonthNumChange(event: any) {
  shipmentMonth.value = `${shipmentMonth.value.slice(0, 4)}-${String(Number(event.detail.value) + 1).padStart(2, "0")}`;
  loadShipment();
}

async function loadShipment() {
  try {
    shipmentData.value = await api.get<ShipmentStats>(`/api/statistics/shipment?month=${shipmentMonth.value}`);
  } catch (e: unknown) {
    uni.showToast({ title: (e as Error).message, icon: "none" });
  }
}

function switchToShipment() {
  activeSection.value = "shipment";
  loadShipment();
}

function onExportShipment() {
  const token = userStore.token;
  const url = `/api/statistics/shipment/export?month=${shipmentMonth.value}`;
  // #ifdef H5
  fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    .then((res) => {
      if (!res.ok) throw new Error("导出失败");
      return res.blob();
    })
    .then((blob) => {
      const blobUrl = URL.createObjectURL(blob);
      try {
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = `发货数量统计${shipmentMonth.value}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } finally {
        URL.revokeObjectURL(blobUrl);
      }
    })
    .catch(() => uni.showToast({ title: "导出失败", icon: "none" }));
  // #endif
  // #ifndef H5
  uni.downloadFile({
    url: `${api.getBaseUrl()}${url}`,
    header: { Authorization: `Bearer ${token}` },
    success: (res) => {
      if (res.statusCode !== 200) { uni.showToast({ title: "导出失败", icon: "none" }); return; }
      uni.openDocument({ filePath: res.tempFilePath, showMenu: true });
    },
    fail: () => uni.showToast({ title: "导出失败", icon: "none" }),
  });
  // #endif
}

function onExportYield() {
  const token = userStore.token;
  const url = `/api/statistics/yield/export?month=${yieldMonth.value}`;
  // #ifdef H5
  fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    .then((res) => {
      if (!res.ok) throw new Error("导出失败");
      return res.blob();
    })
    .then((blob) => {
      const blobUrl = URL.createObjectURL(blob);
      try {
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = `高可靠项目良率统计${yieldMonth.value}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } finally {
        URL.revokeObjectURL(blobUrl);
      }
    })
    .catch(() => uni.showToast({ title: "导出失败", icon: "none" }));
  // #endif
  // #ifndef H5
  uni.downloadFile({
    url: `${api.getBaseUrl()}${url}`,
    header: { Authorization: `Bearer ${token}` },
    success: (res) => {
      if (res.statusCode !== 200) { uni.showToast({ title: "导出失败", icon: "none" }); return; }
      uni.openDocument({ filePath: res.tempFilePath, showMenu: true });
    },
    fail: () => uni.showToast({ title: "导出失败", icon: "none" }),
  });
  // #endif
}

async function loadData() {
  try {
    // 在线产品加工统计：已发货（已完成/已归档）之前的所有状态
    const [activeRes, pendingRes, pendingCardRes] = await Promise.all([
      batchApi.list({ status: "active", pageSize: 500 }),
      batchApi.list({ status: "pending", pageSize: 500 }),
      batchApi.list({ status: "pending_card", pageSize: 500 }),
    ]);
    onlineBatches.value = [...activeRes.items, ...pendingRes.items, ...pendingCardRes.items];
  } catch (e: unknown) {
    uni.showToast({ title: (e as Error).message, icon: "none" });
  }
}

function onExport() {
  const exportInfo = { url: "/api/statistics/export/excel" };
  const token = userStore.token;
  // #ifdef H5
  fetch(exportInfo.url, {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((res) => {
      if (!res.ok) throw new Error("导出失败");
      return res.blob();
    })
    .then((blob) => {
      const blobUrl = URL.createObjectURL(blob);
      try {
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = "在线产品加工统计表.xlsx";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } finally {
        URL.revokeObjectURL(blobUrl);
      }
    })
    .catch(() => uni.showToast({ title: "导出失败", icon: "none" }));
  // #endif
  // #ifndef H5
  uni.downloadFile({
    url: api.getBaseUrl() + exportInfo.url,
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

function goBatchDetail(id: number) {
  uni.navigateTo({ url: `/pages/batch/detail?id=${id}` });
}

onMounted(async () => {
  await appStore.loadStages();
  loadData();
});

onShow(() => {
  loadData();
  loadYield();
  loadCycle();
  loadShipment();
});
</script>

<style scoped lang="scss">
.export-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  padding: 22rpx 24rpx;
  border-left: 6rpx solid #087f8c;
  border-bottom: 2rpx solid #edf0f0;
}

/* 手机端优化 */
@media screen and (max-width: 560px) {
  .switch-label { font-size: 22rpx; }
  .switch-option { gap: 8rpx; min-height: 80rpx; }
}

/* 区块切换 */
.section-switch {
  display: flex;
  gap: 12rpx;
  margin-bottom: 20rpx;
}
.switch-option {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  min-height: 92rpx;
  border-radius: 12rpx;
  background: #fff;
  border: 2rpx solid #dfe4e4;
  color: #657174;
  font-size: 26rpx;
  transition: all 0.15s ease;
  &.active {
    background: #087f8c;
    border-color: #087f8c;
    color: #fff;
    font-weight: 600;
    box-shadow: 0 6rpx 16rpx rgba(8, 127, 140, 0.25);
  }
}
.switch-label { white-space: nowrap; }
.export-left { flex: 1; margin-right: 20rpx; }
.export-title {
  display: block;
  color: #172327;
  font-size: 28rpx;
  font-weight: 700;
}
.export-hint {
  display: block;
  margin-top: 4rpx;
  font-size: 22rpx;
  color: #657174;
  line-height: 1.6;
}
.btn-export {
  min-height: 64rpx;
  font-size: 24rpx;
  font-weight: 600;
  padding: 8rpx 22rpx;
  background: #087f8c;
  color: #fff;
  border: none;
  border-radius: 7rpx;
  &::after { border: none; }
}

.cycle-sep { color: #7d898b; font-size: 24rpx; }
.yield-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  padding: 22rpx 24rpx;
  border-left: 6rpx solid #d97706;
  border-bottom: 2rpx solid #edf0f0;
}
.month-picker {
  padding: 10rpx 20rpx;
  border: 2rpx solid #dfe4e4;
  border-radius: 8rpx;
  background: #f5f7f7;
  color: #172327;
  font-size: 24rpx;
  white-space: nowrap;
}
.yield-summary {
  display: block;
  margin-top: 16rpx;
  color: #172327;
  font-size: 24rpx;
  font-weight: 600;
}

/* 发货数量统计 */
.shipment-overview {
  display: flex;
  gap: 16rpx;
  margin-top: 20rpx;
}
.shipment-month-block {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
  padding: 20rpx 12rpx;
  border: 2rpx solid #dfe4e4;
  border-radius: 10rpx;
  background: #f5f7f7;
}
.shipment-month-block.current {
  border-color: #087f8c;
  background: #e6f4f3;
}
.shipment-month-label { color: #657174; font-size: 20rpx; }
.shipment-month-total { color: #087f8c; font-size: 40rpx; font-weight: 700; line-height: 1.1; }
.shipment-month-split { color: #a0a8a9; font-size: 18rpx; }
.shipment-total-row { background: #f5f7f7; }
.shipment-total-row .online-col { font-weight: 700; color: #172327; }
.shipment-total-value { color: #087f8c; }
.yield-unclassified {
  display: block;
  margin-top: 8rpx;
  color: #d97706;
  font-size: 20rpx;
}
.yield-unclassified-list {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  margin-top: 8rpx;
  padding: 16rpx 20rpx;
  border-radius: 8rpx;
  background: #fff8ee;
}
.yield-unclassified-item {
  color: #9a5a00;
  font-size: 20rpx;
  line-height: 1.5;
}
.yield-good { color: #27865f; }
.yield-bad { color: #c9483f; }

.empty-chart { text-align: center; padding: 60rpx 0; }

/* Statistics table */
.online-table {
  min-width: 2960rpx;
  border: 2rpx solid #dfe4e4;
  border-radius: 8rpx;
  overflow: hidden;
}
.online-header {
  display: flex;
  padding: 16rpx 0;
  border-bottom: 2rpx solid #dfe4e4;
  font-size: 22rpx;
  color: #485458;
  font-weight: 700;
  background: #edf0f0;
}
.online-row {
  display: flex;
  padding: 18rpx 0;
  border-bottom: 2rpx solid #edf0f0;
  font-size: 24rpx;
  &:last-child { border-bottom: none; }
  &:nth-child(odd) { background: #fafbfb; }
  &:active { background: #e6f4f3; }
}
.online-col {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  padding: 0 12rpx;
}
.col-customer { width: 120rpx; }
.col-customer-name { width: 130rpx; }
.col-model { width: 220rpx; }
.col-batch { width: 130rpx; }
.col-order { width: 180rpx; }
.col-pkg { width: 190rpx; }
.col-qty { width: 100rpx; }
.col-date { width: 170rpx; }
.col-stage { width: 130rpx; color: #087f8c; font-weight: 700; }
.col-type { width: 100rpx; }
.col-notes { width: 260rpx; justify-content: flex-start; }
</style>
