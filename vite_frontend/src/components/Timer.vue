<script setup>
import { ref, onMounted, onBeforeMount, onBeforeUnmount, computed, defineComponent, watch } from 'vue';
import { useRouter } from 'vue-router';

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
    },
    path: {
        type: String,
        required: true
    }
});

const router = useRouter();
const workspace = ref(props.workspace);
const ws = ref(props.ws);
const item = ref(props.item);
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
        const data = await response.json();
        if (data.error) {
            console.error('Error-> ', data.error)
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

const navigateToPreviousItem = () => {
    const pathArray = props.path.split('/');
    const newRoute = pathArray.slice(0,pathArray.indexOf('i')).join('/');
    router.push("/workspace"+(newRoute == ""?'/'+newRoute:''))
};


onMounted( async () => {
    if (item.value.active) {
        startTimer();
    }
    props.ws.addEventListener('message', async (event) => {
        const jsonEvent = JSON.parse(event.data);
        if (jsonEvent.type === 'timer' && jsonEvent.timer._id === item.value._id) {
            item.value = jsonEvent.timer;
        }
    });
});

onBeforeUnmount(() => {
    clearInterval(interval.value);
});

watch(() => props.ws, (newWs) => {
  if (newWs) {
    ws.value = newWs;
    ws.value.onmessage = async (event) => {
      const jsonEvent = JSON.parse(event.data);
      if (jsonEvent.type === 'timer' && jsonEvent.timer._id === item.value._id) {
        item.value = jsonEvent.timer;
      }
    };
  }
}, { immediate: true });
</script>

<template>
    <div>
        <button v-if="path !== ''" style=" max-height: 50px;" @click="navigateToPreviousItem()"><span class="material-symbols-outlined">arrow_back</span></button>
        <h1>Timer {{ item.name }}</h1>
        <p class="timer-text"> {{ timer }}</p>
        <div class="button-bar">
            <button @click="modifyTimer('init')"><span class="material-symbols-outlined" style="z-index: 1002">play_arrow</span></button>
            <button @click="modifyTimer('stop')"><span class="material-symbols-outlined" style="z-index: 1002">pause</span></button>
            <button @click="modifyTimer('reset')"><span class="material-symbols-outlined" style="z-index: 1002">sync</span></button>
        </div>
    </div>
</template>

<style scoped>
.timer-text {
    font-size: 8vw;
}
.button-bar {
    height: 20vh;
    display: flex;
    justify-content: center;
    align-items: center;
    margin-top: 1vh;
}
button {
    height: 10vh;
    width: 15vh;
    border: none;
    cursor: pointer;
    margin: 0 1vw;
    display: flex;
    justify-content: center;
    align-items: center;

}
</style>