<template>
  <view class="container">
    <view class="card profile-card">
      <view class="profile-main">
        <view class="avatar">
          <text class="avatar-text">{{ (userStore.userInfo?.name || '?')[0] }}</text>
        </view>
        <view class="profile-copy">
          <text class="profile-name">{{ userStore.userInfo?.name || '未登录' }}</text>
          <text class="profile-meta">
            {{ roleLabel }} · {{ userStore.userInfo?.department || '未分配部门' }}
          </text>
        </view>
      </view>
      <text class="profile-code">USER</text>
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
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 36rpx 28rpx;
  border-top: 6rpx solid #087f8c;
}
.profile-main {
  display: flex;
  align-items: center;
}
.avatar {
  width: 100rpx;
  height: 100rpx;
  border-radius: 12rpx;
  background: #16343a;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 -8rpx 0 rgba(8, 127, 140, 0.55);
}
.avatar-text {
  color: #fff;
  font-size: 44rpx;
  font-weight: 700;
}
.profile-copy {
  display: flex;
  flex-direction: column;
  margin-left: 24rpx;
}
.profile-name {
  color: #172327;
  font-size: 34rpx;
  font-weight: 700;
}
.profile-meta {
  margin-top: 6rpx;
  color: #657174;
  font-size: 23rpx;
}
.profile-code {
  color: #cbd2d2;
  font-size: 18rpx;
  font-weight: 700;
}
.menu-section-title {
  font-size: 24rpx;
  color: #657174;
  font-weight: 700;
  margin-bottom: 4rpx;
}
.logout-btn {
  background: #fff;
  color: #c9483f;
  border: 2rpx solid #c9483f;
  border-radius: 8rpx;
  padding: 24rpx 0;
  font-size: 30rpx;
  text-align: center;
  min-height: 88rpx;
}
</style>
