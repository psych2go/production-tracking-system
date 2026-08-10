<template>
  <view
    class="uicon"
    :class="`uicon-${variant}`"
    :style="containerStyle"
  >
    <text class="uicon-symbol" :style="symbolStyle">{{ symbol }}</text>
  </view>
</template>

<script setup lang="ts">
import { computed } from "vue";

type Variant =
  | "plain" | "soft" | "soft-success" | "soft-warning" | "soft-danger"
  | "primary" | "success" | "warning" | "danger";

const props = withDefaults(defineProps<{
  name: string;
  size?: number;
  variant?: Variant;
  color?: string;
}>(), {
  size: 44,
  variant: "plain",
});

// 单色 Unicode 符号映射（H5 + 小程序双端兼容，零依赖）
const SYMBOLS: Record<string, string> = {
  plus: "+",
  check: "✓",
  close: "✕",
  "arrow-right": "→",
  "arrow-left": "←",
  back: "‹",
  "chevron-right": "›",
  "chevron-down": "⌄",
  menu: "☰",
  edit: "✎",
  warning: "!",
};

const symbol = computed(() => SYMBOLS[props.name] ?? props.name);

const SOLID: Variant[] = ["primary", "success", "warning", "danger"];
const SOFT_COLOR: Record<string, string> = {
  soft: "#087f8c",
  "soft-success": "#27865f",
  "soft-warning": "#d97706",
  "soft-danger": "#c9483f",
};

const containerStyle = computed(() => ({
  width: `${props.size}rpx`,
  height: `${props.size}rpx`,
}));

const symbolStyle = computed(() => {
  const fontSize = Math.round(props.size * 0.56);
  let color = "#087f8c";
  let weight = 600;
  if (props.color) {
    color = props.color;
  } else if (SOLID.includes(props.variant)) {
    color = "#ffffff";
    weight = 700;
  } else if (props.variant in SOFT_COLOR) {
    color = SOFT_COLOR[props.variant];
    weight = 700;
  }
  return { fontSize: `${fontSize}rpx`, color, fontWeight: weight };
});
</script>

<style scoped lang="scss">
.uicon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 12rpx;
  flex-shrink: 0;
}
.uicon-symbol { line-height: 1; text-align: center; }
.uicon-plain { background: transparent; }
.uicon-soft { background: #e6f4f3; border-radius: 10rpx; }
.uicon-soft-success { background: #e6f3ec; border-radius: 10rpx; }
.uicon-soft-warning { background: #fff3df; border-radius: 10rpx; }
.uicon-soft-danger { background: #fcecea; border-radius: 10rpx; }
.uicon-primary { background: #087f8c; }
.uicon-success { background: #27865f; }
.uicon-warning { background: #d97706; }
.uicon-danger { background: #c9483f; }
</style>
