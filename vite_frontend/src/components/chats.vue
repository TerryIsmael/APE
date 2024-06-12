<script setup>
import { ref, onBeforeMount, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router';
import Utils from '../utils/UtilsFunctions.js';

const props = defineProps({
  ws: {
    ws: Object,
    required: true
  },
});

const loading = ref(true);
const currentUser = ref(null);
const ws = ref(null);
const router = useRouter();
const route = useRoute();
const path = ref('');
const showMainSidebar = ref(false);
const isNewItemModalOpened = ref(false);
const folders = ref([]);
const selectedFolder = ref('chats');
const userWsPerms = ref('');
const workspace = ref(null);

const messages = ref([]);
const message = ref('');
const chats = ref([]);
const selectedChat = ref(null);
const errorMessage = ref([]);

const fetchUser = async () => {
  await Utils.fetchUser(currentUser, router);
}

const closeNewItemModal = () => {
  WorkspaceUtils.closeNewItemModal(isNewItemModalOpened, newItem, errorMessage, ref(), ref(), ref());
};

const initSelectedChat = () => {
    const chatId = route.params.chatId;
    console.log(chatId);
    const chat = chats.value.find(chat => chat._id === chatId);
    if (chat) {
    selectedChat.value = chat;
    }
};

const websocketEventAdd = () => {
  props.ws.addEventListener('open', async (event) => {
    console.log('Connected to server');
    ws.value.send(JSON.stringify({ type: 'workspaceIdentification', userId: currentUser.value?._id, workspaceId: workspace.value?._id }));
  });
  props.ws.addEventListener('message', async (event) => {
    const jsonEvent = JSON.parse(event.data);
    if (jsonEvent.type === 'messageAddedToChat') {
        await fetchChats();
        initPath();
    }
  });
}

onBeforeMount(async () => {
  ws.value = props.ws;
  console.log(route.params.chatId);
  await fetch(import.meta.env.VITE_BACKEND_URL + '/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: "include",
    body: JSON.stringify({
      username: import.meta.env.VITE_USERNAME,
      password: "12345678910aA@",
    })
  });
  await fetchUser();
  await fetchChats();
  initselectedChat();
  ws.value.send(JSON.stringify({ type: 'workspaceIdentification', userId: currentUser.value?._id, workspaceId: workspace.value._id }));
  websocketEventAdd();
});

onUnmounted(() => {
    ws.value.removeEventListener('open', websocketEventAdd);
});

</script>

<template>

    <div v-if="loading">
        <img :src="'/loading.gif'" alt="item.name" width="100" height="100"/>
    </div>
    <div v-else>
        <div :class="{ 'main-sidebar-toggle': true, 'main-sidebar-toggle-opened': showMainSidebar }">
            <span v-if="!showMainSidebar" @click="showMainSidebar = true" class="material-symbols-outlined" style="z-index: 1002">chevron_right</span>
            <span v-else @click="showMainSidebar = false" class="material-symbols-outlined" style="z-index: 1002">chevron_left</span>
        </div>
    </div>


    <!-- Main sidebar -->
    <div class="main-sidebar" :class="{ 'show': showMainSidebar }">

        <div :class="{ 'main-sidebar-toggle': true, 'main-sidebar-toggle-opened': showMainSidebar }">
        <span v-if="!showMainSidebar" @click="showMainSidebar = true" class="material-symbols-outlined" style="z-index: 1002">chevron_right</span>
        <span v-else @click="showMainSidebar = false" class="material-symbols-outlined" style="z-index: 1002">chevron_left</span>
        </div>

        <ul style="height: 85%; min-height: 85%;">
        <div style="display:flex; width: 50px; height: 50px;">
            <div style="margin-left: 35%"><img class="logo-img" src="https://i.pinimg.com/564x/27/bb/89/27bb898786b2fe976f67c318b91a5d2d.jpg"></img></div>
            <div style="margin-left: 65%; display:flex; align-items: center; justify-content: space-between; width: calc(100% - 40px);">
            <div style="text-align: center;">
                <p style="margin: 0; font-weight: bold;">APE</p>
                <p style="margin: 0;">{{ currentUser?.username }}</p>
            </div>
            </div>
        </div>

        <li @click="$router.push('/workspace/')" style="font-weight: bolder; text-align: left; margin-left: 5%; margin-right: 5%; margin-bottom: 1%; margin-top: 3%; word-wrap: break-word; display: flex; align-items: center; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; cursor: pointer;">
            <span style="vertical-align: middle; margin-right: 8px;" class="material-symbols-outlined">home</span>
            <p style=" margin: 0%; padding: 0%; word-wrap: break-word; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;"> {{ workspace?.name }} </p>
        </li>

        <button class="change-workspace-button" @click="openWsModal()">Cambiar</button>
        <li class="main-sidebar-title">Inicio</li>
        <li class="li-clickable">Gestionar perfil</li>

        <li class="main-sidebar-subtitle">Workspace actual
            <span v-if="['Owner', 'Admin'].includes(userWsPerms)" @click="selectItem('wsDetails', true)" style="position: absolute; right: 12%; text-align: right; cursor: pointer; vertical-align: middle;" class="material-symbols-outlined">tune</span>
            <span v-if="['Owner', 'Admin', 'Write'].includes(userWsPerms)" @click="openNewItemModal('Folder')" style="position: absolute; right: 21%; text-align: right; cursor: pointer; vertical-align: middle" class="material-symbols-outlined">add</span>
        </li>

        <li @click="selectItem('notices', true)" :class="{ 'li-clickable': true, 'selected-folder': selectedFolder == 'notices' }">Anuncios</li>
        <li @click="selectItem('favorites', true)" :class="{ 'li-clickable': true, 'selected-folder': selectedFolder == 'favorites' }">Favoritos</li>

        <div class="scrollable" style="max-height: 35%; overflow-y: auto;">
            <div v-for="folder in folders" :key="folder._id" style="word-wrap: break-word;">
            <li @click="selectItem(folder, true)" :class="{ 'li-clickable': true, 'selected-folder': selectedFolder === folder.name }"> {{ folder.name}} </li>
            </div>
        </div>

        </ul>
        <ul style="height: 5%;">
        <li style="text-align: right;"> <button style="margin-right: 5%;" @click="logout">
            <span class="material-symbols-outlined">logout</span></button> 
        </li>
        </ul>
    </div>

    <!-- Modal de nuevo item --> 
    <Modal class="modal" :isOpen="isNewItemModalOpened" @modal-close="closeNewItemModal" name="item-modal">
        <template #header><strong>Crear {{ translateItemType(newItem.itemType) }}</strong></template>
        <template #content>
            <div class="error" v-if="errorMessage.length !== 0" style="padding-left: 5%; padding-right: 5%; margin-top: 10px;">
                <p style="margin-top: 5px; margin-bottom: 5px; text-align: center" v-for="error in errorMessage">{{ error }}</p>
            </div>

            <div style="margin-top: 20px">              
                <input type="text" v-model="newItem.name" placeholder="Nombre de item..." class="text-input" style="margin-bottom: 5px;"/>
                <textarea v-if="newItem.itemType == 'Note'" v-model="newItem.text" placeholder="Contenido..." class="text-input textarea-input"></textarea>
                <textarea v-if="newItem.itemType == 'Notice'" v-model="newItem.text" placeholder="Contenido..." maxlength="1000" class="text-input textarea-input"></textarea>
                <div v-if="newItem.itemType == 'Notice'" style="display: flex; justify-content: center; align-items: center;">
                    Prioritario: <input type="checkbox" v-model="newItem.important" style="border-radius: 5px; margin: 12px; margin-top: 15px ; transform: scale(1.5);"></input>
                </div>

                <div v-if="newItem.itemType == 'Timer'" style="display: inline-flex; vertical-align: middle; align-items: center; justify-content: center;">
                    <input v-model="hours" type="number" min="0" placeholder="Hor" class="timer-input" style="border-top-left-radius: 5px; border-bottom-left-radius: 5px;" />
                    :<input v-model="minutes" type="number" min="0" placeholder="Min" class="timer-input" />
                    :<input v-model="seconds" type="number" min="0" placeholder="Seg" class="timer-input"style="border-top-right-radius: 5px; border-bottom-right-radius: 5px;" />
                </div>
            </div>
            <button @click="handleNewItemForm()" style="margin-top:15px">Crear</button>
        </template>
    </Modal>

</template>

<style scoped>


.material-symbols-outlined {
  font-variation-settings:
    'FILL' 0,
    'wght' 400,
    'GRAD' 0,
    'opsz' 24;
}

.main-sidebar {
  position: fixed;
  top: 0;
  left: -300px;
  width: 300px;
  height: 100%;
  background-color: #2F184B;
  transition: left 0.3s ease;
  z-index: 1001;
}

.main-sidebar.show {
  left: 0;
  display: block;
}

.main-sidebar-toggle {
  position: fixed;
  top: 15px;
  left: 15px;
  height: 50%;
  cursor: pointer;
}

.main-sidebar-toggle-opened {
  top: 15px;
  left: 275px;
  z-index: 1000;
}

.main-sidebar-title {
  text-align: left;
  margin-left: 5%;
  margin-top: 3%;
  font-weight: bolder;
  word-wrap: break-word;
}

.main-sidebar-subtitle {
  text-align: left;
  margin-left: 5%;
  margin-top: 3%;
  font-weight: bolder;
}

.li-clickable {
  text-align: left;
  margin-left: 10%;
  cursor: pointer;
  word-wrap: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.main-sidebar ul {
  list-style-type: none;
  padding: 0;
}

.main-sidebar ul li {
  padding: 5px;
}

.error {
  grid-column: 1 / -1;
  text-align: center;
  justify-content: center;
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

.logo-img {
  width: 50px;
  height: 50px;
}

</style>