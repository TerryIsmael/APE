<script setup>
import { ref, onMounted, onBeforeMount, onBeforeUnmount, defineProps, computed, defineComponent } from 'vue';
    const props = defineProps({
        item: {
            type: Object,
            required: true
        },
        workspace: {
            type: String,
            required: true
        },
        ws: {
            type: Object,
            required: true
        }
    });
    const workspace = ref(null);
    const ws = ref(null);
    const item = ref(null);
    const interval = ref(null);
    const timer = computed(() => {
        const hours = Math.floor( item.value?.remainingTime / 3600);
        const minutes = Math.floor(( item.value?.remainingTime % 3600) / 60);
        const seconds = ( item.value?.remainingTime % 3600) % 60;
        return `${String(hours).padStart(2, '0')} : ${String(minutes).padStart(2, '0')} : ${String(seconds).padStart(2, '0')}`;
    });

    const modifyTimer = async (action) => {
        try{
            const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/item/timer', {
                method: 'POST',
                credentials: "include",
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    timerId: item.value._id,
                    workspace: workspace.value,
                    action:action
                })
            });
            console.log('Response-> ', response)
            const data = await response.json();
            console.log('Data-> ', data.error)
            if (data.error) {
                console.log('Error-> ', data.error)
                throw new Error(data.error);
            }
        }catch(error){
            console.error(error);
        }
    }; 

    const startTimer = () => {
        item.value.isActive = true;
        if (!interval.value){
            interval.value = setInterval(() => {
            item.value.remainingTime--;
            if ( item.value.remainingTime <= 0) {
                clearInterval(interval.value);
                item.value.isActive = false;
            }
        }, 1000);
        }
       
    };
    
    const stopTimer = (notify) => {
        if (interval.value){
            clearInterval(interval.value);
            interval.value = null;
        }
        item.value.isActive = false;
    };

    const resetTimer = (notify) => {
        if (interval.value){
            clearInterval(interval.value);
            interval.value = null;
        }
        item.value.isActive = false;
        item.value.remainingTime = item.value.duration;
    };

    const setLocalTimer = async (action) => {
        if (!action){
            if (item.value.active) {
                startTimer();
            }else{
                stopTimer();
            }
        }else{
            if (action === 'init') {
            startTimer();
            } else if (action === 'stop') {
                stopTimer();
            } else if (action === 'reset') {
                resetTimer();
            }
        }
    };

    onMounted( async () => {
        item.value = props.item;
        workspace.value = props.workspace;
        ws.value = props.ws;
        if (item.value.active) {
            startTimer();
        }
        ws.value.onmessage = async (event) => {
            console.log('Event-> ', event)
            if (event.type === 'timer' && event.timer._id === item.value._id) {
                item.value = event.timer;
            }
            await setLocalTimer(event.action);
        };
        await setLocalTimer();
    });

    onBeforeUnmount(() => {
        clearInterval(interval.value);
    });
</script>

<template>
    <div>
        <h1>Timer</h1>
         
        <p style="font-size: 10vw;"> {{ timer }}</p>
        <button @click="modifyTimer('init')">Start</button>
        <button @click="modifyTimer('stop')">Stop</button>
        <button @click="modifyTimer('reset')">Reset</button>
    </div>
</template>