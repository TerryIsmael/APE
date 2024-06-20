<script setup>
import { onBeforeMount, onMounted, ref } from 'vue';
import Utils from './utils/UtilsFunctions.js';
const ws = ref(null);
const wsReconnect = ref(null);

const connectWs = () => {
  ws.value = new WebSocket('ws://localhost:3000');

  ws.value.onopen = async () => {
    console.log('Connected to server');
    wsReconnect?wsReconnect.value = null:null;
    const workspace = localStorage.getItem('workspace');
    const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/user', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: "include",
      });
      if(response.ok){
        const data = await response.json();
        ws.value.send(JSON.stringify({ type: 'workspaceIdentification', userId: data.user?._id, workspaceId: workspace}));
      }
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