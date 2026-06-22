<template>
  <view class="container">
    <view class="card">
      <text class="section-title">新建批次</text>

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
        <picker :range="customerCodeOptions" @change="onCustomerCodeChange">
          <view class="form-input picker-value">{{ form.customerCode || '请选择客户代码' }}</view>
        </picker>
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

      <!-- Validation hints -->
      <view v-if="validationErrors.length" class="validation-errors mt-md">
        <text v-for="(err, i) in validationErrors" :key="i" class="text-sm text-danger">{{ err }}</text>
      </view>

      <button class="btn btn-primary btn-block mt-lg" :loading="submitting" @click="submit">创建批次</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { batchApi, settingsApi } from "../../api/modules";
import { PRIORITIES } from "../../utils/constants";
import type { PackageType, CustomerCode } from "../../types";

const packageTypes = ref<PackageType[]>([]);
const customerCodes = ref<CustomerCode[]>([]);
const submitting = ref(false);
const validationErrors = ref<string[]>([]);

const priorities = PRIORITIES;

const form = ref({
  batchNo: "",
  productModel: "",
  quantity: "",
  customerCode: "",
  orderNo: "",
  customerDelivery: "",
  productionDelivery: "",
  priority: "normal",
  packageType: "",
  notes: "",
});

const selectedPriorityLabel = computed(() => {
  return priorities.find((p) => p.value === form.value.priority)?.label || "";
});

const packageTypeNames = computed(() => packageTypes.value.map((pt) => pt.name));

const customerCodeOptions = computed(() => customerCodes.value.map((cc) => cc.code));

function onCustomerCodeChange(e: any) {
  form.value.customerCode = customerCodes.value[e.detail.value]?.code ?? "";
}

function onPriorityChange(e: any) {
  form.value.priority = priorities[e.detail.value]?.value ?? "normal";
}

function onPackageTypeChange(e: any) {
  form.value.packageType = packageTypes.value[e.detail.value]?.name ?? "";
}

function onCustomerDeliveryChange(e: any) {
  form.value.customerDelivery = e.detail.value ?? "";
}

function onProductionDeliveryChange(e: any) {
  form.value.productionDelivery = e.detail.value ?? "";
}

function validate(): boolean {
  const errors: string[] = [];
  if (!form.value.batchNo.trim()) errors.push("批号不能为空");
  if (!form.value.productModel.trim()) errors.push("产品型号不能为空");
  if (!form.value.quantity || Number(form.value.quantity) <= 0) errors.push("数量必须大于0");
  if (!form.value.packageType) errors.push("请选择封装形式");
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
    await batchApi.create({
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
    uni.showToast({ title: "创建成功", icon: "success" });
    setTimeout(() => uni.navigateBack(), 1000);
  } catch (e: unknown) {
    const msg = (e as Error).message;
    uni.showModal({ title: "创建失败", content: msg, showCancel: false });
  } finally {
    submitting.value = false;
  }
}

onMounted(async () => {
  try {
    packageTypes.value = await settingsApi.listPackageTypes();
    customerCodes.value = await settingsApi.listCustomerCodes();
  } catch (e: unknown) {
    uni.showToast({ title: (e as Error).message, icon: "none" });
  }
});
</script>

<style scoped lang="scss">
.validation-errors {
  padding: 16rpx 20rpx;
  background: #ffecec;
  border-radius: 10rpx;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
</style>
