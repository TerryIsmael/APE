<script setup>
import { onBeforeMount, onMounted, ref } from 'vue';
import Utils from './utils/utilsFunctions.js';
const ws = ref(null);
const wsReconnect = ref(null);

const connectWs = () => {
  ws.value = new WebSocket('ws://localhost:3000');

  ws.value.onopen = () => {
    console.log('Connected to server');
    wsReconnect?wsReconnect.value = null:null;
  };

  ws.value.onclose = () => {
    console.log('Disconnected from server');
    wsReconnect?wsReconnect.value = setTimeout(() => {
      console.log('Attempting to reconnect...');
      connectWs();
    }, 3000):null;
  };

  ws.value.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
};
onBeforeMount(() => {
  connectWs();
}); 

</script>

<template>
  <router-view :ws="ws"></router-view>
</template>
./utils/UtilsFunctions.js