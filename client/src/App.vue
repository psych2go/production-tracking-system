<script setup lang="ts">
import { onLaunch } from "@dcloudio/uni-app";
import { useUserStore } from "./store/user";

onLaunch(() => {
  const userStore = useUserStore();
  userStore.checkAuth();
});
</script>

<style>
@import "./styles/global.scss";
</style>
