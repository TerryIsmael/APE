<script setup>
import { ref, onMounted, onBeforeMount, onBeforeUnmount, defineProps, computed, defineComponent } from 'vue';
const props = defineProps({
            item: {
                type: Object,
                required: true
            }
        });

    const item = ref(null);
    const interval = ref(null);
    const timer = computed(() => {
        const hours = Math.floor( item.value?.remainingTime / 3600);
        const minutes = Math.floor(( item.value?.remainingTime % 3600) / 60);
        const seconds = ( item.value?.remainingTime % 3600) % 60;
        return `${String(hours).padStart(2, '0')} : ${String(minutes).padStart(2, '0')} : ${String(seconds).padStart(2, '0')}`;
    });

    const startTimer = (notify) => {
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

    onMounted(() => {
        item.value = props.item;
        if (item.value.active) {
            startTimer();
        }
    });

    onBeforeUnmount(() => {
        clearInterval(interval.value);
    });
</script>

<template>
    <div>
        <h1>Timer</h1>
         
        <p style="font-size: 10vw;"> {{ timer }}</p>
        <button @click="startTimer">Start</button>
        <button @click="stopTimer">Stop</button>
        <button @click="resetTimer">Reset</button>
    </div>
</template>