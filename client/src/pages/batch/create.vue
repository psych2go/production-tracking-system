<template>
  <view class="container">
    <view class="card create-card">
      <view class="form-heading">
        <text class="section-title">录入订单</text>
        <text class="form-subtitle">订单录入后进入待制卡</text>
      </view>

      <view class="form-section">
        <text class="form-section-title">订单信息</text>
        <view class="form-group mt-md">
          <text class="form-label">订单编号 *</text>
          <input
            v-model="form.orderNo"
            type="text"
            maxlength="100"
            placeholder="请输入数字订单编号"
            class="form-input"
            @input="onOrderNoInput"
          />
        </view>
        <view class="form-group mt-md">
          <text class="form-label">客户代码 *</text>
          <picker :range="customerCodeOptions" @change="onCustomerCodeChange">
            <view class="form-input picker-value" :class="{ placeholder: !form.customerCode }">
              {{ form.customerCode || '请选择客户代码' }}
            </view>
          </picker>
        </view>
      </view>

      <view class="form-section">
        <text class="form-section-title">产品信息</text>
        <view class="form-group mt-md product-model-field">
          <text class="form-label">产品型号 *</text>
          <input
            v-model="form.productModel"
            placeholder="输入型号，支持已有型号联想"
            class="form-input"
            @input="onProductModelInput"
            @focus="onProductModelInput"
          />
          <view v-if="showSuggestions" class="suggestion-panel">
            <view
              v-for="item in productSuggestions"
              :key="item.id"
              class="suggestion-item"
              @click="selectProductModel(item.model)"
            >
              <text>{{ item.model }}</text>
            </view>
          </view>
        </view>
        <view class="form-group mt-md">
          <text class="form-label">订单数量 *</text>
          <view class="quantity-input-wrap">
            <input v-model="form.quantity" type="number" placeholder="请输入正整数" class="quantity-input" />
            <text class="quantity-unit">只</text>
          </view>
        </view>
        <view class="form-group mt-md">
          <text class="form-label">封装形式 *</text>
          <picker :range="packageTypeNames" @change="onPackageTypeChange">
            <view class="form-input picker-value" :class="{ placeholder: !form.packageType }">
              {{ form.packageType || '请选择封装形式' }}
            </view>
          </picker>
        </view>
      </view>

      <view class="form-section">
        <text class="form-section-title">交付信息</text>
        <view class="form-group mt-md">
          <view class="form-label-row">
            <text class="form-label">客户要求交期</text>
            <text v-if="form.customerDelivery" class="clear-value" @click="form.customerDelivery = ''">清除</text>
          </view>
          <picker mode="date" :value="form.customerDelivery" @change="onCustomerDeliveryChange">
            <view class="form-input picker-value" :class="{ placeholder: !form.customerDelivery }">
              {{ form.customerDelivery || '请选择日期（选填）' }}
            </view>
          </picker>
        </view>
        <view class="form-group mt-md">
          <text class="form-label">优先级</text>
          <picker :range="priorities" range-key="label" @change="onPriorityChange">
            <view class="form-input picker-value">{{ selectedPriorityLabel }}</view>
          </picker>
        </view>
        <view class="form-group mt-md">
          <text class="form-label">备注</text>
          <textarea v-model="form.notes" maxlength="2000" placeholder="客户要求、生产注意事项等（选填）" class="form-textarea" />
        </view>
      </view>

      <view v-if="validationErrors.length" class="validation-errors mt-md">
        <text v-for="(err, i) in validationErrors" :key="i" class="text-sm text-danger">{{ err }}</text>
      </view>

      <button class="btn btn-primary btn-block mt-lg" :loading="submitting" @click="submit">录入订单</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { batchApi, settingsApi } from "../../api/modules";
import { PRIORITIES } from "../../utils/constants";
import type { PackageType, CustomerCode } from "../../types";

const packageTypes = ref<PackageType[]>([]);
const customerCodes = ref<CustomerCode[]>([]);
const productSuggestions = ref<Array<{ id: number; model: string }>>([]);
const showSuggestions = ref(false);
const submitting = ref(false);
const validationErrors = ref<string[]>([]);
const priorities = PRIORITIES;
let suggestionTimer: ReturnType<typeof setTimeout> | null = null;

const form = ref({
  productModel: "",
  quantity: "",
  customerCode: "",
  orderNo: "",
  customerDelivery: "",
  priority: "normal",
  packageType: "",
  notes: "",
});

const selectedPriorityLabel = computed(() =>
  priorities.find((priority) => priority.value === form.value.priority)?.label || "普通"
);
const packageTypeNames = computed(() => packageTypes.value.map((item) => item.name));
const customerCodeOptions = computed(() => customerCodes.value.map((item) => item.code));

function onOrderNoInput(event: any) {
  form.value.orderNo = String(event.detail.value || "").replace(/\D/g, "");
}

function onCustomerCodeChange(event: any) {
  form.value.customerCode = customerCodes.value[event.detail.value]?.code ?? "";
}

function onPriorityChange(event: any) {
  form.value.priority = priorities[event.detail.value]?.value ?? "normal";
}

function onPackageTypeChange(event: any) {
  form.value.packageType = packageTypes.value[event.detail.value]?.name ?? "";
}

function onCustomerDeliveryChange(event: any) {
  form.value.customerDelivery = event.detail.value ?? "";
}

function onProductModelInput() {
  if (suggestionTimer) clearTimeout(suggestionTimer);
  const keyword = form.value.productModel.trim();
  if (keyword.length < 2) {
    productSuggestions.value = [];
    showSuggestions.value = false;
    return;
  }
  suggestionTimer = setTimeout(async () => {
    try {
      productSuggestions.value = await batchApi.productSuggestions(keyword);
      showSuggestions.value = productSuggestions.value.length > 0;
    } catch {
      productSuggestions.value = [];
      showSuggestions.value = false;
    }
  }, 250);
}

function selectProductModel(model: string) {
  form.value.productModel = model;
  showSuggestions.value = false;
}

function validate(): boolean {
  const errors: string[] = [];
  if (!form.value.orderNo) errors.push("订单编号不能为空");
  if (!/^\d+$/.test(form.value.orderNo)) errors.push("订单编号只能包含数字");
  if (!form.value.customerCode) errors.push("请选择客户代码");
  if (!form.value.productModel.trim()) errors.push("产品型号不能为空");
  const quantity = Number(form.value.quantity);
  if (!Number.isInteger(quantity) || quantity <= 0) errors.push("订单数量必须为大于0的整数");
  if (!form.value.packageType) errors.push("请选择封装形式");
  validationErrors.value = errors;
  return errors.length === 0;
}

async function submit() {
  showSuggestions.value = false;
  if (!validate()) {
    uni.showToast({ title: "请检查订单信息", icon: "none" });
    return;
  }

  submitting.value = true;
  try {
    await batchApi.create({
      productModel: form.value.productModel.trim(),
      quantity: Number(form.value.quantity),
      packageType: form.value.packageType,
      customerCode: form.value.customerCode,
      orderNo: form.value.orderNo,
      customerDelivery: form.value.customerDelivery || undefined,
      priority: form.value.priority,
      notes: form.value.notes.trim() || undefined,
    });
    uni.showToast({ title: "订单录入成功", icon: "success" });
    setTimeout(() => uni.navigateBack(), 800);
  } catch (e: unknown) {
    uni.showModal({ title: "录入失败", content: (e as Error).message, showCancel: false });
  } finally {
    submitting.value = false;
  }
}

onMounted(async () => {
  try {
    [packageTypes.value, customerCodes.value] = await Promise.all([
      settingsApi.listPackageTypes(),
      settingsApi.listCustomerCodes(),
    ]);
  } catch (e: unknown) {
    uni.showToast({ title: (e as Error).message, icon: "none" });
  }
});

onBeforeUnmount(() => {
  if (suggestionTimer) clearTimeout(suggestionTimer);
});
</script>

<style scoped lang="scss">
.create-card { border-top: 6rpx solid #087f8c; }
.form-heading { display: flex; flex-direction: column; }
.form-subtitle { margin-top: 4rpx; color: #7d898b; font-size: 22rpx; }
.form-section {
  margin-top: 28rpx;
  padding-top: 22rpx;
  border-top: 2rpx solid #edf0f0;
}
.form-section-title { color: #16343a; font-size: 24rpx; font-weight: 700; }
.form-label-row { display: flex; align-items: center; justify-content: space-between; }
.clear-value { color: #087f8c; font-size: 21rpx; }
.placeholder { color: #aab4b5; }
.product-model-field { position: relative; }
.suggestion-panel {
  position: absolute;
  z-index: 20;
  top: 126rpx;
  left: 0;
  right: 0;
  overflow: hidden;
  border: 2rpx solid #dfe4e4;
  border-radius: 8rpx;
  background: #fff;
  box-shadow: 0 10rpx 26rpx rgba(23, 35, 39, 0.14);
}
.suggestion-item {
  padding: 18rpx 22rpx;
  border-bottom: 2rpx solid #edf0f0;
  color: #2c383c;
  font-size: 26rpx;
  &:last-child { border-bottom: none; }
  &:active { background: #e6f4f3; }
}
.quantity-input-wrap {
  display: flex;
  align-items: center;
  height: 84rpx;
  border: 2rpx solid #dfe4e4;
  border-radius: 10rpx;
  background: #f5f7f7;
}
.quantity-input { flex: 1; height: 80rpx; padding: 0 24rpx; font-size: 28rpx; }
.quantity-unit { padding: 0 24rpx; border-left: 2rpx solid #dfe4e4; color: #657174; font-size: 24rpx; }
.validation-errors {
  display: flex;
  padding: 16rpx 20rpx;
  border-left: 5rpx solid #c9483f;
  border-radius: 6rpx;
  flex-direction: column;
  gap: 6rpx;
  background: #fcecea;
}
</style>
