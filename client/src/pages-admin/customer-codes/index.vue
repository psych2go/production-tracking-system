<template>
  <view class="container">
    <view class="card">
      <view class="flex-between">
        <text class="section-title text-bold">客户代码管理</text>
        <text class="text-primary text-sm" @click="toggleAddForm">{{ showAddForm ? '取消添加' : '+ 添加客户代码' }}</text>
      </view>

      <!-- Add form -->
      <view v-if="showAddForm" class="form-block add-block">
        <view class="form-field">
          <text class="field-label">客户代码<text class="required-mark">*</text></text>
          <input v-model="addForm.code" placeholder="如：HIC" class="field-input" focus />
        </view>
        <view class="form-field">
          <text class="field-label">客户名称</text>
          <input v-model="addForm.name" placeholder="如：混合" class="field-input" />
        </view>
        <view class="form-field">
          <text class="field-label">客户类型</text>
          <picker :range="typeOptions" range-key="label" @change="(event: any) => addForm.type = typeOptions[event.detail.value]?.value ?? ''">
            <view class="field-input picker-value">{{ typeLabel(addForm.type) || '未分类（点击选择）' }}</view>
          </picker>
        </view>
        <view class="form-actions">
          <button class="btn btn-cancel" @click="showAddForm = false">取消</button>
          <button class="btn btn-save" :loading="saving" @click="submitAdd">保存</button>
        </view>
      </view>

      <!-- List -->
      <view class="cc-list">
        <view
          v-for="cc in customerCodes"
          :key="cc.id"
          class="cc-item"
          :class="{ 'cc-item-editing': editingId === cc.id }"
        >
          <!-- Info row -->
          <view class="cc-row" @click="toggleEdit(cc)">
            <text class="cc-code">{{ cc.code }}</text>
            <text class="cc-name">{{ cc.name || '未填名称' }}</text>
            <view class="cc-type" :class="typeClass(cc.type)">{{ typeLabel(cc.type) || '未分类' }}</view>
            <text class="cc-chevron">›</text>
          </view>

          <!-- Edit form -->
          <view v-if="editingId === cc.id" class="form-block edit-block" @click.stop>
            <view class="form-field">
              <text class="field-label">客户代码</text>
              <view class="field-input field-static">{{ cc.code }}</view>
            </view>
            <view class="form-field">
              <text class="field-label">客户名称</text>
              <input v-model="editForm.name" placeholder="如：混合" class="field-input" />
            </view>
            <view class="form-field">
              <text class="field-label">客户类型</text>
              <picker :range="typeOptions" range-key="label" @change="(event: any) => editForm.type = typeOptions[event.detail.value]?.value ?? ''">
                <view class="field-input picker-value">{{ typeLabel(editForm.type) || '未分类（点击选择）' }}</view>
              </picker>
            </view>
            <view class="form-actions">
              <button class="btn btn-danger-text" @click="handleDelete(cc)">删除</button>
              <view class="form-actions-right">
                <button class="btn btn-cancel" @click="cancelEdit">取消</button>
                <button class="btn btn-save" :loading="saving" @click="saveEdit(cc)">保存</button>
              </view>
            </view>
          </view>
        </view>

        <view v-if="!customerCodes.length" class="text-center mt-lg text-secondary">
          <text>暂无客户代码，点击右上角添加</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { settingsApi } from "../../api/modules";
import { CUSTOMER_TYPES, CUSTOMER_TYPE_LABELS } from "../../utils/constants";
import type { CustomerCode } from "../../types";

const customerCodes = ref<CustomerCode[]>([]);
const showAddForm = ref(false);
const saving = ref(false);
const editingId = ref<number | null>(null);
const editForm = ref({ name: "", type: "" });
const addForm = ref({ code: "", name: "", type: "" });
const typeOptions = [{ label: "未分类", value: "" }, ...CUSTOMER_TYPES];

function typeLabel(type: string | null | undefined): string {
  return type ? CUSTOMER_TYPE_LABELS[type] || "" : "";
}
function typeClass(type: string | null | undefined): string {
  return type ? `type-${type}` : "type-none";
}

async function loadCustomerCodes() {
  try {
    customerCodes.value = await settingsApi.listCustomerCodes();
  } catch (e: unknown) {
    uni.showToast({ title: (e as Error).message, icon: "none" });
  }
}

function toggleAddForm() {
  addForm.value = { code: "", name: "", type: "" };
  showAddForm.value = !showAddForm.value;
  editingId.value = null;
}

function toggleEdit(cc: CustomerCode) {
  if (showAddForm.value) showAddForm.value = false;
  if (editingId.value === cc.id) {
    editingId.value = null;
    return;
  }
  editingId.value = cc.id;
  editForm.value = { name: cc.name || "", type: cc.type || "" };
}

function cancelEdit() {
  editingId.value = null;
}

async function submitAdd() {
  if (!addForm.value.code.trim()) {
    uni.showToast({ title: "请填写客户代码", icon: "none" });
    return;
  }
  saving.value = true;
  try {
    await settingsApi.createCustomerCode({
      code: addForm.value.code.trim(),
      name: addForm.value.name.trim() || undefined,
      type: addForm.value.type || undefined,
    });
    uni.showToast({ title: "添加成功", icon: "success" });
    showAddForm.value = false;
    await loadCustomerCodes();
  } catch (e: unknown) {
    uni.showToast({ title: (e as Error).message, icon: "none" });
  } finally {
    saving.value = false;
  }
}

async function saveEdit(cc: CustomerCode) {
  saving.value = true;
  try {
    await settingsApi.updateCustomerCode(cc.id, {
      name: editForm.value.name.trim(),
      type: editForm.value.type || null,
    });
    uni.showToast({ title: "保存成功", icon: "success" });
    editingId.value = null;
    await loadCustomerCodes();
  } catch (e: unknown) {
    uni.showToast({ title: (e as Error).message, icon: "none" });
  } finally {
    saving.value = false;
  }
}

async function handleDelete(cc: CustomerCode) {
  const res = await uni.showModal({
    title: "确认删除",
    content: `确定要删除客户代码"${cc.code}"吗？`,
  });
  if (res.cancel) return;

  try {
    await settingsApi.deleteCustomerCode(cc.id);
    uni.showToast({ title: "删除成功", icon: "success" });
    editingId.value = null;
    await loadCustomerCodes();
  } catch (e: unknown) {
    uni.showToast({ title: (e as Error).message, icon: "none" });
  }
}

onMounted(loadCustomerCodes);
</script>

<style scoped lang="scss">
.section-title { font-size: 32rpx; }
.flex-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* List rows: code chip -> name -> type tag, clear hierarchy */
.cc-item {
  border-bottom: 2rpx solid #edf0f0;
  &:last-child { border-bottom: none; }
  &.cc-item-editing {
    border-bottom-color: transparent;
    background: #f6fafa;
    border-radius: 10rpx;
  }
}
.cc-row {
  display: flex;
  align-items: center;
  gap: 18rpx;
  padding: 26rpx 8rpx;
}
.cc-code {
  flex-shrink: 0;
  min-width: 128rpx;
  padding: 8rpx 14rpx;
  box-sizing: border-box;
  border-radius: 8rpx;
  background: #e6f4f3;
  color: #075e68;
  font-size: 25rpx;
  font-weight: 700;
  text-align: center;
}
.cc-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  color: #172327;
  font-size: 28rpx;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cc-type {
  flex-shrink: 0;
  padding: 5rpx 14rpx;
  border-radius: 6rpx;
  font-size: 21rpx;
  font-weight: 600;
  &.type-internal { background: #e6f3ec; color: #27865f; }
  &.type-external { background: #fff3df; color: #9a5a00; }
  &.type-none { background: #edf0f0; color: #9aa5a7; font-weight: 400; }
}
.cc-chevron {
  flex-shrink: 0;
  color: #c0c4cc;
  font-size: 32rpx;
  line-height: 1;
}

/* Form blocks (add + edit) share field styles */
.form-block {
  padding: 22rpx 20rpx 24rpx;
  border: 2rpx solid #dfe4e4;
  border-radius: 12rpx;
  background: #fff;
}
.add-block {
  margin: 16rpx 0 24rpx;
  border-color: #087f8c;
}
.edit-block {
  margin: 0 8rpx 22rpx;
}
.form-field {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  margin-bottom: 20rpx;
  &:last-of-type { margin-bottom: 0; }
}
.field-label {
  color: #657174;
  font-size: 23rpx;
  font-weight: 600;
}
.required-mark { margin-left: 4rpx; color: #c9483f; }
.field-input {
  min-height: 80rpx;
  padding: 18rpx 22rpx;
  box-sizing: border-box;
  border: 2rpx solid #dfe4e4;
  border-radius: 10rpx;
  background: #f8fafa;
  color: #172327;
  font-size: 27rpx;
}
.picker-value { line-height: 44rpx; }
.field-static {
  background: #edf0f0;
  color: #657174;
  font-weight: 600;
}

.form-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  margin-top: 24rpx;
}
.form-actions-right {
  display: flex;
  flex: 1;
  justify-content: flex-end;
  gap: 16rpx;
}
.btn {
  margin: 0;
  min-height: 72rpx;
  padding: 0 34rpx;
  border: none;
  border-radius: 10rpx;
  font-size: 26rpx;
  font-weight: 600;
  line-height: 72rpx;
  &::after { border: none; }
}
.btn-cancel {
  background: #edf0f0;
  color: #657174;
}
.btn-save {
  background: #087f8c;
  color: #fff;
}
.btn-danger-text {
  background: #fcecea;
  color: #c9483f;
}
</style>
