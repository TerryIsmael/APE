<script setup>
import { ref, onBeforeMount } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import Utils from '../utils/UtilsFunctions.js';
import UserDetailsUtils from '../utils/UserDetailsFunctions.js';
import WorkspaceUtils from '../utils/WorkspaceFunctions.js';

const newUser = ref({})

const props = defineProps({
  ws: {
    ws: Object,
    required: true
  },
});

const ws = ref(null);
const currentUser = ref(null);
const userWsPerms = ref(null);
const router = useRouter();
const route = useRoute();
const path = ref('');
const currentPath = ref('');

const selectedFolder = ref('');
const workspace = ref({});
const items = ref([]);

const folders = ref([]);
const showSidebar = ref(false);
const selectedItem = ref(null);
const selectedItemPerms = ref(null);
const userItemPerms = ref(null);
const existFolder = ref(false);
const author = ref(null);
const hours = ref(0);
const minutes = ref(0);
const seconds = ref(0);

const showMainSidebar = ref(false);
const errorMessage = ref([]);
const isNewItemModalOpened = ref(false);
const newItem = ref({});
const editing = ref(false);
const loading = ref(true);

const workspaces = ref([]);
const isWsModalOpened = ref(false);
const isLeaving = ref(false);
const isNewWsModalOpened = ref(false);
const newWorkspace = ref('');

const fetchUser = async () => {
  await Utils.fetchUser(currentUser, router);
};

const fetchFolders = async () => {
  await UserDetailsUtils.fetchFolders(workspace, errorMessage, router);
};

const selectItem = async (item, direct) => {
  await WorkspaceUtils.selectItem(item, direct, selectedFolder, router, selectedItem, showSidebar, selectedItemPerms, workspace, currentUser, author, userItemPerms, errorMessage);
};

const openNewItemModal = (itemType) => {
  WorkspaceUtils.openNewItemModal(itemType, isNewItemModalOpened, newItem, hours, minutes, seconds, errorMessage);
};

const closeNewItemModal = () => {
  WorkspaceUtils.closeNewItemModal(isNewItemModalOpened, newItem, errorMessage, hours, minutes, seconds);
};

const handleNewItemForm = async () => {
  await WorkspaceUtils.handleNewItemForm(newItem, hours, minutes, seconds, path, workspace, errorMessage, currentPath, currentUser, items, folders, selectedFolder, existFolder, userWsPerms, isNewItemModalOpened, router);
};

const clearErrorMessage = () => {
  Utils.clearErrorMessage(errorMessage);
};

const logout = async () => {
  await Utils.logout(router);
};

const openWsModal = async () => {
  await Utils.openWsModal(isWsModalOpened, workspaces, router, errorMessage);
};

const closeWsModal = () => {
  Utils.closeWsModal(isWsModalOpened, workspaces, errorMessage);
};

const leaveWorkspace = async (workspaceId) => {
  await Utils.leaveWorkspace (workspaceId, workspaces, router, errorMessage, isWsModalOpened);
};

const redirectToWorkspace = async(workspaceId) => {
  await Utils.redirectToWorkspace(workspaceId, router, workspace, path, currentPath, currentUser, items, folders, selectedFolder, existFolder, userWsPerms, errorMessage, isWsModalOpened, workspaces, showMainSidebar);
};

const toggleLeave = () => {
  isLeaving.value = !isLeaving.value;
};

const openNewWsModal = () => {
  Utils.openNewWsModal(isWsModalOpened, newWorkspace, isNewWsModalOpened, errorMessage);
};

const closeNewWsModal = () => {
  Utils.closeNewWsModal(isNewWsModalOpened, newWorkspace, errorMessage);
};

const createWorkspace = async () => {
  await Utils.createWorkspace(isNewWsModalOpened, newWorkspace, router, workspace, path, currentPath, currentUser, items, folders, selectedFolder, existFolder, userWsPerms, errorMessage, isWsModalOpened, workspaces, showMainSidebar);
};

onBeforeMount(async () => {
  path.value = '/' + route.name;
  ws.value = props.ws;
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
  await fetchFolders();
  loading.value = false;
  // No init path
  //ws.value.send(JSON.stringify({ type: 'workspaceIdentification', userId: currentUser.value?._id, workspaceId: workspace.value._id }));
  //websocketEventAdd();
});
</script>

<template>
  <div v-if="loading">
    <img :src="'/loading.gif'" alt="item.name" width="100" height="100"/>
  </div>
  <div v-else>
    <div class="main-content" style="display: flex; justify-content: center; align-items: center; word-wrap: break-word;">
      <h1 @click="$router.push('/workspace/')"
        style="cursor: pointer; display: flex; align-items: center; margin-right: 10px">
        <span style="color: #C8B1E4; font-size: 60px;" class="material-symbols-outlined">home</span>
        Detalles del perfil
      </h1>
    </div>

    <div class="main-content" style="display:flex; flex-direction: column; align-items: center;">

      <div style="display: flex; justify-content: space-around; width: 92%; align-items: center;">
        <div style="flex: 1; display: flex; justify-content: flex-start; align-items: center; width: 85%">
          <button v-if="path !== ''" style=" max-height: 50px;" @click="$router.push('/workspace')"><span class="material-symbols-outlined">arrow_back</span></button>
          <h2 style="text-align: left; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-left: 1%;"> Ruta actual: {{ path }}</h2>
        </div>
      </div>
      
      <div class="main-content container">
        <div class="error" v-if="errorMessage.length !== 0 && !isNewItemModalOpened" style="display: flex; justify-content: space-between; padding-left: 2%;">
          <div>
            <p v-for="error in errorMessage" :key="index" style="margin-top: 5px; margin-bottom: 5px; text-align: center; position: relative;">
              {{ error }}
            </p>
          </div>
          <button @click="clearErrorMessage()" style="display: flex; align-items: top; padding: 0; padding-left: 5px; padding-top: 10px; background: none; border: none; cursor: pointer; color: #f2f2f2; outline: none;">
            <span style="font-size: 20px; "class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="items-container">
          <div>
            <input v-if="editing" type="text" v-model="newUser.username" :placeholder=currentUser.username class="text-input" style="margin-bottom: 5px;"/>
            
            <div style="width: 100%" v-else>
              <hr style="width: 100%; display: flex; margin-left: 0%; margin-top: 0.5%">
              <h4 style="margin-left: 0; margin-right: 0; margin-top: 0;"> {{ workspace.name }}</h4>
            </div>
          </div>
        </div>

      </div>
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
      <li class="li-clickable selected-folder" @click="selectItem('userDetails', true)">Gestionar perfil</li>

      <li class="main-sidebar-subtitle">Workspace actual
        <span v-if="['Owner', 'Admin'].includes(workspace.permission)" @click="selectItem('wsDetails', true)" style="position: absolute; right: 12%; text-align: right; cursor: pointer; vertical-align: middle;" class="material-symbols-outlined">tune</span>
        <span v-if="['Owner', 'Admin', 'Write'].includes(workspace.permission)" @click="openNewItemModal('Folder')" style="position: absolute; right: 21%; text-align: right; cursor: pointer; vertical-align: middle" class="material-symbols-outlined">add</span>
      </li>

      <li @click="selectItem('notices', true)" class="li-clickable">Anuncios</li>
      <li @click="selectItem('favorites', true)" class="li-clickable">Favoritos</li>

      <div class="scrollable" style="max-height: 35%; overflow-y: auto;">
        <div v-for="folder in workspace.folders" :key="folder._id" style="word-wrap: break-word;">
          <li @click="selectItem(folder, true)" class="li-clickable"> {{ folder.name }} </li>
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
      </div>
      <button @click="handleNewItemForm()" style="margin-top:15px">Crear</button>
    </template>
  </Modal>

  <!-- Modal de gestion de worskpaces -->
  <Modal class="modal" :isOpen="isWsModalOpened" @modal-close="closeWsModal" name="workspace-modal">
    <template #header><strong>Tus workspaces</strong></template>
    <template #content>  
      <div class="error" v-if="errorMessage.length !== 0 && isWsModalOpened" style="padding-left: 5%; padding-right: 5%; margin-top: 10px;">
        <p style="margin-top: 5px; margin-bottom: 5px; text-align: center" v-for="error in errorMessage">{{ error }}</p>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; margin-top: 10px">
        <button :class="{'toggle-leave':true, 'red-button':!isLeaving }" @click="toggleLeave()">
          <span v-if="isLeaving">Volver</span>
          <span v-else>Abandonar</span>
        </button>
        <div>
          <span @click="openNewWsModal()" style="cursor: pointer; margin-right: 10px" class="material-symbols-outlined">add</span>
        </div>
      </div>

      <div style="max-height: 45vh; overflow-y: auto; margin-top: 20px;">
        <div v-for="myWorkspace in workspaces" style="padding-right: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
            <p class="ws-name">{{ myWorkspace.name }}</p>
            <div style="display: flex; gap: 10px; justify-content: right; align-items: center; width: 20%">
              <button v-if="myWorkspace.perm !== 'Owner' && isLeaving" class="ws-modal-button" style="background-color: #c55e5e" @click="leaveWorkspace(myWorkspace._id)">
                <span style="vertical-align: middle;" class="material-symbols-outlined">person_cancel</span>
              </button>
              <button :disabled="workspace._id.toString() == myWorkspace._id" class="ws-modal-button" @click="redirectToWorkspace(myWorkspace._id)">
                <span style="vertical-align: middle;" class="material-symbols-outlined">sync_alt</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>
  </Modal>

  <!-- Modal de nuevo workspace -->
  <Modal class="modal" :isOpen="isNewWsModalOpened" @modal-close="closeNewWsModal" name="new-workspace-modal">
    <template #header><strong>Crear workspace</strong></template>
    <template #content>
      <div class="error" v-if="errorMessage.length !== 0 && isNewWsModalOpened" style="padding-left: 5%; padding-right: 5%; margin-top: 10px;">
        <p style="margin-top: 5px; margin-bottom: 5px; text-align: center" v-for="error in errorMessage">{{ error }}</p>
      </div>

      <div style="margin-top: 20px">
        <input type="text" v-model="newWorkspace" placeholder="Nombre de workspace..." maxlength="55" class="text-input" style="margin-bottom: 5px;"/>
      </div>
      <button @click="createWorkspace().then(() => closeNewWsModal())" style="margin-top:15px">Crear</button>
    </template>
  </Modal>
</template>

<style scoped>
.container {
  width: 90%;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  overflow-x: hidden;
}

.items-container {
  width: 100%;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
}

.profile-name {
  text-align: left;
  max-width: 70%;
  margin-right: 10px;
  word-wrap: break-word; 
  display: -webkit-box; 
  -webkit-line-clamp: 1; 
  -webkit-box-orient: vertical; 
  overflow: hidden;
}

.text-input {
  border-radius: 5px;
  margin-bottom: 5px;
  height: 30px;
  width: 90%;
  background-color: #f2f2f2;
  color: black;
}

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

.main-content {
  z-index: 1;
}

.selected-folder {
  margin-left: 10%;
  border-radius: 8px;
  width: 80%;
  padding: 0.6em 1.2em;
  font-size: 1em;
  font-weight: 500;
  font-family: inherit;
  background-color: #C8B1E4;
  color: black;
  text-align: left;
  cursor: pointer;
  word-wrap: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.logo-img {
  width: 50px;
  height: 50px;
}

.change-workspace-button {
  height: auto;
  border-radius: 8px;
  margin-top: 1%;
  padding: 0.4em 0.7em;
  font-size: 1em;
  font-weight: 500;
  font-family: inherit;
  background-color: #C8B1E4;
  color: black;
  cursor: pointer;
}

.scrollable {
  scrollbar-color: #C8B1E4 transparent;
  scroll-behavior: smooth;
}

.ws-modal-button {
  width: 45px; 
  height: 40px;
  border-radius: 8px;
  border: 1px solid transparent;
  padding: 0.2em 0.5em;
  font-size: 1em;
  font-weight: 500;
  font-family: inherit;
  background-color: #C8B1E4;
  color:black;
  cursor: pointer;
}

.ws-modal-button:disabled {
  background-color: #736685; 
  cursor: not-allowed;
}

.ws-name {
  text-align: left;
  width: 75%;
  margin-right: 5px;
  word-wrap: break-word; 
  overflow: hidden;
  white-space: nowrap; 
  text-overflow: ellipsis;
  display: block;
}

.toggle-leave {
  display:flex;
  justify-content: center;
  align-items: center;
  height: 30px;
  text-align: center;
  border-radius: 8px;
  border: 1px solid transparent;
  padding: 0.2em 0.5em;
  font-size: 1em;
  font-weight: 500;
  font-family: inherit;
  background-color: #C8B1E4;
  color:black;
  cursor: pointer;
  outline: none;
}

.red-button {
  background-color: #c55e5e; 
}

</style>