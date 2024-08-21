<script setup>
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import WorkspaceUtils from '../utils/WorkspaceFunctions.js';

const props = defineProps({
    item: {
        type: Object,
        required: true
    },
    workspace: {
        type: Object,
        required: true
    },
    ws: {
        type: Object,
        required: true
    },
    path: {
        type: String,
        required: true
    },
    currentUser: {
        type: Object,
        required: true
    }
});

const router = useRouter();
const errorMessage = ref([]);
const workspace = ref(props.workspace);
const ws = ref(props.ws);
const item = ref(props.item);
const currentUser = ref(props.currentUser);
const interval = ref(null);
const routedItemPerm = ref(null);
const isEditModalOpened = ref(false);
const newTime = ref({});
const timer = computed(() => {
    const hours = Math.floor( item.value?.remainingTime / 3600);
    const minutes = Math.floor(( item.value?.remainingTime % 3600) / 60);
    const seconds = ( item.value?.remainingTime % 3600) % 60;
    return `${String(hours).padStart(2, '0')} : ${String(minutes).padStart(2, '0')} : ${String(seconds).padStart(2, '0')}`;
});

const closeEditModal = () => {
    isEditModalOpened.value = false;
    newTime.value = {};
    errorMessage.value = [];
};

const openEditModal = () => {
    isEditModalOpened.value = true;
    newTime.value = {
        hours: Math.floor(item.value.duration / 3600),
        minutes: Math.floor((item.value.duration % 3600) / 60),
        seconds: (item.value.duration % 3600) % 60
    };
    errorMessage.value = [];
};

const navigateToPreviousFolder = () => {
  WorkspaceUtils.navigateToPreviousFolder(ref(props.path), router);
};

const modifyTimer = async (action) => {
    if (action === 'init' && item.value.active || action == 'stop' && !item.value.active) {
       return;
    }
    let duration = 0;
    if (action === 'edit') {
        duration = newTime.value.hours * 3600 + newTime.value.minutes * 60 + newTime.value.seconds;
    }

    try {
        const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/item/timer', {
            method: 'POST',
            credentials: "include",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                timerId: item.value._id,
                workspace: workspace.value._id,
                action:action,
                duration: action === 'edit' ? duration : null
            })
        });
        if (response.ok){
            closeEditModal();
        } else {
            const data = await response.json();
            if (data.error.includes('No estás autenticado')) {
                router.push('/login');
            } else {
                if (data.timer){
                    item.value = data.timer;
                }
                errorMessage.value.push(data.error);
            }
        }
        
    } catch(error) {
        console.error(error);
    }
};

const navigateToPreviousItem = () => {
    const pathArray = props.path.split('/');
    const newRoute = pathArray.slice(0,pathArray.indexOf('i')).join('/');
    router.push("/workspace"+(newRoute == ""?'/'+newRoute:''))
};

onMounted( async () => {
    props.ws.addEventListener('message', async (event) => {
        const jsonEvent = JSON.parse(event.data);
        if (jsonEvent.type === 'timer' && jsonEvent.timer._id === item.value._id) {
            item.value.remainingTime = jsonEvent.timer.remainingTime;
            item.value.active = jsonEvent.timer.active;
            item.value.duration = jsonEvent.timer.duration;
        }
    });

    routedItemPerm.value = WorkspaceUtils.verifyPerms(item.value, workspace, currentUser);
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

watch(() => props.workspace, (newWorkspace) => {
  workspace.value = newWorkspace;
  item.value = workspace.value.items.find(it => it._id === item.value._id);
  if (!item.value || item.value == 'Not found'){
    routedItemPerm.value = "None";
    return;
  }
  routedItemPerm.value = WorkspaceUtils.verifyPerms(item.value, workspace, currentUser);
}, { immediate: true });
</script>

<template>
    <div v-if="item">
        <div>
            <button v-if="path !== ''" style=" max-height: 50px;" @click="navigateToPreviousItem()"><span class="material-symbols-outlined">arrow_back</span></button>
            <div class="title">
                <div style="display:flex; justify-content: start;  width: 10vw;">
                    <button @click="navigateToPreviousFolder()"><span class="material-symbols-outlined">arrow_back</span></button>
                </div>
                <div style="display: flex; justify-content: center; align-items: center; word-wrap: break-word; line-break: anywhere; justify-self: start;">
                    <h1 @click="$router.push('/workspace/')" style="cursor: pointer; display: flex; align-items: center; margin-right: 10px;">
                        <span style="color: #C8B1E4; font-size: 60px;" class="material-symbols-outlined">home</span>
                        <span class="item-name-title" style="padding-bottom:10px">{{ item.name }} </span>
                    </h1>
                </div>
                <button style="width: 5%; margin-left: 3%;" @click="openEditModal()" v-if="routedItemPerm && routedItemPerm !== 'Read'"><span class="material-symbols-outlined">edit</span></button>
                <div style="width: 5%; margin-left: 3%;" v-else></div>
            </div>
            <p class="timer-text"> {{ timer }}</p>
            <div class="button-bar" v-if="routedItemPerm && routedItemPerm !== 'Read'">
                <button @click="modifyTimer('init')"><span class="material-symbols-outlined">play_arrow</span></button>
                <button @click="modifyTimer('stop')"><span class="material-symbols-outlined">pause</span></button>
                <button @click="modifyTimer('reset')"><span class="material-symbols-outlined">sync</span></button>
            </div>
            
        </div>
        <div class="error" v-if="errorMessage.length !== 0" style="display: flex; justify-content: space-between; padding-left: 2%;">
            <div>
            <p v-for="error in errorMessage" :key="error" style="margin-top: 5px; margin-bottom: 5px; text-align: center; position: relative;">
                {{ error }}
            </p>
            </div>
            <button @click="errorMessage=[]" style="display: flex; align-items: top; background: none; border: none; cursor: pointer; color: #f2f2f2; outline: none;">
            <span style="font-size: 20px; "class="material-symbols-outlined">close</span>
            </button>
        </div>
    </div>
    <div v-else>
      <div class="main-content" style="display: flex; justify-content: center; align-items: center; word-wrap: break-word;">
        <h1 @click="$router.push('/workspace/')" style="cursor: pointer; display: flex; align-items: center; margin-right: 10px">
          <span style="color: #C8B1E4; font-size: 60px;" class="material-symbols-outlined">home</span>
          {{ workspace?.name }}
        </h1>
      </div>
      <h2>No se encuentra el item. Puede que haya sido movido o eliminado, o que se te hayan revocado los permisos.</h2>
    </div>

    <!-- Modal de edit timer -->
    <Modal class="modal" :isOpen="isEditModalOpened" @modal-close="closeEditModal" name="edit-item-modal">
    <template #header><strong>Modificar duración</strong></template>
    <template #content>
        <div class="error" v-if="errorMessage.length !== 0" style="padding-left: 5%; padding-right: 5%; margin-top: 10px;">
            <p style="margin-top: 5px; margin-bottom: 5px; text-align: center" v-for="error in errorMessage">{{ error }}</p>
        </div>

        <div style="margin-top: 20px">
            <div style="display: inline-flex; vertical-align: middle; align-items: center; justify-content: center;">
                <input v-model="newTime.hours" type="number" min="0" placeholder="Hor" class="timer-input" style="border-top-left-radius: 5px; border-bottom-left-radius: 5px;" />
                :<input v-model="newTime.minutes" type="number" min="0" placeholder="Min" class="timer-input" />
                :<input v-model="newTime.seconds" type="number" min="0" placeholder="Seg" class="timer-input"style="border-top-right-radius: 5px; border-bottom-right-radius: 5px;" />
            </div>
        </div>
        <button @click="modifyTimer('edit')" style="margin-top: 15px">Actualizar</button>
        <button @click="closeEditModal()" style="margin-left: 5px; margin-top: 15px" class="red-button">Cancelar</button>
    </template>
  </Modal>
</template>

<style scoped>
.title {
    display: flex;
    justify-content: space-around;
    align-items: center;
    margin-top: 2vh;
    margin-bottom: 2vh;
}

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
.button-bar button {
    height: 10vh;
    width: 15vh;
    border: none;
    cursor: pointer;
    margin: 0 1vw;
    display: flex;
    justify-content: center;
    align-items: center;
}

.error {
  grid-column: 1 / -1;
  display: flex;
  text-align: center;
  justify-content: center;
  align-items: center;
  width: fit-content; 
  max-width: 80%; 
  height: auto;
  background-color: rgb(151, 47, 47);
  border-radius: 10px;
  padding-left: 1%; 
  padding-right: 1%;
  padding: 1px 10px;
  margin-bottom: 10px;
  margin-left: auto;
  margin-right: auto;
  overflow-wrap: break-word;
}

.item-name-title {
    display: -webkit-box;
    -webkit-line-clamp: 1;
    line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
    padding-bottom:10px;
}

.timer-input {
  margin-top: 5px;
  margin-right: 5px;
  height: 30px;
  width: 60px;
  width: 20%;
  background-color: #f2f2f2;
  color: black;
}

.red-button {
  background-color: #c55e5e; 
}
</style>