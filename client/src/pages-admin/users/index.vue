<template>
  <view class="container">
    <view class="card">
      <text class="section-title text-bold">用户管理</text>

      <!-- Search -->
      <view class="search-bar mt-md">
        <input v-model="keyword" placeholder="搜索姓名/部门" class="form-input" @confirm="loadUsers" />
        <picker :range="filterOptions" :range-key="'label'" @change="onRoleFilter">
          <view class="form-input picker-input">
            {{ roleFilter ? roleLabels[roleFilter] : '全部角色' }}
          </view>
        </picker>
      </view>

      <!-- User list -->
      <view v-for="user in users" :key="user.id" class="user-item">
        <view class="user-avatar">{{ user.name.charAt(0) }}</view>
        <view class="user-info">
          <view class="flex-between">
            <text class="text-bold">{{ user.name }}</text>
            <text :class="['role-tag', `role-${user.role}`]">{{ roleLabels[user.role] }}</text>
          </view>
          <view class="flex-between mt-sm">
            <text class="text-secondary text-sm">{{ user.department || '未分配部门' }}</text>
            <view class="actions">
              <text class="action-link" @click="openEdit(user)">编辑</text>
              <text :class="['action-link', user.isActive ? 'text-danger' : 'text-success']" @click="toggleActive(user)">
                {{ user.isActive ? '停用' : '启用' }}
              </text>
            </view>
          </view>
        </view>
      </view>

      <view v-if="users.length === 0" class="empty-state">
        <text class="text-secondary">暂无用户数据</text>
      </view>
    </view>

    <!-- Edit modal -->
    <view v-if="showEdit" class="modal-mask" @click="showEdit = false">
      <view class="modal-content" @click.stop>
        <text class="text-bold text-lg">编辑用户</text>
        <view class="mt-md">
          <text class="text-secondary">角色</text>
          <picker :range="roleOptions" :range-key="'label'" :value="editRoleIndex" @change="onEditRole" class="mt-sm">
            <view class="form-input picker-input">{{ roleOptions[editRoleIndex]?.label }}</view>
          </picker>
        </view>
        <view class="mt-md">
          <text class="text-secondary">部门</text>
          <input v-model="editDepartment" placeholder="输入部门" class="form-input mt-sm" />
        </view>
        <view class="flex-between mt-lg">
          <button class="btn-sm" @click="showEdit = false">取消</button>
          <button class="btn-sm btn-primary" @click="saveEdit">保存</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { userApi } from "../../api/modules";
import { ROLE_LABELS } from "../../utils/constants";
import type { User } from "../../types";

const users = ref<User[]>([]);
const keyword = ref("");
const roleFilter = ref("");
const showEdit = ref(false);
const editingUser = ref<User | null>(null);
const editRoleIndex = ref(1);
const editDepartment = ref("");

const roleOptions = [
  { label: "管理员", value: "admin" },
  { label: "作业员", value: "worker" },
];

const filterOptions = [
  { label: "全部角色", value: "" },
  ...roleOptions,
];

const roleLabels = ROLE_LABELS;

async function loadUsers() {
  try {
    const res = await userApi.list({
      keyword: keyword.value || undefined,
      role: roleFilter.value || undefined,
    });
    users.value = res.items;
  } catch (e: unknown) {
    uni.showToast({ title: (e as Error).message, icon: "none" });
  }
}

function onRoleFilter(e: { detail: { value: number } }) {
  const idx = e.detail.value;
  roleFilter.value = idx === 0 ? "" : filterOptions[idx]?.value || "";
  loadUsers();
}

function openEdit(user: User) {
  editingUser.value = user;
  editDepartment.value = user.department || "";
  editRoleIndex.value = roleOptions.findIndex((r) => r.value === user.role);
  if (editRoleIndex.value < 0) editRoleIndex.value = 1;
  showEdit.value = true;
}

function onEditRole(e: { detail: { value: number } }) {
  editRoleIndex.value = e.detail.value;
}

async function saveEdit() {
  if (!editingUser.value) return;
  try {
    await userApi.update(editingUser.value.id, {
      role: roleOptions[editRoleIndex.value].value,
      department: editDepartment.value || undefined,
    });
    showEdit.value = false;
    await loadUsers();
    uni.showToast({ title: "更新成功", icon: "success" });
  } catch (e: unknown) {
    uni.showToast({ title: (e as Error).message, icon: "none" });
  }
}

async function toggleActive(user: User) {
  const action = user.isActive ? "停用" : "启用";
  try {
    await userApi.update(user.id, { isActive: !user.isActive });
    await loadUsers();
    uni.showToast({ title: `已${action}`, icon: "success" });
  } catch (e: unknown) {
    uni.showToast({ title: (e as Error).message, icon: "none" });
  }
}

onMounted(loadUsers);
</script>

<style scoped lang="scss">
.section-title { font-size: 32rpx; }
.search-bar { display: flex; gap: 16rpx; }
.form-input {
  border: 2rpx solid #e5e5e5;
  border-radius: 8rpx;
  padding: 16rpx 20rpx;
  font-size: 28rpx;
}
.picker-input { color: #333; flex: 1; }
.user-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
  &:last-child { border-bottom: none; }
}
.user-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: #0083ff;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  flex-shrink: 0;
}
.user-info { flex: 1; }
.role-tag {
  font-size: 22rpx;
  padding: 4rpx 16rpx;
  border-radius: 6rpx;
}
.role-admin { background: #fff2e8; color: #fa5151; }
.role-worker { background: #f0f0f0; color: #666; }
.actions { display: flex; gap: 24rpx; }
.action-link { font-size: 26rpx; color: #0083ff; }
.text-danger { color: #fa5151; }
.text-success { color: #07c160; }
.empty-state { text-align: center; padding: 60rpx 0; }
.btn-sm {
  font-size: 26rpx;
  padding: 8rpx 24rpx;
  background: #f5f5f5;
  border: none;
  border-radius: 8rpx;
}
.btn-primary { background: #0083ff; color: #fff; }
.modal-mask {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}
.modal-content {
  width: 600rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 40rpx;
}
</style>
