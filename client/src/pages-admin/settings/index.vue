<template>
  <view class="container">
    <view class="card">
      <view class="flex-between">
        <text class="section-title text-bold">工序管理</text>
        <text class="text-primary text-sm" @click="showAddForm = true">添加工序</text>
      </view>

      <!-- Stage list -->
      <view class="mt-md">
        <view v-for="stage in stages" :key="stage.id" class="stage-row">
          <view class="stage-info">
            <view class="stage-order-badge">{{ stage.stageOrder }}</view>
            <view class="stage-detail">
              <text class="text-bold">{{ stage.name }}</text>
              <text class="text-sm text-secondary">{{ stage.code }}</text>
            </view>
            <view v-if="stage.isQcStage" class="qc-badge">质检</view>
          </view>
          <view class="stage-actions">
            <text class="text-primary text-sm" @click="startEdit(stage)">编辑</text>
            <text class="text-danger text-sm ml-md" @click="handleDelete(stage)">删除</text>
          </view>
        </view>
        <view v-if="!stages.length" class="text-center mt-lg text-secondary">
          <text>暂无工序</text>
        </view>
      </view>
    </view>

    <!-- Add/Edit form -->
    <view v-if="showAddForm || editingStage" class="card mt-md">
      <view class="flex-between">
        <text class="text-bold">{{ editingStage ? '编辑工序' : '添加工序' }}</text>
        <text class="text-secondary text-sm" @click="cancelForm">取消</text>
      </view>
      <view class="form-group mt-md">
        <text class="form-label">工序代码</text>
        <input v-model="formData.code" placeholder="如: incoming_inspection" class="form-input" :disabled="!!editingStage" />
      </view>
      <view class="form-group mt-md">
        <text class="form-label">工序名称</text>
        <input v-model="formData.name" placeholder="如: 来料检验" class="form-input" />
      </view>
      <view class="form-group mt-md">
        <text class="form-label">排序号</text>
        <input v-model="formData.stageOrder" type="number" placeholder="数字越小越靠前" class="form-input" />
      </view>
      <view class="form-group mt-md">
        <text class="form-label">描述（可选）</text>
        <textarea v-model="formData.description" placeholder="工序描述" class="form-textarea" />
      </view>
      <view class="form-group mt-md">
        <view class="flex-center" @click="formData.isQcStage = !formData.isQcStage">
          <view class="checkbox" :class="{ checked: formData.isQcStage }"></view>
          <text class="ml-sm">质检工序</text>
        </view>
      </view>
      <button class="btn-primary mt-lg" :loading="saving" @click="submitForm">保存</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { settingsApi } from "../../api/modules";
import type { ProcessStage } from "../../types";

const stages = ref<ProcessStage[]>([]);
const showAddForm = ref(false);
const editingStage = ref<ProcessStage | null>(null);
const saving = ref(false);

const formData = ref({
  code: "",
  name: "",
  stageOrder: "",
  isQcStage: false,
  description: "",
});

async function loadStages() {
  try {
    stages.value = await settingsApi.stages();
  } catch (e: unknown) {
    uni.showToast({ title: (e as Error).message, icon: "none" });
  }
}

function startEdit(stage: ProcessStage) {
  editingStage.value = stage;
  formData.value = {
    code: stage.code,
    name: stage.name,
    stageOrder: String(stage.stageOrder),
    isQcStage: stage.isQcStage,
    description: stage.description ?? "",
  };
  showAddForm.value = false;
}

function cancelForm() {
  showAddForm.value = false;
  editingStage.value = null;
  formData.value = { code: "", name: "", stageOrder: "", isQcStage: false, description: "" };
}

async function submitForm() {
  if (!formData.value.name || !formData.value.stageOrder) {
    uni.showToast({ title: "请填写名称和排序号", icon: "none" });
    return;
  }

  saving.value = true;
  try {
    if (editingStage.value) {
      await settingsApi.updateStage(editingStage.value.id, {
        name: formData.value.name,
        stageOrder: Number(formData.value.stageOrder),
        isQcStage: formData.value.isQcStage,
        description: formData.value.description || null,
      });
    } else {
      if (!formData.value.code) {
        uni.showToast({ title: "请填写工序代码", icon: "none" });
        return;
      }
      await settingsApi.createStage({
        code: formData.value.code,
        name: formData.value.name,
        stageOrder: Number(formData.value.stageOrder),
        isQcStage: formData.value.isQcStage,
        description: formData.value.description || undefined,
      });
    }
    uni.showToast({ title: "保存成功", icon: "success" });
    cancelForm();
    await loadStages();
  } catch (e: unknown) {
    uni.showToast({ title: (e as Error).message, icon: "none" });
  } finally {
    saving.value = false;
  }
}

async function handleDelete(stage: ProcessStage) {
  const res = await uni.showModal({
    title: "确认删除",
    content: `确定要删除工序"${stage.name}"吗？`,
  });
  if (res.cancel) return;

  try {
    await settingsApi.deleteStage(stage.id);
    uni.showToast({ title: "删除成功", icon: "success" });
    await loadStages();
  } catch (e: unknown) {
    uni.showToast({ title: (e as Error).message, icon: "none" });
  }
}

onMounted(loadStages);
</script>

<style scoped lang="scss">
.stage-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
  &:last-child { border-bottom: none; }
}
.stage-info {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex: 1;
}
.stage-order-badge {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background: #f0f7ff;
  color: #0083ff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: 600;
  flex-shrink: 0;
}
.stage-detail {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.qc-badge {
  background: #fff3e0;
  color: #ff9800;
  font-size: 22rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}
.stage-actions {
  flex-shrink: 0;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.form-label {
  font-size: 26rpx;
  color: #666;
}
.form-input {
  border: 2rpx solid #e5e5e5;
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
  font-size: 28rpx;
}
.form-textarea {
  border: 2rpx solid #e5e5e5;
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
  font-size: 28rpx;
  height: 160rpx;
}
.checkbox {
  width: 36rpx;
  height: 36rpx;
  border: 2rpx solid #ccc;
  border-radius: 6rpx;
  &.checked {
    background: #0083ff;
    border-color: #0083ff;
    position: relative;
    &::after {
      content: "";
      position: absolute;
      left: 10rpx;
      top: 4rpx;
      width: 12rpx;
      height: 20rpx;
      border: solid #fff;
      border-width: 0 3rpx 3rpx 0;
      transform: rotate(45deg);
    }
  }
}
.flex-center {
  display: flex;
  align-items: center;
}
.btn-primary {
  background: #0083ff;
  color: #fff;
  border: none;
  border-radius: 12rpx;
  padding: 24rpx 0;
  font-size: 32rpx;
  text-align: center;
}
.section-title {
  font-size: 32rpx;
}
.ml-sm { margin-left: 8rpx; }
.ml-md { margin-left: 24rpx; }
.mt-md { margin-top: 24rpx; }
.mt-lg { margin-top: 40rpx; }
</style>
