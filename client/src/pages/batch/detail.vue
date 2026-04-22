<template>
  <view class="container" v-if="batch">
    <!-- Batch info -->
    <view class="card">
      <view class="flex-between">
        <view class="flex-center">
          <text class="text-lg text-bold">
            {{ batch.batchNo }}
            <template v-if="isTrial">
              <text class="trial-tag">试验</text>
            </template>
            <template v-else>
              {{ batch.product?.model || '' }}
            </template>
          </text>
          <view v-if="batch.priority === 'urgent'" class="urgent-tag">紧急</view>
        </view>
        <view class="flex-center">
          <view v-if="isAdmin" class="edit-btn" @click="toggleEdit">
            <text>{{ editing ? '取消' : '编辑' }}</text>
          </view>
          <view class="status-tag" :style="{ color: getStatusColor(batch.status) }">
            {{ statusLabel(batch.status) }}
          </view>
        </view>
      </view>

      <!-- Overdue warning -->
      <view v-if="isOverdue && !editing" class="overdue-warning mt-sm">
        <text class="text-sm">已超过客户要求交期 {{ overdueDays }} 天</text>
      </view>

      <!-- ===== EDIT MODE ===== -->
      <template v-if="editing">
        <!-- Product batch edit -->
        <template v-if="!isTrial">
          <view class="form-group mt-lg">
            <text class="form-label">生产批号</text>
            <input v-model="editForm.batchNo" class="form-input" />
          </view>
          <view class="form-group mt-md">
            <text class="form-label">产品型号</text>
            <input v-model="editForm.productModel" class="form-input" />
          </view>
          <view class="form-group mt-md">
            <text class="form-label">加工数量</text>
            <input v-model="editForm.quantity" type="number" class="form-input" />
          </view>
          <view class="form-group mt-md">
            <text class="form-label">封装形式</text>
            <picker :range="packageTypeNames" @change="onPackageTypeChange">
              <view class="form-input picker-value">{{ editForm.packageType || '请选择封装形式' }}</view>
            </picker>
          </view>
          <view class="form-group mt-md">
            <text class="form-label">客户代码</text>
            <input v-model="editForm.customerCode" class="form-input" placeholder="可选" />
          </view>
          <view class="form-group mt-md">
            <text class="form-label">订单编号</text>
            <input v-model="editForm.orderNo" class="form-input" placeholder="可选" />
          </view>
          <view class="form-group mt-md">
            <text class="form-label">客户要求交期</text>
            <picker mode="date" :value="editForm.customerDelivery" @change="e => editForm.customerDelivery = e.detail.value">
              <view class="form-input picker-value">{{ editForm.customerDelivery || '请选择' }}</view>
            </picker>
          </view>
          <view class="form-group mt-md">
            <text class="form-label">生产预计交期</text>
            <picker mode="date" :value="editForm.productionDelivery" @change="e => editForm.productionDelivery = e.detail.value">
              <view class="form-input picker-value">{{ editForm.productionDelivery || '请选择' }}</view>
            </picker>
          </view>
          <view class="form-group mt-md">
            <text class="form-label">优先级</text>
            <picker :range="priorities" range-key="label" @change="onPriorityChange">
              <view class="form-input picker-value">{{ editPriorityLabel || '普通' }}</view>
            </picker>
          </view>
          <view class="form-group mt-md">
            <text class="form-label">备注</text>
            <textarea v-model="editForm.notes" class="form-textarea" placeholder="可选" />
          </view>
        </template>

        <!-- Trial batch edit -->
        <template v-else>
          <view class="form-group mt-lg">
            <text class="form-label">试验内容</text>
            <textarea v-model="editForm.trialContent" class="form-textarea" />
          </view>
          <view class="form-group mt-md">
            <text class="form-label">封装形式（可多选）</text>
            <view class="multi-select-list">
              <view
                v-for="pt in packageTypes"
                :key="pt.id"
                class="multi-select-item"
                :class="{ selected: editSelectedPackageTypes.has(pt.name) }"
                @click="toggleEditPackageType(pt.name)"
              >
                <text>{{ pt.name }}</text>
              </view>
            </view>
          </view>
          <view class="form-group mt-md">
            <text class="form-label">数量</text>
            <view class="quantity-row">
              <view class="quantity-field">
                <input v-model="editForm.trialQtyTiao" type="number" placeholder="0" class="form-input" />
                <text class="quantity-unit">条</text>
              </view>
              <view class="quantity-field">
                <input v-model="editForm.trialQtyZhi" type="number" placeholder="0" class="form-input" />
                <text class="quantity-unit">只</text>
              </view>
            </view>
          </view>
          <view class="form-group mt-md">
            <text class="form-label">要求完成时间</text>
            <picker mode="date" :value="editForm.customerDelivery" @change="e => editForm.customerDelivery = e.detail.value">
              <view class="form-input picker-value">{{ editForm.customerDelivery || '请选择' }}</view>
            </picker>
          </view>
          <view class="form-group mt-md">
            <text class="form-label">备注</text>
            <textarea v-model="editForm.notes" class="form-textarea" placeholder="可选" />
          </view>
        </template>

        <button class="btn-primary mt-lg" :loading="saving" @click="saveEdit">保存</button>
      </template>

      <!-- ===== VIEW MODE ===== -->
      <template v-else>
        <!-- Trial batch fields -->
        <view v-if="isTrial" class="info-grid mt-md">
          <text class="text-secondary">试验内容</text>
          <text>{{ batch.trialContent || '-' }}</text>
          <text class="text-secondary">数量</text>
          <text>{{ quantityDisplay }}</text>
          <text class="text-secondary">封装形式</text>
          <view v-if="batch.packageType" class="tag-list">
            <text v-for="pt in batch.packageType.split(',')" :key="pt" class="info-tag">{{ pt.trim() }}</text>
          </view>
          <text v-else>-</text>
          <text class="text-secondary">要求完成时间</text>
          <text :class="isOverdue ? 'text-danger' : ''">
            {{ batch.customerDelivery ? formatDateShort(batch.customerDelivery) : '-' }}
            <text v-if="isOverdue" class="text-sm"> (已逾期)</text>
          </text>
          <text class="text-secondary">创建时间</text>
          <text>{{ formatDate(batch.createdAt) }}</text>
          <text class="text-secondary">备注</text>
          <text>{{ batch.notes || '-' }}</text>
        </view>

        <!-- Product batch fields -->
        <view v-else class="info-grid mt-md">
          <text class="text-secondary">产品型号</text>
          <text>{{ batch.product?.model || '-' }}</text>
          <text class="text-secondary">加工数量</text>
          <text>{{ batch.quantity }}</text>
          <text class="text-secondary">客户代码</text>
          <text>{{ batch.customerCode || '-' }}</text>
          <text class="text-secondary">订单编号</text>
          <text>{{ batch.orderNo || '-' }}</text>
          <text class="text-secondary">封装形式</text>
          <text>{{ batch.packageType || '-' }}</text>
          <text class="text-secondary">客户要求交期</text>
          <text :class="isOverdue ? 'text-danger' : ''">
            {{ batch.customerDelivery ? formatDateShort(batch.customerDelivery) : '-' }}
            <text v-if="isOverdue" class="text-sm"> (已逾期)</text>
          </text>
          <text class="text-secondary">生产预计交期</text>
          <text>{{ batch.productionDelivery ? formatDateShort(batch.productionDelivery) : '-' }}</text>
          <text class="text-secondary">优先级</text>
          <text>{{ priorityLabel(batch.priority) }}</text>
          <text class="text-secondary">创建时间</text>
          <text>{{ formatDate(batch.createdAt) }}</text>
          <text class="text-secondary">备注</text>
          <text>{{ batch.notes || '-' }}</text>
        </view>
      </template>
    </view>

    <!-- Stage progress -->
    <view class="card mt-md">
      <text class="section-title text-bold">工序进度</text>
      <StageTimeline
        v-if="appStore.stages.length"
        :stages="appStore.stages"
        :progressRecords="batch.progressRecords || []"
      />
    </view>

    <!-- Quick actions -->
    <view v-if="batch.status === 'active' && !editing" class="card mt-md">
      <button class="btn-primary" @click="goRecordProgress">
        工序流转
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { useAppStore } from "../../store/app";
import { useUserStore } from "../../store/user";
import { batchApi, settingsApi } from "../../api/modules";
import { STATUS_LABELS, PRIORITIES } from "../../utils/constants";
import { formatDate, formatDateShort } from "../../utils/format";
import type { Batch, PackageType } from "../../types";
import StageTimeline from "../../components/StageTimeline.vue";

const appStore = useAppStore();
const userStore = useUserStore();
const batch = ref<Batch | null>(null);
const packageTypes = ref<PackageType[]>([]);

const editing = ref(false);
const saving = ref(false);

const isAdmin = computed(() => userStore.isAdmin());
const isTrial = computed(() => batch.value?.batchType === "trial");

const editForm = ref({
  batchNo: "",
  productModel: "",
  quantity: "",
  customerCode: "",
  orderNo: "",
  packageType: "",
  customerDelivery: "",
  productionDelivery: "",
  priority: "normal",
  trialContent: "",
  trialQtyTiao: "",
  trialQtyZhi: "",
  notes: "",
});

const editSelectedPackageTypes = ref<Set<string>>(new Set());

const priorities = PRIORITIES;

const editPriorityLabel = computed(() => {
  return priorities.find((p) => p.value === editForm.value.priority)?.label || "";
});

function statusLabel(status: string) {
  return STATUS_LABELS[status] || status;
}

function priorityLabel(priority: string) {
  return appStore.getPriorityLabel(priority);
}

function getStatusColor(status: string): string {
  return appStore.getStatusColor(status);
}

const isOverdue = computed(() => {
  if (!batch.value?.customerDelivery || batch.value.status !== "active") return false;
  return new Date(batch.value.customerDelivery) < new Date();
});

const overdueDays = computed(() => {
  if (!batch.value?.customerDelivery) return 0;
  const diff = Date.now() - new Date(batch.value.customerDelivery).getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

const packageTypeNames = computed(() => packageTypes.value.map((pt) => pt.name));

const quantityDisplay = computed(() => {
  if (!batch.value) return "-";
  if (batch.value.quantityDetail) {
    try {
      const parsed = JSON.parse(batch.value.quantityDetail);
      return Object.entries(parsed)
        .filter(([, v]) => Number(v) > 0)
        .map(([unit, val]) => `${val}${unit}`)
        .join(" ") || "-";
    } catch { /* fallback below */ }
  }
  return batch.value.quantity || "-";
});

function parseQuantityDetail(detail: string | null | undefined): { tiao: string; zhi: string } {
  if (!detail) return { tiao: "", zhi: "" };
  try {
    const parsed = JSON.parse(detail);
    return {
      tiao: parsed["条"] ? String(parsed["条"]) : "",
      zhi: parsed["只"] ? String(parsed["只"]) : "",
    };
  } catch {
    return { tiao: "", zhi: "" };
  }
}

function toggleEdit() {
  if (editing.value) {
    editing.value = false;
    return;
  }
  // Populate form from current batch data
  const b = batch.value!;
  const qd = parseQuantityDetail(b.quantityDetail);
  editForm.value = {
    batchNo: b.batchNo || "",
    productModel: b.product?.model || "",
    quantity: b.quantity ? String(b.quantity) : "",
    customerCode: b.customerCode || "",
    orderNo: b.orderNo || "",
    packageType: b.packageType || "",
    customerDelivery: b.customerDelivery ? b.customerDelivery.slice(0, 10) : "",
    productionDelivery: b.productionDelivery ? b.productionDelivery.slice(0, 10) : "",
    priority: b.priority || "normal",
    trialContent: b.trialContent || "",
    trialQtyTiao: qd.tiao,
    trialQtyZhi: qd.zhi,
    notes: b.notes || "",
  };
  // Trial: parse existing package types into set
  if (isTrial.value && b.packageType) {
    editSelectedPackageTypes.value = new Set(b.packageType.split(",").map((s: string) => s.trim()));
  } else {
    editSelectedPackageTypes.value = new Set();
  }
  editing.value = true;
}

function onPackageTypeChange(e: any) {
  editForm.value.packageType = packageTypes.value[e.detail.value]?.name ?? "";
}

function onPriorityChange(e: any) {
  editForm.value.priority = priorities[e.detail.value]?.value ?? "normal";
}

function toggleEditPackageType(name: string) {
  const s = new Set(editSelectedPackageTypes.value);
  if (s.has(name)) s.delete(name);
  else s.add(name);
  editSelectedPackageTypes.value = s;
}

async function saveEdit() {
  if (!batch.value) return;
  saving.value = true;
  try {
    const data: Record<string, unknown> = {};
    if (!isTrial.value) {
      data.batchNo = editForm.value.batchNo;
      data.productModel = editForm.value.productModel;
      data.quantity = Number(editForm.value.quantity);
      data.packageType = editForm.value.packageType || null;
      data.customerCode = editForm.value.customerCode || null;
      data.orderNo = editForm.value.orderNo || null;
      data.customerDelivery = editForm.value.customerDelivery || null;
      data.productionDelivery = editForm.value.productionDelivery || null;
      data.priority = editForm.value.priority;
    } else {
      data.trialContent = editForm.value.trialContent;
      const qtyTiao = editForm.value.trialQtyTiao ? Number(editForm.value.trialQtyTiao) : 0;
      const qtyZhi = editForm.value.trialQtyZhi ? Number(editForm.value.trialQtyZhi) : 0;
      const detail: Record<string, number> = {};
      if (qtyTiao > 0) detail["条"] = qtyTiao;
      if (qtyZhi > 0) detail["只"] = qtyZhi;
      if (Object.keys(detail).length > 0) {
        data.quantityDetail = JSON.stringify(detail);
        data.quantity = qtyTiao + qtyZhi;
      }
      data.packageType = editSelectedPackageTypes.value.size > 0
        ? Array.from(editSelectedPackageTypes.value).join(",")
        : null;
      data.customerDelivery = editForm.value.customerDelivery || null;
    }
    data.notes = editForm.value.notes;

    const updated = await batchApi.update(batch.value.id, data);
    batch.value = updated;
    editing.value = false;
    uni.showToast({ title: "保存成功", icon: "success" });
  } catch (e: unknown) {
    uni.showToast({ title: "保存失败", icon: "none" });
  } finally {
    saving.value = false;
  }
}

function goRecordProgress() {
  if (!batch.value) return;
  uni.switchTab({
    url: "/pages/progress/entry",
    success: () => {
      uni.setStorageSync("pendingBatchId", batch.value!.id);
    }
  });
}

onLoad(async (query) => {
  if (query?.id) {
    try {
      batch.value = await batchApi.get(Number(query.id));
    } catch (e: unknown) {
      uni.showToast({ title: "加载失败", icon: "none" });
    }
  }
  // Load package types for edit mode
  if (isAdmin.value) {
    try {
      packageTypes.value = await settingsApi.listPackageTypes();
    } catch { /* non-critical */ }
  }
});
</script>

<style scoped lang="scss">
.info-grid {
  display: grid;
  grid-template-columns: 160rpx 1fr;
  gap: 16rpx 24rpx;
  font-size: 28rpx;
}
.section-title {
  font-size: 32rpx;
  margin-bottom: 12rpx;
}
.overdue-warning {
  padding: 12rpx 20rpx;
  background: #fff2f0;
  border-radius: 8rpx;
  border-left: 6rpx solid #fa5151;
  color: #fa5151;
}
.trial-tag {
  font-size: 24rpx;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  background: #fff7e6;
  color: #ff9900;
  margin-left: 8rpx;
  vertical-align: middle;
}
.edit-btn {
  padding: 8rpx 20rpx;
  border: 2rpx solid #0083ff;
  border-radius: 8rpx;
  font-size: 26rpx;
  color: #0083ff;
  margin-right: 16rpx;
}
.btn-primary {
  background: #0083ff;
  color: #fff;
  border: none;
  border-radius: 12rpx;
  padding: 24rpx 0;
  font-size: 32rpx;
  text-align: center;
  min-height: 88rpx;
}
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  align-items: center;
}
.info-tag {
  font-size: 24rpx;
  padding: 4rpx 14rpx;
  border-radius: 6rpx;
  background: #e8f4ff;
  color: #0083ff;
}
.form-group { display: flex; flex-direction: column; gap: 8rpx; }
.form-label { font-size: 26rpx; color: #666; }
.form-input {
  border: 2rpx solid #e5e5e5;
  border-radius: 12rpx;
  padding: 24rpx;
  font-size: 28rpx;
  min-height: 48rpx;
}
.form-textarea {
  border: 2rpx solid #e5e5e5;
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
  font-size: 28rpx;
  height: 160rpx;
}
.picker-value { color: #333; }
.multi-select-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}
.multi-select-item {
  padding: 12rpx 24rpx;
  border: 2rpx solid #e5e5e5;
  border-radius: 8rpx;
  font-size: 26rpx;
  color: #666;
  background: #fff;
  &.selected {
    background: #f0f7ff;
    border-color: #0083ff;
    color: #0083ff;
  }
}
.quantity-row {
  display: flex;
  gap: 16rpx;
}
.quantity-field {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}
.quantity-field .form-input {
  width: 100%;
  padding-right: 60rpx;
  box-sizing: border-box;
}
.quantity-unit {
  position: absolute;
  right: 24rpx;
  font-size: 26rpx;
  color: #999;
  pointer-events: none;
}
</style>
