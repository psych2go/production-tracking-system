<template>
  <view class="container">
    <view class="card profile-card">
      <view class="avatar">
        <text class="avatar-text">{{ (userStore.userInfo?.name || '?')[0] }}</text>
      </view>
      <text class="text-lg text-bold mt-md">{{ userStore.userInfo?.name || '未登录' }}</text>
      <text class="text-secondary text-sm mt-sm">
        {{ roleLabel }} · {{ userStore.userInfo?.department || '' }}
      </text>
    </view>

    <view class="card mt-md" v-if="userStore.isLoggedIn">
      <text class="menu-section-title">常用功能</text>
      <view class="menu-item" @click="go('/pages/progress/history')">
        <text>我的录入记录</text>
        <text class="text-secondary">></text>
      </view>
      <view class="menu-item" @click="go('/pages/stats/index')" v-if="userStore.isAdmin()">
        <text>统计分析</text>
        <text class="text-secondary">></text>
      </view>
    </view>

    <view class="card mt-md" v-if="userStore.isAdmin()">
      <text class="menu-section-title">系统管理</text>
      <view class="menu-item" @click="go('/pages-admin/products/index')">
        <text>产品管理</text>
        <text class="text-secondary">></text>
      </view>
      <view class="menu-item" @click="go('/pages-admin/users/index')">
        <text>用户管理</text>
        <text class="text-secondary">></text>
      </view>
      <view class="menu-item" @click="go('/pages-admin/settings/index')">
        <text>系统设置</text>
        <text class="text-secondary">></text>
      </view>
      <view class="menu-item" @click="go('/pages-admin/audit/index')">
        <text>审计日志</text>
        <text class="text-secondary">></text>
      </view>
    </view>

    <button class="logout-btn mt-lg" v-if="userStore.isLoggedIn" @click="handleLogout">退出登录</button>
  </view>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useUserStore } from "../../store/user";

const userStore = useUserStore();

const roleLabel = computed(() => {
  const labels: Record<string, string> = { admin: "管理员", supervisor: "主管", worker: "操作员" };
  return labels[userStore.userInfo?.role ?? ""] || userStore.userInfo?.role || "";
});

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
  padding: 48rpx 24rpx;
}
.avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: #0083ff;
  display: flex;
  align-items: center;
  justify-content: center;
}
.avatar-text {
  color: #fff;
  font-size: 48rpx;
  font-weight: 600;
}
.menu-section-title {
  font-size: 24rpx;
  color: #999;
  margin-bottom: 12rpx;
}
.menu-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 28rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
  &:last-child { border-bottom: none; }
}
.logout-btn {
  background: #fff;
  color: #fa5151;
  border: 2rpx solid #fa5151;
  border-radius: 12rpx;
  padding: 20rpx 0;
  font-size: 30rpx;
  text-align: center;
}
</style>
