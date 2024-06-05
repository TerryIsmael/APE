<script setup>
import { onMounted, ref } from 'vue';

const ws = ref(null);

onMounted(() => {
  ws.value = new WebSocket('ws://localhost:3000');

  ws.value.onopen = () => {
    console.log('Connected to server');
  };

  ws.value.onclose = () => {
    console.log('Disconnected from server');
    setTimeout(() => {
      console.log('Attempting to reconnect...');
      ws.value = new WebSocket('ws://localhost:3000');
    }, 3000);

  };

  ws.value.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

});
</script>

<template>
  <router-view :ws="ws"></router-view>
</template>
