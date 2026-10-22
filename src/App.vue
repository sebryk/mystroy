<script setup lang="ts">
import { onMounted } from 'vue';
import TreeTable from './components/TreeTable.vue';
import { useTreeItems } from './composables/useTreeItems';

const { rows, loading, error, load } = useTreeItems();

onMounted(() => {
   void load();
});
</script>

<template>
   <main class="page-shell">
      <p v-if="error" class="load-error" role="alert">{{ error }}</p>
      <TreeTable v-else :rows="rows" :loading="loading" />
   </main>
</template>

<style scoped>
.page-shell {
   height: 100vh;
   min-height: 100vh;
   box-sizing: border-box;
   padding: 33px 22px 24px 20px;
}

.load-error {
   margin: 0;
   color: #494949;
   font-size: 18px;
}
</style>
