<template>
  <view class="container">
    <view class="card profile-card">
      <view class="avatar">
        <text class="avatar-text">{{ (userStore.userInfo?.name || '?')[0] }}</text>
      </view>
      <text class="text-lg text-bold mt-md">{{ userStore.userInfo?.name || '未登录' }}</text>
      <text class="text-secondary text-sm mt-sm">
        {{ roleLabel }} · {{ userStore.userInfo?.department || '未分配部门' }}
      </text>
    </view>

    <view class="card" v-if="userStore.isLoggedIn">
      <text class="menu-section-title">常用功能</text>
      <view class="list-item" @click="go('/pages/progress/history')">
        <text>我的录入记录</text>
        <UIcon name="chevron-right" :size="28" color="#c0c4cc" />
      </view>
    </view>

    <view class="card" v-if="userStore.isAdmin()">
      <text class="menu-section-title">系统管理</text>
      <view class="list-item" @click="go('/pages-admin/settings/index')">
        <text>工序管理</text>
        <UIcon name="chevron-right" :size="28" color="#c0c4cc" />
      </view>
      <view class="list-item" @click="go('/pages-admin/package-types/index')">
        <text>封装形式管理</text>
        <UIcon name="chevron-right" :size="28" color="#c0c4cc" />
      </view>
      <view class="list-item" @click="go('/pages-admin/customer-codes/index')">
        <text>客户代码管理</text>
        <UIcon name="chevron-right" :size="28" color="#c0c4cc" />
      </view>
      <view class="list-item" @click="go('/pages-admin/users/index')">
        <text>用户管理</text>
        <UIcon name="chevron-right" :size="28" color="#c0c4cc" />
      </view>
      <view class="list-item" @click="go('/pages-admin/audit/index')">
        <text>审计日志</text>
        <UIcon name="chevron-right" :size="28" color="#c0c4cc" />
      </view>
    </view>

    <button class="logout-btn mt-lg" v-if="userStore.isLoggedIn" @click="handleLogout">退出登录</button>
  </view>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useUserStore } from "../../store/user";
import { ROLE_LABELS } from "../../utils/constants";
import UIcon from "../../components/UIcon.vue";

const userStore = useUserStore();

const roleLabel = computed(() => ROLE_LABELS[userStore.userInfo?.role ?? ""] || userStore.userInfo?.role || "");

function go(url: string) {
  uni.navigateTo({ url });
}

function handleLogout() {
  userStore.logout();
  uni.reLaunch({ url: "/pages/index/index" });
}
</script>

<style scoped lang="scss">
.profile-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 56rpx 24rpx;
}
.avatar {
  width: 128rpx;
  height: 128rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #0083ff 0%, #006fd6 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 20rpx rgba(0, 131, 255, 0.25);
}
.avatar-text {
  color: #fff;
  font-size: 52rpx;
  font-weight: 600;
}
.menu-section-title {
  font-size: 24rpx;
  color: #8a8f99;
  margin-bottom: 4rpx;
}
.logout-btn {
  background: #fff;
  color: #fa5151;
  border: 2rpx solid #fa5151;
  border-radius: 12rpx;
  padding: 24rpx 0;
  font-size: 30rpx;
  text-align: center;
  min-height: 88rpx;
}
</style>
