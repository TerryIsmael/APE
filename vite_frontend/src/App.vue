<script setup>
import { onBeforeMount, onMounted, ref } from 'vue';

const ws = ref(null);
const wsReconnect = ref(null);

const connectWs = () => {
  ws.value = new WebSocket('ws://localhost:3000');

  ws.value.onopen = () => {
    console.log('Connected to server');
    ws.value.send(JSON.stringify({ type: 'workspaceIdentification', workspaceId: localStorage.getItem('workspace') }));
    wsReconnect?clearInterval(wsReconnect.value):null;
    wsReconnect?wsReconnect.value = null:null;
  };

  ws.value.onclose = () => {
    console.log('Disconnected from server');
    wsReconnect?wsReconnect.value = setInterval(() => {
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
