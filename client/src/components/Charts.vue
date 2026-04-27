<template>
  <view class="chart-container">
    <canvas :canvas-id="canvasId" :id="canvasId" :style="{ width: width + 'px', height: height + 'px' }" />
  </view>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from "vue";
import uCharts from "@qiun/ucharts";

const props = withDefaults(defineProps<{
  type: "bar" | "line" | "pie";
  chartData: { categories: string[]; series: Array<{ name: string; data: number[] }> };
  height?: number;
}>(), {
  height: 500,
});

let chartIdCounter = 0;
const canvasId = ref(`chart_${Date.now()}_${++chartIdCounter}`);
const width = ref(375);
let chart: InstanceType<typeof uCharts> | null = null;

function initChart() {
  const sysInfo = uni.getSystemInfoSync();
  width.value = sysInfo.windowWidth - 40;

  chart = new uCharts({
    type: props.type,
    context: uni.createCanvasContext(canvasId.value),
    width: width.value,
    height: props.height,
    categories: props.chartData.categories,
    series: props.chartData.series,
    animation: true,
    padding: [30, 30, 10, 40],
    enableScroll: false,
    legend: {
      show: props.chartData.series.length > 1,
      position: "bottom",
    },
    xAxis: {
      disableGrid: true,
      labelCount: Math.min(props.chartData.categories.length, 8),
      rotateLabel: props.chartData.categories.length > 6,
    },
    yAxis: {
      gridType: "dash",
      splitNumber: 5,
    },
    dataLabel: true,
    dataPointShape: true,
    extra: {
      bar: { type: "group", width: 20, meterBorde: 1, meterColor: "#0083ff" },
      line: { type: "straight", width: 2 },
      pie: { activeOpacity: 0.5, activeRadius: 10, offsetAngle: 0, labelWidth: 15, ringWidth: 0, border: true, borderWidth: 2, borderColor: "#ffffff" },
    },
  });
}

onMounted(() => {
  setTimeout(initChart, 100);
});

onBeforeUnmount(() => {
  if (chart) {
    chart.stopAnimation();
    chart = null;
  }
});

watch(() => props.chartData, () => {
  if (chart) {
    chart.updateData({
      categories: props.chartData.categories,
      series: props.chartData.series,
    });
  }
}, { deep: true });
</script>

<style scoped lang="scss">
.chart-container {
  width: 100%;
  display: flex;
  justify-content: center;
}
</style>
