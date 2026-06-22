<template>
  <view class="container" v-if="batch">
    <!-- Batch info -->
    <view class="card">
      <view class="flex-between">
        <view class="flex-center">
          <text class="text-lg text-bold">
            {{ batch.batchNo }}
            {{ batch.product?.model || '' }}
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
        <text class="text-sm">已超过客户要求交期 {{ overdueDays }} 天</text>
      </view>

      <!-- ===== EDIT MODE ===== -->
      <template v-if="editing">
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

        <button class="btn btn-primary btn-block mt-lg" :loading="saving" @click="saveEdit">保存</button>
      </template>

      <!-- ===== VIEW MODE ===== -->
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
import { batchApi, settingsApi } from "../../api/modules";
import { STATUS_LABELS, PRIORITIES } from "../../utils/constants";
import { formatDate, formatDateShort, isOverdue as checkOverdue, getOverdueDays } from "../../utils/format";
import type { Batch, PackageType, CustomerCode } from "../../types";
import StageTimeline from "../../components/StageTimeline.vue";

const appStore = useAppStore();
const userStore = useUserStore();
const batch = ref<Batch | null>(null);
const packageTypes = ref<PackageType[]>([]);
const customerCodes = ref<CustomerCode[]>([]);

const editing = ref(false);
const saving = ref(false);

const isAdmin = computed(() => userStore.isAdmin());

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
  notes: "",
});

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

function toggleEdit() {
  if (editing.value) {
    editing.value = false;
    return;
  }
  // Populate form from current batch data
  const b = batch.value!;
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
    notes: b.notes || "",
  };
  editing.value = true;
}

function onPackageTypeChange(e: any) {
  editForm.value.packageType = packageTypes.value[e.detail.value]?.name ?? "";
}

function onPriorityChange(e: any) {
  editForm.value.priority = priorities[e.detail.value]?.value ?? "normal";
}

async function saveEdit() {
  if (!batch.value) return;
  saving.value = true;
  try {
    const updated = await batchApi.update(batch.value.id, {
      batchNo: editForm.value.batchNo,
      productModel: editForm.value.productModel,
      quantity: Number(editForm.value.quantity),
      packageType: editForm.value.packageType || null,
      customerCode: editForm.value.customerCode || null,
      orderNo: editForm.value.orderNo || null,
      customerDelivery: editForm.value.customerDelivery || null,
      productionDelivery: editForm.value.productionDelivery || null,
      priority: editForm.value.priority,
      notes: editForm.value.notes,
    });
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
    },
  });
}

async function confirmDelete() {
  if (!batch.value) return;
  const displayName = batch.value.product?.model || batch.value.batchNo;
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
</style>
