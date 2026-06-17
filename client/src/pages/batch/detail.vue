<template>
  <view class="container" v-if="batch">
    <!-- Batch info -->
    <view class="card">
      <view class="flex-between">
        <view class="flex-center">
          <text class="text-lg text-bold">
            {{ batch.batchNo }}
            <template v-if="isTrial">
              <text class="tag tag-trial">试验</text>
            </template>
            <template v-else>
              {{ batch.product?.model || '' }}
            </template>
          </text>
          <view v-if="batch.priority === 'urgent'" class="tag tag-urgent">紧急</view>
        </view>
        <view class="flex-center">
          <view v-if="isAdmin" class="edit-btn" @click="toggleEdit">
            <text>{{ editing ? '取消' : '编辑' }}</text>
          </view>
          <view v-if="isAdmin && !editing" class="delete-btn" @click="confirmDelete">
            <text>删除</text>
          </view>
          <view class="status-tag" :style="{ color: getStatusColor(batch.status) }">
            {{ statusLabel(batch.status) }}
          </view>
        </view>
      </view>

      <!-- Overdue warning -->
      <view v-if="isOverdue && !editing" class="overdue-warning mt-sm">
        <text class="text-sm">已超过{{ isTrial ? '要求完成时间' : '客户要求交期' }} {{ overdueDays }} 天</text>
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
            <picker :range="customerCodeOptions" @change="onEditCustomerCodeChange">
              <view class="form-input picker-value">{{ editForm.customerCode || '请选择客户代码' }}</view>
            </picker>
          </view>
          <view class="form-group mt-md">
            <text class="form-label">订单编号</text>
            <input v-model="editForm.orderNo" class="form-input" placeholder="可选" />
          </view>
          <view class="form-group mt-md">
            <text class="form-label">客户要求交期</text>
            <picker mode="date" :value="editForm.customerDelivery" @change="(e: any) => editForm.customerDelivery = e.detail.value">
              <view class="form-input picker-value">{{ editForm.customerDelivery || '请选择' }}</view>
            </picker>
          </view>
          <view class="form-group mt-md">
            <text class="form-label">生产预计交期</text>
            <picker mode="date" :value="editForm.productionDelivery" @change="(e: any) => editForm.productionDelivery = e.detail.value">
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
                <input v-model="editForm.trialQtyTiao" type="number" placeholder="0" class="qty-input" />
                <text class="quantity-unit">条</text>
              </view>
              <view class="quantity-field">
                <input v-model="editForm.trialQtyZhi" type="number" placeholder="0" class="qty-input" />
                <text class="quantity-unit">只</text>
              </view>
            </view>
          </view>
          <view class="form-group mt-md">
            <text class="form-label">要求完成时间</text>
            <picker mode="date" :value="editForm.customerDelivery" @change="(e: any) => editForm.customerDelivery = e.detail.value">
              <view class="form-input picker-value">{{ editForm.customerDelivery || '请选择' }}</view>
            </picker>
          </view>
          <view class="form-group mt-md">
            <text class="form-label">备注</text>
            <textarea v-model="editForm.notes" class="form-textarea" placeholder="可选" />
          </view>

          <!-- Trial plan images management (edit mode) -->
          <view class="form-group mt-md">
            <text class="form-label">实验方案</text>
            <view class="image-grid">
              <view v-for="att in attachments" :key="att.id" class="image-item">
                <image :src="resolveImageUrl(att.filePath)" mode="aspectFill" class="image-preview" @click="previewAttachment(att)" />
                <view class="image-delete" @click="deleteAttachment(att.id)">
                  <UIcon name="close" :size="24" color="#ffffff" />
                </view>
              </view>
              <view v-if="attachments.length < 9" class="image-add" @click="addTrialImage">
                <UIcon name="plus" :size="40" color="#c0c4cc" />
              </view>
            </view>
          </view>
        </template>

        <button class="btn btn-primary btn-block mt-lg" :loading="saving" @click="saveEdit">保存</button>
      </template>

      <!-- ===== VIEW MODE ===== -->
      <template v-else>
        <!-- Trial batch view -->
        <template v-if="isTrial">
          <view class="info-grid mt-md">
            <text class="text-secondary">试验内容</text>
            <text>{{ batch.trialContent || '-' }}</text>
            <text class="text-secondary">数量</text>
            <text>{{ quantityDisplay }}</text>
            <text class="text-secondary">封装形式</text>
            <view v-if="batch.packageType" class="tag-list">
              <text v-for="pt in batch.packageType.split(',')" :key="pt" class="tag tag-info">{{ pt.trim() }}</text>
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

          <!-- Trial plan images -->
          <view class="mt-md">
            <text class="form-label">实验方案</text>
            <view v-if="attachments.length > 0" class="image-grid mt-sm">
              <view v-for="att in attachments" :key="att.id" class="image-item" @click="previewAttachment(att)">
                <image :src="resolveImageUrl(att.filePath)" mode="aspectFill" class="image-preview" />
              </view>
            </view>
            <text v-else class="text-secondary text-sm mt-sm" style="display:block">暂无图片</text>
          </view>
        </template>

        <!-- Product batch view -->
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
    <view class="card">
      <text class="section-title">工序进度</text>
      <StageTimeline
        v-if="appStore.stages.length"
        :stages="appStore.stages"
        :progressRecords="batch.progressRecords || []"
      />
    </view>

    <!-- Quick actions -->
    <view v-if="batch.status === 'active' && !editing" class="card">
      <button class="btn btn-primary btn-block" @click="goRecordProgress">
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
import { batchApi, settingsApi, attachmentApi } from "../../api/modules";
import { api } from "../../api/index";
import { STATUS_LABELS, PRIORITIES } from "../../utils/constants";
import { formatDate, formatDateShort, isOverdue as checkOverdue, getOverdueDays } from "../../utils/format";
import type { Batch, PackageType, CustomerCode, BatchAttachment } from "../../types";
import StageTimeline from "../../components/StageTimeline.vue";
import UIcon from "../../components/UIcon.vue";

const appStore = useAppStore();
const userStore = useUserStore();
const batch = ref<Batch | null>(null);
const packageTypes = ref<PackageType[]>([]);
const customerCodes = ref<CustomerCode[]>([]);
const attachments = ref<BatchAttachment[]>([]);

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

const isOverdue = computed(() => checkOverdue(batch.value?.customerDelivery, batch.value?.status));

const overdueDays = computed(() => getOverdueDays(batch.value?.customerDelivery));

const packageTypeNames = computed(() => packageTypes.value.map((pt) => pt.name));

const customerCodeOptions = computed(() => customerCodes.value.map((cc) => cc.code));

function onEditCustomerCodeChange(e: any) {
  editForm.value.customerCode = customerCodes.value[e.detail.value]?.code ?? "";
}

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

function resolveImageUrl(filePath: string): string {
  if (filePath.startsWith("http") || filePath.startsWith("blob:") || filePath.startsWith("wxfile:")) {
    return filePath;
  }
  // #ifdef H5
  return filePath;
  // #endif
  // #ifndef H5
  return api.getBaseUrl() + filePath;
  // #endif
}

function previewAttachment(att: BatchAttachment) {
  const urls = attachments.value.map((a) => resolveImageUrl(a.filePath));
  uni.previewImage({
    current: resolveImageUrl(att.filePath),
    urls,
  });
}

async function addTrialImage() {
  if (!batch.value) return;
  uni.chooseImage({
    count: 9 - attachments.value.length,
    sizeType: ["original"],
    sourceType: ["album", "camera"],
    success: async (res) => {
      let failCount = 0;
      let lastError = "";
      for (const filePath of res.tempFilePaths) {
        try {
          await attachmentApi.upload(batch.value!.id, filePath);
        } catch (e: unknown) {
          failCount++;
          lastError = (e as Error).message || "";
        }
      }
      if (failCount > 0) {
        uni.showModal({
          title: "图片上传",
          content: `${failCount}张上传失败${lastError ? "：" + lastError : ""}`,
          showCancel: false,
        });
      }
      try {
        attachments.value = await attachmentApi.list(batch.value!.id);
      } catch { /* ignore refresh error */ }
    },
  });
}

async function deleteAttachment(attachmentId: number) {
  if (!batch.value) return;
  try {
    await attachmentApi.remove(batch.value.id, attachmentId);
    attachments.value = attachments.value.filter((a) => a.id !== attachmentId);
  } catch {
    uni.showToast({ title: "删除失败", icon: "none" });
  }
}

async function confirmDelete() {
  if (!batch.value) return;
  const displayName = batch.value.product?.model || batch.value.trialContent || batch.value.batchNo;
  const res = await uni.showModal({
    title: "确认删除",
    content: `确定要删除「${displayName}」吗？此操作不可恢复。`,
  });
  if (res.cancel) return;

  try {
    await batchApi.remove(batch.value.id);
    uni.showToast({ title: "已删除", icon: "success" });
    setTimeout(() => uni.navigateBack(), 1000);
  } catch (e: unknown) {
    uni.showModal({
      title: "删除失败",
      content: (e as Error).message || "未知错误",
      showCancel: false,
    });
  }
}

onLoad(async (query) => {
  if (query?.id) {
    try {
      batch.value = await batchApi.get(Number(query.id));
    } catch {
      uni.showToast({ title: "加载失败", icon: "none" });
      return;
    }
    // Load attachments for trial batches (always fetch fresh from API)
    if (batch.value?.batchType === "trial") {
      try {
        attachments.value = await attachmentApi.list(Number(query.id));
      } catch {
        // If API fails, try using attachments from batch detail response
        attachments.value = batch.value.attachments || [];
      }
    }
  }
  // Load package types and customer codes for edit mode
  if (isAdmin.value) {
    try {
      packageTypes.value = await settingsApi.listPackageTypes();
      customerCodes.value = await settingsApi.listCustomerCodes();
    } catch { /* non-critical */ }
  }
});
</script>

<style scoped lang="scss">
.info-grid {
  display: grid;
  grid-template-columns: 168rpx 1fr;
  gap: 20rpx 24rpx;
  font-size: 28rpx;
}
.overdue-warning {
  padding: 14rpx 20rpx;
  background: #ffecec;
  border-radius: 10rpx;
  border-left: 6rpx solid #fa5151;
  color: #fa5151;
}
.status-tag {
  font-size: 24rpx;
  font-weight: 500;
}
.edit-btn {
  padding: 8rpx 22rpx;
  border: 2rpx solid #0083ff;
  border-radius: 999rpx;
  font-size: 24rpx;
  color: #0083ff;
  margin-right: 16rpx;
}
.delete-btn {
  padding: 8rpx 22rpx;
  border: 2rpx solid #e5e7eb;
  border-radius: 999rpx;
  font-size: 24rpx;
  color: #8a8f99;
  margin-right: 16rpx;
}
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  align-items: center;
}
.multi-select-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}
.multi-select-item {
  padding: 14rpx 26rpx;
  border: 2rpx solid #e5e7eb;
  border-radius: 999rpx;
  font-size: 26rpx;
  color: #6b7280;
  background: #fff;
  &.selected {
    background: #e8f4ff;
    border-color: #0083ff;
    color: #0083ff;
  }
}
.quantity-row { display: flex; gap: 16rpx; }
.quantity-field { flex: 1; position: relative; }
.qty-input {
  width: 100%;
  height: 80rpx;
  padding: 0 56rpx 0 20rpx;
  border: 2rpx solid #e5e7eb;
  border-radius: 12rpx;
  font-size: 28rpx;
  background: #fff;
  box-sizing: border-box;
}
.quantity-unit {
  position: absolute;
  right: 20rpx;
  top: 50%;
  transform: translateY(-50%);
  font-size: 26rpx;
  color: #8a8f99;
}
.image-grid { display: flex; flex-wrap: wrap; gap: 16rpx; }
.image-item { position: relative; width: 200rpx; height: 200rpx; }
.image-preview { width: 100%; height: 100%; border-radius: 12rpx; }
.image-delete {
  position: absolute; top: 0; right: 0;
  width: 44rpx; height: 44rpx;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 0 12rpx 0 12rpx;
  display: flex; align-items: center; justify-content: center;
}
.image-add {
  width: 200rpx; height: 200rpx;
  border: 2rpx dashed #d6d9e0;
  border-radius: 12rpx;
  display: flex; align-items: center; justify-content: center;
}
</style>
