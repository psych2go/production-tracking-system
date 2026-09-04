<template>
  <view class="container" v-if="batch">
    <view class="card batch-info-card">
      <view class="detail-heading">
        <view class="detail-identity">
          <text v-if="batch.orderNo" class="order-number">订单 {{ batch.orderNo }}</text>
          <view class="title-row">
            <text class="detail-title">{{ displayTitle }}</text>
            <view v-if="batch.priority === 'urgent'" class="urgent-tag">紧急</view>
          </view>
        </view>
        <view class="heading-actions">
          <text v-if="canEdit" class="edit-btn" @click="toggleEdit">{{ editing ? '取消' : '编辑' }}</text>
          <text class="status-tag" :style="{ color: getStatusColor(batch.status) }">{{ statusLabel(batch.status) }}</text>
        </view>
      </view>

      <view v-if="isOverdue && !editing" class="overdue-warning mt-sm">
        <text class="text-sm">已超过客户要求交期 {{ overdueDays }} 天</text>
      </view>

      <template v-if="editing">
        <view v-if="batch.status !== 'pending_card'" class="form-group mt-lg">
          <text class="form-label">生产批号</text>
          <input v-model="editForm.batchNo" class="form-input" />
        </view>
        <view class="form-group mt-md product-model-field">
          <text class="form-label">产品型号</text>
          <input v-model="editForm.productModel" class="form-input" @input="onProductModelInput" />
          <view v-if="showSuggestions" class="suggestion-panel">
            <view v-for="item in productSuggestions" :key="item.id" class="suggestion-item" @click="selectProductModel(item.model)">
              <text>{{ item.model }}</text>
            </view>
          </view>
        </view>
        <view class="form-group mt-md">
          <text class="form-label">订单数量</text>
          <view class="quantity-input-wrap">
            <input v-model="editForm.quantity" type="number" class="quantity-input" />
            <text class="quantity-unit">只</text>
          </view>
        </view>
        <view class="form-group mt-md">
          <text class="form-label">客户代码</text>
          <picker :range="customerCodeOptions" @change="onEditCustomerCodeChange">
            <view class="form-input picker-value">{{ editForm.customerCode }}</view>
          </picker>
        </view>
        <view class="form-group mt-md">
          <text class="form-label">订单编号</text>
          <input v-model="editForm.orderNo" type="text" class="form-input" @input="onOrderNoInput" />
        </view>
        <view class="form-group mt-md">
          <text class="form-label">封装形式</text>
          <picker :range="packageTypeNames" @change="onPackageTypeChange">
            <view class="form-input picker-value">{{ editForm.packageType }}</view>
          </picker>
        </view>
        <view class="form-group mt-md">
          <view class="form-label-row">
            <text class="form-label">客户要求交期</text>
            <text v-if="editForm.customerDelivery" class="clear-value" @click="editForm.customerDelivery = ''">清除</text>
          </view>
          <picker mode="date" :value="editForm.customerDelivery" @change="(event: any) => editForm.customerDelivery = event.detail.value">
            <view class="form-input picker-value">{{ editForm.customerDelivery }}</view>
          </picker>
        </view>
        <view class="form-group mt-md">
          <view class="form-label-row">
            <text class="form-label">生产预计交期</text>
            <text v-if="editForm.productionDelivery" class="clear-value" @click="editForm.productionDelivery = ''">清除</text>
          </view>
          <picker mode="date" :value="editForm.productionDelivery" @change="(event: any) => editForm.productionDelivery = event.detail.value">
            <view class="form-input picker-value">{{ editForm.productionDelivery }}</view>
          </picker>
        </view>
        <view class="form-group mt-md">
          <text class="form-label">优先级</text>
          <picker :range="priorities" range-key="label" @change="onPriorityChange">
            <view class="form-input picker-value">{{ editPriorityLabel }}</view>
          </picker>
        </view>
        <view class="form-group mt-md">
          <text class="form-label">备注</text>
          <textarea v-model="editForm.notes" class="form-textarea" maxlength="2000" />
        </view>
        <button class="btn btn-primary btn-block mt-lg" :loading="saving" @click="saveEdit">保存</button>
      </template>

      <view v-else class="info-grid">
        <view class="info-item"><text class="info-label">产品型号</text><text class="info-value">{{ batch.product?.model || '' }}</text></view>
        <view class="info-item"><text class="info-label">加工数量</text><text class="info-value">{{ batch.quantity }}只</text></view>
        <view class="info-item"><text class="info-label">客户代码</text><text class="info-value">{{ batch.customerCode || '' }}</text></view>
        <view class="info-item"><text class="info-label">封装形式</text><text class="info-value">{{ batch.packageType || '' }}</text></view>
        <view class="info-item"><text class="info-label">客户交期</text><text class="info-value" :class="isOverdue ? 'text-danger' : ''">{{ customerDeliveryText }}<text v-if="isOverdue" class="overdue-text">已逾期</text></text></view>
        <view class="info-item"><text class="info-label">预计交期</text><text class="info-value">{{ productionDeliveryText }}</text></view>
        <view class="info-item" :class="{ 'info-item-wide': !showStartedAt }"><text class="info-label">优先级</text><text class="info-value">{{ priorityLabel(batch.priority) }}</text></view>
        <view v-if="showStartedAt" class="info-item"><text class="info-label">投产时间</text><text class="info-value">{{ batch.startedAt ? formatDate(batch.startedAt) : '' }}</text></view>
        <view class="info-item info-item-wide"><text class="info-label">备注</text><text class="info-value info-notes">{{ batch.notes || '' }}</text></view>
      </view>
    </view>

    <view v-if="showProgress" class="card progress-card">
      <text class="section-title">工序进度</text>
      <StageTimeline v-if="appStore.stages.length" :stages="appStore.stages" :progressRecords="batch.progressRecords || []" />
    </view>

    <view v-if="!editing && hasActions" class="card action-card">
      <button v-if="batch.status === 'pending_card' && isAdmin" class="btn btn-primary btn-block" @click="goCard">去制卡</button>
      <button v-if="batch.status === 'pending' && isAdmin" class="btn btn-primary btn-block" @click="startProduction">投入加工</button>
      <button v-if="batch.status === 'active'" class="btn btn-primary btn-block" @click="goRecordProgress">工序流转</button>
      <button v-if="batch.status === 'completed' && isAdmin" class="btn btn-primary btn-block" @click="archiveBatch">归档</button>
      <button v-if="canCancel" class="btn btn-outline btn-block mt-sm" @click="cancelOrder">取消订单</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
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
const productSuggestions = ref<Array<{ id: number; model: string }>>([]);
const showSuggestions = ref(false);
const editing = ref(false);
const saving = ref(false);
const currentBatchId = ref(0);
const openedFromHome = ref(false);
let suggestionTimer: ReturnType<typeof setTimeout> | null = null;

const isAdmin = computed(() => userStore.isAdmin());
const canEdit = computed(() => isAdmin.value && batch.value?.status !== "cancelled");
const canCancel = computed(() => isAdmin.value && ["pending_card", "pending"].includes(batch.value?.status || ""));
const showProgress = computed(() => ["active", "completed", "archived"].includes(batch.value?.status || ""));
const showStartedAt = computed(() => ["active", "completed", "archived"].includes(batch.value?.status || ""));
const hasActions = computed(() => {
  if (!batch.value) return false;
  if (batch.value.status === "active") return true;
  return isAdmin.value && ["pending_card", "pending", "completed"].includes(batch.value.status);
});
const displayTitle = computed(() => [batch.value?.batchNo, batch.value?.product?.model].filter(Boolean).join(" "));
const customerDeliveryText = computed(() => batch.value?.customerDelivery ? formatDateShort(batch.value.customerDelivery) : "");
const productionDeliveryText = computed(() => batch.value?.productionDelivery ? formatDateShort(batch.value.productionDelivery) : "");
const isOverdue = computed(() => checkOverdue(batch.value?.customerDelivery, batch.value?.status));
const overdueDays = computed(() => getOverdueDays(batch.value?.customerDelivery));
const packageTypeNames = computed(() => packageTypes.value.map((item) => item.name));
const customerCodeOptions = computed(() => customerCodes.value.map((item) => item.code));
const priorities = PRIORITIES;

const editForm = ref({ batchNo: "", productModel: "", quantity: "", customerCode: "", orderNo: "", packageType: "", customerDelivery: "", productionDelivery: "", priority: "normal", notes: "" });
const editPriorityLabel = computed(() => priorities.find((priority) => priority.value === editForm.value.priority)?.label || "普通");

function statusLabel(status: string) { return STATUS_LABELS[status] || status; }
function priorityLabel(priority: string) { return appStore.getPriorityLabel(priority); }
function getStatusColor(status: string) { return appStore.getStatusColor(status); }
function onEditCustomerCodeChange(event: any) { editForm.value.customerCode = customerCodes.value[event.detail.value]?.code ?? ""; }
function onPackageTypeChange(event: any) { editForm.value.packageType = packageTypes.value[event.detail.value]?.name ?? ""; }
function onPriorityChange(event: any) { editForm.value.priority = priorities[event.detail.value]?.value ?? "normal"; }
function onOrderNoInput(event: any) { editForm.value.orderNo = String(event.detail.value || "").replace(/\D/g, ""); }

function onProductModelInput() {
  if (suggestionTimer) clearTimeout(suggestionTimer);
  const keyword = editForm.value.productModel.trim();
  if (keyword.length < 2) { showSuggestions.value = false; return; }
  suggestionTimer = setTimeout(async () => {
    try {
      productSuggestions.value = await batchApi.productSuggestions(keyword);
      showSuggestions.value = productSuggestions.value.length > 0;
    } catch { showSuggestions.value = false; }
  }, 250);
}
function selectProductModel(model: string) { editForm.value.productModel = model; showSuggestions.value = false; }

function toggleEdit() {
  if (editing.value) { editing.value = false; return; }
  const current = batch.value!;
  editForm.value = {
    batchNo: current.batchNo || "",
    productModel: current.product?.model || "",
    quantity: String(current.quantity),
    customerCode: current.customerCode || "",
    orderNo: current.orderNo || "",
    packageType: current.packageType || "",
    customerDelivery: current.customerDelivery?.slice(0, 10) || "",
    productionDelivery: current.productionDelivery?.slice(0, 10) || "",
    priority: current.priority,
    notes: current.notes || "",
  };
  editing.value = true;
}

async function saveEdit() {
  if (!batch.value || saving.value) return;
  const quantity = Number(editForm.value.quantity);
  const isNewFlowTask = ["pending_card", "pending", "cancelled"].includes(batch.value.status);
  if (!editForm.value.productModel.trim() || !Number.isInteger(quantity) || quantity <= 0) {
    uni.showToast({ title: "产品型号和订单数量填写不正确", icon: "none" });
    return;
  }
  if (isNewFlowTask && (!editForm.value.customerCode || !editForm.value.orderNo || !editForm.value.packageType)) {
    uni.showToast({ title: "请完整填写订单必填信息", icon: "none" });
    return;
  }
  if (editForm.value.orderNo && !/^\d+$/.test(editForm.value.orderNo)) {
    uni.showToast({ title: "订单编号只能包含数字", icon: "none" });
    return;
  }
  saving.value = true;
  try {
    const data: Record<string, unknown> = {};
    const productModel = editForm.value.productModel.trim();
    if (productModel !== (batch.value.product?.model || "")) data.productModel = productModel;
    if (quantity !== batch.value.quantity) data.quantity = quantity;
    if (editForm.value.customerCode && editForm.value.customerCode !== batch.value.customerCode) data.customerCode = editForm.value.customerCode;
    if (editForm.value.orderNo && editForm.value.orderNo !== batch.value.orderNo) data.orderNo = editForm.value.orderNo;
    if (editForm.value.packageType && editForm.value.packageType !== batch.value.packageType) data.packageType = editForm.value.packageType;
    const originalCustomerDelivery = batch.value.customerDelivery?.slice(0, 10) || "";
    const originalProductionDelivery = batch.value.productionDelivery?.slice(0, 10) || "";
    if (editForm.value.customerDelivery !== originalCustomerDelivery) data.customerDelivery = editForm.value.customerDelivery || null;
    if (editForm.value.productionDelivery !== originalProductionDelivery) data.productionDelivery = editForm.value.productionDelivery || null;
    if (editForm.value.priority !== batch.value.priority) data.priority = editForm.value.priority;
    if (editForm.value.notes !== (batch.value.notes || "")) data.notes = editForm.value.notes;
    if (batch.value.status !== "pending_card" && editForm.value.batchNo.trim() !== (batch.value.batchNo || "")) data.batchNo = editForm.value.batchNo.trim();
    await batchApi.update(batch.value.id, data);
    editing.value = false;
    uni.showToast({ title: "保存成功", icon: "success" });
    await loadBatch(batch.value.id);
  } catch (e: unknown) {
    uni.showModal({ title: "保存失败", content: (e as Error).message, showCancel: false });
  } finally { saving.value = false; }
}

function goCard() { if (batch.value) uni.navigateTo({ url: `/pages/batch/card?id=${batch.value.id}` }); }
function goRecordProgress() {
  if (!batch.value) return;
  const returnQuery = openedFromHome.value ? "&returnTo=home" : "";
  uni.navigateTo({ url: `/pages/progress/entry?batchId=${batch.value.id}${returnQuery}` });
}
async function startProduction() {
  if (!batch.value) return;
  const result = await uni.showModal({ title: "确认投入加工", content: `${batch.value.batchNo || ''} ${batch.value.product?.model || ''}\n数量：${batch.value.quantity}只\n封装形式：${batch.value.packageType || ''}` });
  if (result.cancel) return;
  try { await batchApi.startProduction(batch.value.id); uni.showToast({ title: "已投入加工", icon: "success" }); await loadBatch(batch.value.id); }
  catch (e: unknown) { uni.showModal({ title: "操作失败", content: (e as Error).message, showCancel: false }); }
}
async function cancelOrder() {
  if (!batch.value) return;
  const result = await uni.showModal({ title: "取消订单", content: `确定取消订单 ${batch.value.orderNo || ''} 吗？` });
  if (result.cancel) return;
  try { await batchApi.cancel(batch.value.id); uni.showToast({ title: "订单已取消", icon: "success" }); await loadBatch(batch.value.id); }
  catch (e: unknown) { uni.showModal({ title: "取消失败", content: (e as Error).message, showCancel: false }); }
}
async function archiveBatch() {
  if (!batch.value) return;
  const result = await uni.showModal({ title: "确认归档", content: `确定归档 ${displayTitle.value} 吗？` });
  if (result.cancel) return;
  try { await batchApi.update(batch.value.id, { status: "archived" }); uni.showToast({ title: "已归档", icon: "success" }); await loadBatch(batch.value.id); }
  catch (e: unknown) { uni.showModal({ title: "归档失败", content: (e as Error).message, showCancel: false }); }
}

async function loadBatch(id: number) {
  try { batch.value = await batchApi.get(id); }
  catch { uni.showToast({ title: "加载失败", icon: "none" }); return; }
  if (isAdmin.value && !packageTypes.value.length) {
    try { [packageTypes.value, customerCodes.value] = await Promise.all([settingsApi.listPackageTypes(), settingsApi.listCustomerCodes()]); }
    catch { /* non-critical */ }
  }
}

onLoad(async (query) => {
  openedFromHome.value = query?.from === "home";
  currentBatchId.value = Number(query?.id || 0);
  if (currentBatchId.value) await loadBatch(currentBatchId.value);
});
onShow(async () => { if (currentBatchId.value) await loadBatch(currentBatchId.value); });
onBeforeUnmount(() => { if (suggestionTimer) clearTimeout(suggestionTimer); });
</script>

<style scoped lang="scss">
.batch-info-card { border-top: 6rpx solid #087f8c; }
.detail-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 16rpx; }
.detail-identity { display: flex; min-width: 0; flex: 1; flex-direction: column; }
.order-number { color: #7d898b; font-size: 20rpx; }
.title-row { display: flex; align-items: center; min-width: 0; margin-top: 3rpx; }
.detail-title { overflow: hidden; color: #172327; font-size: 33rpx; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.heading-actions { display: flex; align-items: center; flex-shrink: 0; gap: 14rpx; }
.edit-btn { padding: 6rpx 10rpx; border-bottom: 2rpx solid #087f8c; color: #087f8c; font-size: 23rpx; }
.status-tag { font-size: 23rpx; font-weight: 700; }
.info-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); margin-top: 20rpx; overflow: hidden; border: 2rpx solid #edf0f0; border-radius: 10rpx; background: #edf0f0; gap: 2rpx; }
.info-item { display: flex; min-width: 0; min-height: 90rpx; padding: 13rpx 16rpx; flex-direction: column; justify-content: center; background: #fff; }
.info-item-wide { grid-column: 1 / -1; }
.info-label { color: #7d898b; font-size: 20rpx; }
.info-value { overflow: hidden; margin-top: 4rpx; color: #172327; font-size: 24rpx; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.info-notes { overflow: visible; font-weight: 400; white-space: normal; }
.overdue-text { margin-left: 6rpx; font-size: 18rpx; }
.progress-card { border-left: 6rpx solid #16343a; }
.action-card { display: flex; flex-direction: column; }
.overdue-warning { padding: 14rpx 20rpx; border-left: 6rpx solid #c9483f; border-radius: 6rpx; background: #fcecea; color: #c9483f; }
.form-label-row { display: flex; align-items: center; justify-content: space-between; }
.clear-value { color: #087f8c; font-size: 21rpx; }
.product-model-field { position: relative; }
.suggestion-panel { position: absolute; z-index: 20; top: 126rpx; left: 0; right: 0; overflow: hidden; border: 2rpx solid #dfe4e4; border-radius: 8rpx; background: #fff; box-shadow: 0 10rpx 26rpx rgba(23,35,39,.14); }
.suggestion-item { padding: 18rpx 22rpx; border-bottom: 2rpx solid #edf0f0; font-size: 25rpx; &:last-child { border-bottom: none; } }
.quantity-input-wrap { display: flex; align-items: center; height: 84rpx; border: 2rpx solid #dfe4e4; border-radius: 10rpx; background: #f5f7f7; }
.quantity-input { flex: 1; height: 80rpx; padding: 0 24rpx; font-size: 28rpx; }
.quantity-unit { padding: 0 24rpx; border-left: 2rpx solid #dfe4e4; color: #657174; font-size: 24rpx; }
</style>
