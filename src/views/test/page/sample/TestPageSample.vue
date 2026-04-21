<template>
  <div class="test-page-sample">
    <el-card shadow="never" class="test-page-sample__card">
      <template #header>
        <span>页面测试示例</span>
      </template>

      <p>该页面位于 views/test/page 目录，用于与 table 测试目录隔离。</p>
    </el-card>
  </div>
</template>

<script setup lang="ts">
// 组件说明：TestPageSample 组件，负责当前页面的结构与交互。
</script>

<style scoped>
.test-page-sample {
  padding: 12px;
}

.test-page-sample__card {
  max-width: 680px;
}
</style>
