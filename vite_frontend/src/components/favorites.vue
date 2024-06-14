<script setup>
import { ref, onMounted, onUnmounted, nextTick, onBeforeMount, watch, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import FavoriteUtils from '../utils/FavoritesFunctions.js';
import WorkspaceUtils from '../utils/WorkspaceFunctions.js';
import Utils from '../utils/utilsFunctions.js';

const props = defineProps({
  ws: {
      ws: Object,
      required: true
  },
});

const ws = ref(null);
const currentUser = ref(null);
const userWsPerms = ref(null);
const userItemPerms = ref(null);
const router = useRouter();
const route = useRoute();
const path = ref("");
const workspace = ref({});
const items = ref([]); 
const folders = ref([]);
const author = ref(null);
const selectedItem = ref(null);
const selectedItemPerms = ref(null);
const selectedFolder = ref('');
  
const showSidebar = ref(false);
const showMainSidebar = ref(false);
const isModalOpened = ref(false);
const searchProfileTerm = ref('');
const searchTypeProfile = ref('All');
const errorMessage = ref([]);
const loading = ref(true);

const isNewItemModalOpened = ref(false);
const newItem = ref({});
const hours = ref(0);
const minutes = ref(0);
const seconds = ref(0);

const currentPath = ref('');
const existFolder = ref(false);

const workspaces = ref([]);
const isWsModalOpened = ref(false);
const isLeaving = ref(false);

const isNewWsModalOpened = ref(false);
const newWorkspace = ref('');

const fetchUser = async () => {
  await Utils.fetchUser(currentUser, router);
};

const fetchWorkspace = async () => {
  await FavoriteUtils.fetchFavs(workspace, currentUser, items, folders, userWsPerms, router, errorMessage);
  ws.value.send(JSON.stringify({ type: 'workspaceIdentification', user: currentUser.value._id, workspaceId: workspace.value._id }));
};

const formatDate = (date) => {
  return Utils.formatDate(date);
};

const selectItem = async (item, direct) => {
  await WorkspaceUtils.selectItem(item, direct, selectedFolder, router, selectedItem, showSidebar, selectedItemPerms, workspace, currentUser, author, userItemPerms, errorMessage);
};

const handleRightClick = (event, item) => {
  selectItem(item, false);
};

const toggleLike = async (item) => {
  await FavoriteUtils.toggleLike(item, workspace, router, currentUser, items, folders, userWsPerms, errorMessage);
};

const translateItemType = (item) => {
  return Utils.translateItemType(item);
};

const translatePerm = (perm) => {
  return Utils.translatePerm(perm);
};

const deleteItem = async (item) => {
  await FavoriteUtils.deleteItem(item, selectedItem, author, workspace, currentUser, items, folders, userWsPerms, router, showSidebar, errorMessage);
};

const selectImage = (item) => {
  return Utils.selectImage(item);
};

const openModal = () => {
  Utils.openModal(isModalOpened, errorMessage);
};

const closeModal = () => {
  Utils.closeModal(isModalOpened, errorMessage);
};

const closeSidebar = (event) => {
  WorkspaceUtils.closeSidebar(event, showSidebar, author);
};

const changePerms = async (perm, profileId) => {
  await FavoriteUtils.changePerms(perm, profileId, selectedItem, workspace, currentUser, items, folders, userWsPerms, router, errorMessage);
};

const getFilteredProfiles = computed(() => {
  const ownerProfile = selectedItem.value.profilePerms.find(profilePerm => profilePerm.permission === 'Owner').profile;
  const profiles = workspace.value.profiles.filter(profile => {
    const name = profile.profileType === 'Individual' ? profile.users[0].username : profile.name;
    const matchesSearchTerm = searchProfileTerm.value.trim() === '' || name.toLowerCase().includes(searchProfileTerm.value.toLowerCase().trim());
    const isNotOwner = profile._id !== ownerProfile._id;

    return searchTypeProfile.value === 'All' ? (matchesSearchTerm && isNotOwner) : (matchesSearchTerm && isNotOwner && profile.profileType === searchTypeProfile.value);
  });

  const orderedProfiles = [];
  const inProfilePerms = profiles.filter(profile => selectedItem.value.profilePerms.find(profilePerm => profilePerm.profile._id === profile._id));
  const notInProfilePerms = profiles.filter(profile => !selectedItem.value.profilePerms.find(profilePerm => profilePerm.profile._id === profile._id));
  orderedProfiles.push(...inProfilePerms);
  orderedProfiles.push(...notInProfilePerms);
  return orderedProfiles; 
});

const downloadFile = async () => {
  await WorkspaceUtils.downloadFile(workspace, selectedItem, errorMessage);
};

const clearErrorMessage = () => {
  Utils.clearErrorMessage(errorMessage);
};

const logout = async () => {
  await Utils.logout(router);
};

const checkDictUserItemPerms = (profileId) => {
  if (!userItemPerms.value[profileId]) {
    userItemPerms.value[profileId] = 'None';
  }
};

const openWsModal = async () => {
  await Utils.openWsModal(isWsModalOpened, workspaces, isLeaving, router, errorMessage);
};

const closeWsModal = () => {
  Utils.closeWsModal(isWsModalOpened, workspaces, errorMessage);
};

const leaveWorkspace = async (workspaceId) => {
  await Utils.leaveWorkspace(workspaceId, isWsModalOpened, workspaces, workspace, path, currentPath, currentUser, items, folders, selectedFolder, existFolder, userWsPerms, router, errorMessage);
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
  if (errorMessage.value.length === 0) {
    closeNewWsModal();
  }
};

const websocketEventAdd = () => {
  props.ws.addEventListener('open', async (event) => {
    console.log('Connected to server');
    ws.value.send(JSON.stringify({ type: 'workspaceIdentification', userId: currentUser.value?._id, workspaceId: workspace.value?._id }));
  });
  props.ws.addEventListener('message', async (event) => {
    const jsonEvent = JSON.parse(event.data);
    if (jsonEvent.type === 'workspaceUpdated') {
      await fetchUser();
      await fetchWorkspace();
    }
    if ((jsonEvent.type === 'profileDeleted' && jsonEvent.wsAffected === workspace.value._id.toString()) || (jsonEvent.type === 'workspaceDeleted' && jsonEvent.wsAffected === workspace.value._id.toString())) {
      localStorage.removeItem('workspace');
      await router.push('/workspace');
    }
  });
};

onBeforeMount(async () => {
  path.value = "/" + route.name;
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
  await fetchWorkspace();
  websocketEventAdd();
  loading.value = false;
});

onMounted(() => {
  document.addEventListener('click', closeSidebar);
});

onUnmounted(() => {
  document.removeEventListener('click', closeSidebar);
}); 

</script>
 
<template>
  <div v-if="loading">
    <img :src="'/loading.gif'" alt="item.name" width="100" height="100"/>
  </div>
  <div v-else>
    <div class="main-content" style="display: flex; justify-content: center; align-items: center; word-wrap: break-word;">
        <h1 @click="$router.push('/workspace/')" style="cursor: pointer; display: flex; align-items: center; margin-right: 10px"> 
          <span style="color: #C8B1E4; font-size: 60px;" class="material-symbols-outlined">home</span>
          {{ workspace?.name }} 
        </h1>
    </div>

    <div class="main-content" style="display:flex; flex-direction: column; align-items: center;">

      <div style="display: flex; justify-content: space-around; width: 87%; align-items: center;">
        <div style="flex: 1; display: flex; justify-content: flex-start; align-items: center; width: 85%">
          <button v-if="path !== ''" style=" max-height: 50px;" @click="$router.push('/workspace')"><span class="material-symbols-outlined">arrow_back</span></button>
          <h2 style="text-align: left; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-left: 1%;">Ruta actual: {{ path }}</h2>
        </div>
      </div>
      <div class="main-content container">
        <div v-if="items.length === 0">
          <p style="font-size: xx-large; font-weight: bolder;">Aún no hay favoritos...</p>
        </div>

        <div v-else> 
          <div class="error" v-if="errorMessage.length !== 0 && !isModalOpened && !isNewWsModalOpened" style="display: flex; justify-content: space-between; padding-left: 2%;">
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
            <div class="item-container" v-for="item in items" :key="item.id" @click="selectItem(item, true)" @contextmenu.prevent="handleRightClick(event, item)">
              <div>
                <img class="item-img" style="" :src="selectImage(item)" alt="item.name" width="100" height="100">
                <span v-if="currentUser?.favorites?.includes(item._id)" class="material-symbols-outlined filled-heart absolute-heart">favorite</span>       
              </div>
              <div style="display:flex; align-items: center;">
                <p class="item-name">{{ item.name }} </p>
              </div>
            </div>
          </div>
      </div>
    </div>
  </div>

  <!-- Main sidebar -->
  <div class="main-sidebar-overlay" v-if="showMainSidebar"></div>
    <div class="main-sidebar" :class="{'show' : showMainSidebar}">

      <div :class="{'main-sidebar-toggle':true, 'main-sidebar-toggle-opened':showMainSidebar}">
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
        <li class = "main-sidebar-title">Inicio</li>
        <li class="li-clickable" @click="selectItem('userDetails', true)">Tu perfil</li>
        <li @click="selectItem('chats', true)" class="li-clickable">Chats</li>

        <li class="main-sidebar-subtitle">Workspace actual
          <span v-if="['Owner', 'Admin'].includes(userWsPerms)" @click="selectItem('wsDetails', true)" style="position: absolute; right: 12%; text-align: right; cursor: pointer; vertical-align: middle;" class="material-symbols-outlined">tune</span>
        </li>

        <li @click="selectItem('notices', true)" class="li-clickable">Anuncios</li>
        <li @click="selectItem('favorites', true)" class="li-clickable selected-folder">Favoritos</li>
        
        <div class="scrollable" style="max-height: 35%; overflow-y: auto;">
          <div v-for="folder in folders" :key="folder._id" style="word-wrap: break-word;">
            <li @click="selectItem(folder, true)" class="li-clickable"> {{ folder.name }}</li>
          </div>
        </div>

      </ul>
      <ul style="height: 5%;">
        <li style="text-align: right;"> <button style="margin-right: 5%;" @click="logout"><span class="material-symbols-outlined">logout</span></button> </li>
      </ul>
  </div>

  <!-- Sidebar de detalles -->
    <div class="sidebar" :class="{ 'show': showSidebar }">
      <ul>
        <li style="margin-bottom: 2px;"> Archivo: </li>
        <li style="margin-top: 2px;"> {{ selectedItem?.name }}</li>
        <li style="margin-bottom: 2px;">Autor: {{ author?.username }}</li>
        <li style="margin-top: 2px;"> ({{ author?.email }})</li>
        <li>Fecha de subida: {{ formatDate(selectedItem?.uploadDate)}}</li>
        <li>Última modificación: {{ formatDate(selectedItem?.modifiedDate)}}</li>

        <li style="display: inline-flex; justify-content: space-around; width: 90%;">
          <button v-if="['Owner', 'Admin'].includes(selectedItemPerms)" @click="openModal"><span class="material-symbols-outlined">groups</span></button>
          <button class="downloadButton" v-if="['Owner', 'Admin', 'Write','Read'].includes(selectedItemPerms) && selectedItem?.itemType === 'File'" @click="downloadFile"><span class="material-symbols-outlined">download</span></button>
          <button @click="toggleLike(selectedItem)">
            <span v-if="!currentUser?.favorites?.includes(selectedItem?._id)" class="material-symbols-outlined">favorite</span>
            <span v-else class="material-symbols-outlined filled-heart">favorite</span>
          </button>
          <button v-if="['Owner','Admin'].includes(selectedItemPerms)" @click="deleteItem(selectedItem)"><span class="material-symbols-outlined">delete</span></button>
        </li>
      </ul>
    </div>
  </div>

  <!-- Modal de permisos -->
  <Modal class="modal" :isOpen="isModalOpened" @modal-close="closeModal" name="first-modal">
    <template #header><strong>Compartir archivo</strong></template>
    <template #content>  
      <div class="error" v-if="errorMessage.length !== 0" style="padding-left: 5%; padding-right: 5%; margin-top: 10px;">
        <p style="margin-top: 5px; margin-bottom: 5px; text-align: center" v-for="error in errorMessage">{{ error }}</p>
      </div>

      <div style="margin-top: 20px">
        <p>Compartir con:</p>
        <div style="display: inline-flex; width: 90%; align-items: center; justify-content: space-between; margin-bottom: 10px">
          <input v-model="searchProfileTerm" placeholder="Buscar perfil por nombre..." class="text-input" style="width: 70%;"/>
          <select v-model="searchTypeProfile" class="text-input" style="width: 25%;">
            <option value="Individual">Individual</option>
            <option value="Group">Grupo</option>
            <option value="All">Todos</option>
          </select>
        </div>

        <div style="max-height: 35vh; overflow-y: auto;">          
          <div v-for="profile in getFilteredProfiles" :key="profile._id">
            <div style="display: inline-flex; width: 90%; height: 40px; align-items: center; justify-content: space-between;">
              <p class="profile-name">{{ profile.profileType == 'Individual' ? profile.users[0].username : profile.name }}</p>
              {{ checkDictUserItemPerms(profile._id) }}
              <select v-model="userItemPerms[profile._id]" @change="changePerms(userItemPerms[profile._id], profile._id)" class="text-input" style="width: 25%;">
                <option :selected="!(profile._id in userItemPerms)" value='None'>Ninguno</option>
                <option value="Read">Lectura</option>
                <option value="Write">Escritura</option>
              </select>
            </div>
          </div>
        </div>
      </div>
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
      <button @click="createWorkspace()" style="margin-top:15px">Crear</button>
    </template>
  </Modal>
</template>

<style scoped>
.container {
  display: flex;
  align-items: center;
  position: relative;
  overflow-x: hidden;
}

.items-container {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
}

.item-container {
  margin: 10px;
  padding: 10px;
  border: 1px solid #C8B1E4;
  border-radius: 10px;
  width: 150px;
  height: 175px;
  position: relative;
}

.profile-name {
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

.absolute-heart {
  position: absolute;
  top: 5px;
  right: 5px;
}

.material-symbols-outlined {
  font-variation-settings:
    'FILL' 0,
    'wght' 400,
    'GRAD' 0,
    'opsz' 24;
}

.filled-heart {
  font-variation-settings:
    'FILL' 1;
}

.item-img {
  margin-bottom: 10px;
  justify-self: flex-start;
}

.item-name {
  text-align: center;
  font-size: 16px;
  font-weight: bold;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  width: 100%;
  margin: 0;
}

.sidebar {
  z-index: 1000;
  position: fixed;
  top: 0;
  right: -300px;
  width: 300px;
  height: 100%;
  background-color: #2F184B;
  transition: right 0.3s ease;
}

.sidebar.show {
  right: 0;
  display: block;
}

.sidebar ul {
  list-style-type: none;
  padding: 0;
}

.sidebar ul li {
  padding: 0 10px;
  margin: 15px 0;
  word-wrap: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
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
}

.main-sidebar-overlay {
  position: fixed;
  top: 0;
  right: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: none;
}

.main-sidebar.show + .main-sidebar-overlay {
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
  color:black;
  text-align: left;
  cursor: pointer;
  word-wrap: break-word; 
  display: -webkit-box; 
  -webkit-line-clamp: 1; 
  -webkit-box-orient: vertical; 
  overflow: hidden;
}

.logo-img{
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
  color:black;
  cursor: pointer;
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

.scrollable {
  scrollbar-color: #C8B1E4 transparent;
  scroll-behavior: smooth;
}
</style>