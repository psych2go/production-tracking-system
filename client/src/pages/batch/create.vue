<template>
  <view class="container">
    <view class="card">
      <text class="section-title text-bold">新建批次</text>

      <!-- Type selector -->
      <view class="type-selector mt-lg">
        <view
          class="type-option"
          :class="{ active: form.batchType === 'product' }"
          @click="switchType('product')"
        >
          <text>产品</text>
        </view>
        <view
          class="type-option"
          :class="{ active: form.batchType === 'trial' }"
          @click="switchType('trial')"
        >
          <text>试验</text>
        </view>
      </view>

      <!-- Product template -->
      <template v-if="form.batchType === 'product'">
        <view class="form-group mt-lg">
          <text class="form-label">生产批号 *</text>
          <input v-model="form.batchNo" placeholder="请输入批号" class="form-input" focus />
        </view>

        <view class="form-group mt-md">
          <text class="form-label">产品型号 *</text>
          <input v-model="form.productModel" placeholder="请输入产品型号" class="form-input" />
        </view>

        <view class="form-group mt-md">
          <text class="form-label">加工数量 *</text>
          <input v-model="form.quantity" type="number" placeholder="请输入数量" class="form-input" />
        </view>

        <view class="form-group mt-md">
          <text class="form-label">封装形式 *</text>
          <picker :range="packageTypeNames" @change="onPackageTypeChange">
            <view class="form-input picker-value">{{ form.packageType || '请选择封装形式' }}</view>
          </picker>
        </view>

        <view class="form-group mt-md">
          <text class="form-label">客户代码</text>
          <input v-model="form.customerCode" placeholder="请输入客户代码" class="form-input" />
        </view>

        <view class="form-group mt-md">
          <text class="form-label">订单编号</text>
          <input v-model="form.orderNo" placeholder="请输入订单编号" class="form-input" />
        </view>

        <view class="form-group mt-md">
          <text class="form-label">优先级</text>
          <picker :range="priorities" range-key="label" @change="onPriorityChange">
            <view class="form-input picker-value">{{ selectedPriorityLabel || '普通' }}</view>
          </picker>
        </view>

        <view class="form-group mt-md">
          <text class="form-label">客户要求交期</text>
          <picker mode="date" @change="onCustomerDeliveryChange">
            <view class="form-input picker-value">{{ form.customerDelivery || '请选择客户要求交期' }}</view>
          </picker>
        </view>

        <view class="form-group mt-md">
          <text class="form-label">生产预计交期</text>
          <picker mode="date" @change="onProductionDeliveryChange">
            <view class="form-input picker-value">{{ form.productionDelivery || '请选择生产预计交期' }}</view>
          </picker>
        </view>

        <view class="form-group mt-md">
          <text class="form-label">备注</text>
          <textarea v-model="form.notes" placeholder="备注信息（可选）" class="form-textarea" />
        </view>
      </template>

      <!-- Trial template -->
      <template v-else>
        <view class="form-group mt-lg">
          <text class="form-label">试验内容 *</text>
          <textarea v-model="form.trialContent" placeholder="请输入试验内容" class="form-textarea" focus />
        </view>

        <view class="form-group mt-md">
          <text class="form-label">封装形式（可多选）</text>
          <view class="multi-select-list">
            <view
              v-for="pt in packageTypes"
              :key="pt.id"
              class="multi-select-item"
              :class="{ selected: selectedPackageTypes.has(pt.name) }"
              @click="togglePackageType(pt.name)"
            >
              <text>{{ pt.name }}</text>
            </view>
          </view>
        </view>

        <view class="form-group mt-md">
          <text class="form-label">数量</text>
          <view class="quantity-row">
            <view class="quantity-field">
              <input v-model="form.trialQtyTiao" type="number" placeholder="0" class="form-input" />
              <text class="quantity-unit">条</text>
            </view>
            <view class="quantity-field">
              <input v-model="form.trialQtyZhi" type="number" placeholder="0" class="form-input" />
              <text class="quantity-unit">只</text>
            </view>
          </view>
        </view>

        <view class="form-group mt-md">
          <text class="form-label">要求完成时间</text>
          <picker mode="date" @change="onTrialCustomerDeliveryChange">
            <view class="form-input picker-value">{{ form.deadline || '请选择完成时间' }}</view>
          </picker>
        </view>

        <view class="form-group mt-md">
          <text class="form-label">备注</text>
          <textarea v-model="form.notes" placeholder="备注信息（可选）" class="form-textarea" />
        </view>
      </template>

      <!-- Validation hints -->
      <view v-if="validationErrors.length" class="validation-errors mt-md">
        <text v-for="(err, i) in validationErrors" :key="i" class="text-sm text-danger">{{ err }}</text>
      </view>

      <button class="btn-primary mt-lg" :loading="submitting" @click="submit">创建批次</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { batchApi, settingsApi } from "../../api/modules";
import { PRIORITIES } from "../../utils/constants";
import type { PackageType } from "../../types";

const packageTypes = ref<PackageType[]>([]);
const submitting = ref(false);
const validationErrors = ref<string[]>([]);

// Trial batch multi-select state
const selectedPackageTypes = ref<Set<string>>(new Set());

const priorities = PRIORITIES;

const form = ref({
  batchType: "product" as "product" | "trial",
  // Product fields
  batchNo: "",
  productModel: "",
  quantity: "",
  customerCode: "",
  orderNo: "",
  customerDelivery: "",
  productionDelivery: "",
  priority: "normal",
  // Shared fields
  packageType: "",
  notes: "",
  // Trial fields
  trialContent: "",
  trialQtyTiao: "",
  trialQtyZhi: "",
  deadline: "",
});

function switchType(type: "product" | "trial") {
  form.value.batchType = type;
  // Reset shared fields on switch
  form.value.packageType = "";
  form.value.notes = "";
  selectedPackageTypes.value = new Set();
  validationErrors.value = [];
}

const selectedPriorityLabel = computed(() => {
  return priorities.find((p) => p.value === form.value.priority)?.label || "";
});

const packageTypeNames = computed(() => packageTypes.value.map((pt) => pt.name));

function onPriorityChange(e: any) {
  form.value.priority = priorities[e.detail.value]?.value ?? "normal";
}

function onPackageTypeChange(e: any) {
  form.value.packageType = packageTypes.value[e.detail.value]?.name ?? "";
}

function togglePackageType(name: string) {
  const s = new Set(selectedPackageTypes.value);
  if (s.has(name)) {
    s.delete(name);
  } else {
    s.add(name);
  }
  selectedPackageTypes.value = s;
}

function onCustomerDeliveryChange(e: any) {
  form.value.customerDelivery = e.detail.value ?? "";
}

function onProductionDeliveryChange(e: any) {
  form.value.productionDelivery = e.detail.value ?? "";
}

function onTrialCustomerDeliveryChange(e: any) {
  form.value.deadline = e.detail.value ?? "";
}

function validate(): boolean {
  const errors: string[] = [];

  if (form.value.batchType === "product") {
    if (!form.value.batchNo.trim()) errors.push("批号不能为空");
    if (!form.value.productModel.trim()) errors.push("产品型号不能为空");
    if (!form.value.quantity || Number(form.value.quantity) <= 0) errors.push("数量必须大于0");
    if (!form.value.packageType) errors.push("请选择封装形式");
  } else {
    if (!form.value.trialContent.trim()) errors.push("试验内容不能为空");
  }
  validationErrors.value = errors;
  return errors.length === 0;
}

async function submit() {
  if (!validate()) {
    uni.showToast({ title: "请填写必填项", icon: "none" });
    return;
  }

  submitting.value = true;
  try {
    if (form.value.batchType === "product") {
      await batchApi.create({
        batchType: "product",
        batchNo: form.value.batchNo,
        productModel: form.value.productModel,
        quantity: Number(form.value.quantity),
        packageType: form.value.packageType || undefined,
        customerCode: form.value.customerCode || undefined,
        orderNo: form.value.orderNo || undefined,
        customerDelivery: form.value.customerDelivery || undefined,
        productionDelivery: form.value.productionDelivery || undefined,
        priority: form.value.priority,
        notes: form.value.notes || undefined,
      });
    } else {
      const qtyTiao = form.value.trialQtyTiao ? Number(form.value.trialQtyTiao) : 0;
      const qtyZhi = form.value.trialQtyZhi ? Number(form.value.trialQtyZhi) : 0;
      const detail: Record<string, number> = {};
      if (qtyTiao > 0) detail["条"] = qtyTiao;
      if (qtyZhi > 0) detail["只"] = qtyZhi;

      await batchApi.create({
        batchType: "trial",
        trialContent: form.value.trialContent,
        quantity: qtyTiao + qtyZhi,
        quantityDetail: Object.keys(detail).length > 0 ? JSON.stringify(detail) : undefined,
        packageType: selectedPackageTypes.value.size > 0
          ? Array.from(selectedPackageTypes.value).join(",") || undefined
          : undefined,
        customerDelivery: form.value.deadline || undefined,
        notes: form.value.notes || undefined,
      });
    }
    uni.showToast({ title: "创建成功", icon: "success" });
    setTimeout(() => uni.navigateBack(), 1000);
  } catch (e: unknown) {
    uni.showToast({ title: (e as Error).message, icon: "none" });
  } finally {
    submitting.value = false;
  }
}

onMounted(async () => {
  try {
    packageTypes.value = await settingsApi.listPackageTypes();
  } catch (e: unknown) {
    uni.showToast({ title: (e as Error).message, icon: "none" });
  }
});
</script>

<style scoped lang="scss">
.section-title { font-size: 32rpx; }
.type-selector {
  display: flex;
  gap: 16rpx;
}
.type-option {
  flex: 1;
  text-align: center;
  padding: 20rpx 0;
  border: 2rpx solid #e5e5e5;
  border-radius: 12rpx;
  font-size: 30rpx;
  color: #666;
  transition: all 0.2s;

  &.active {
    background: #0083ff;
    color: #fff;
    border-color: #0083ff;
  }
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
.combo-input {
  display: flex;
  gap: 12rpx;
  align-items: center;
}
.combo-field {
  flex: 1;
}
.combo-btn {
  padding: 18rpx 24rpx;
  background: #f0f7ff;
  color: #0083ff;
  border-radius: 12rpx;
  font-size: 26rpx;
  white-space: nowrap;
}
.validation-errors {
  padding: 16rpx 20rpx;
  background: #fff2f0;
  border-radius: 8rpx;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
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
}
</style>
