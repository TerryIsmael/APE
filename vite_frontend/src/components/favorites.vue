<script setup>
import { ref, onMounted, onUnmounted, nextTick, onBeforeMount, watch, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import FavoriteUtils from '../utils/FavoritesFunctions.js';
import WorkspaceUtils from '../utils/WorkspaceFunctions.js';
import Utils from '../utils/utilsFunctions.js';
import MainSidebar from './mainSidebar.vue';

const props = defineProps({
  ws: {
      type: Object,
      required: true
  },
});

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
const selectedFolder = ref('favorites');
  
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

const editItem = ref({});
const isEditNameModalOpened = ref(false);

const fetchUser = async () => {
  await Utils.fetchUser(currentUser, router);
};

const fetchWorkspace = async () => {
  await FavoriteUtils.fetchFavs(workspace, currentUser, items, folders, userWsPerms, router, errorMessage);
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
  await Utils.redirectToWorkspace(workspaceId, router, workspace, path, currentPath, currentUser, items, folders, selectedFolder, existFolder, userWsPerms, errorMessage, isWsModalOpened, workspaces, showMainSidebar, ws);
};

const toggleLeave = () => {
  isLeaving.value = !isLeaving.value;
};

const openNewWsModal = () => {
  Utils.openNewWsModal(isWsModalOpened, isNewWsModalOpened, errorMessage);
};

const closeNewWsModal = () => {
  Utils.closeNewWsModal(isNewWsModalOpened, errorMessage);
};

const createWorkspace = async (newWorkspace) => {
  await Utils.createWorkspace(isNewWsModalOpened, newWorkspace, router, workspace, path, currentPath, currentUser, items, folders, selectedFolder, existFolder, userWsPerms, errorMessage, isWsModalOpened, workspaces, showMainSidebar, ws);
  if (errorMessage.value.length === 0) {
    closeNewWsModal();
  }
};

const openEditNameModal = () => {
  WorkspaceUtils.openEditNameModal(editItem, selectedItem, isEditNameModalOpened, errorMessage);
};

const closeEditNameModal = () => {
  WorkspaceUtils.closeEditNameModal(isEditNameModalOpened, editItem, errorMessage)
};

const modifyItem = async (item) => {
  await FavoriteUtils.modifyItem(item, selectedItem, workspace, currentUser, items, folders, userWsPerms, router, errorMessage);
  if (errorMessage.value.length === 0) {
    closeEditNameModal();
    showSidebar.value = false;
  }
};

const websocketEventAdd = () => {
  props.ws.addEventListener('message', async (event) => {
    const jsonEvent = JSON.parse(event.data);
    if (jsonEvent.type === 'workspaceUpdated') {
      await fetchUser();
      await fetchWorkspace();
    }
    if ((jsonEvent.type === 'profileDeleted' && jsonEvent.wsAffected === workspace.value._id.toString()) || jsonEvent.type === 'workspaceDeleted') {
      localStorage.removeItem('workspace');
      await router.push('/workspace');
    }
  });
};

onBeforeMount(async () => {
  path.value = "/" + route.name;
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
    <div class="main-content" style="display: flex; justify-content: center; align-items: center; width: 82vw; flex-shrink: 1; flex-grow: 0; cursor:pointer;" @click="$router.push('/workspace/')" >
      <span style="color: #C8B1E4; font-size: 55px; font-weight: 650; margin-right: 10px;" class="material-symbols-outlined">home</span>
      <h1 style="overflow-wrap: break-word; margin-right: 10px; max-width: 95%;">
          <span>{{ workspace?.name }} </span>
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
          <div class="error" v-if="errorMessage.length !== 0 && !isModalOpened && !isNewWsModalOpened && !isEditNameModalOpened" style="display: flex; justify-content: space-between; padding-left: 2%;">
            <div>
              <p v-for="error in errorMessage" :key="error" style="margin-top: 5px; margin-bottom: 5px; text-align: center; position: relative;">
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
  </div>

  <!-- Main sidebar -->
  <MainSidebar :currentUser="currentUser" :workspace="workspace" :folders="folders" :selectedFolder="selectedFolder" :userWsPerms="userWsPerms" 
  :isWsModalOpened="isWsModalOpened" :errorMessage="errorMessage" :isLeaving="isLeaving" :workspaces="workspaces" :isNewWsModalOpened="isNewWsModalOpened"
  @selectItem="selectItem" @openWsModal="openWsModal"  @toggleLeave="toggleLeave" @openNewWsModal="openNewWsModal" @leaveWorkspace="leaveWorkspace"
  @redirectToWorkspace="redirectToWorkspace" @closeWsModal="closeWsModal" @closeNewWsModal="closeNewWsModal" @createWorkspace="createWorkspace"></MainSidebar>
  
  
  <!-- Modal de edit item --> 
  <Modal class="modal" :isOpen="isEditNameModalOpened" @modal-close="closeEditNameModal" name="edit-item-modal">
    <template #header><strong>Modificar nombre archivo</strong></template>
    <template #content>
      <div class="error" v-if="errorMessage.length !== 0" style="padding-left: 5%; padding-right: 5%; margin-top: 10px;">
          <p style="margin-top: 5px; margin-bottom: 5px; text-align: center" v-for="error in errorMessage">{{ error }}</p>
      </div>

      <div style="margin-top: 20px">              
        <input type="text" v-model="editItem.name" placeholder="Nombre de item..." class="text-input" style="margin-bottom: 5px;"/>      
      </div>

      <div style="display: flex; align-items: center; width: 100%; justify-content: center;">
        <div style="display: flex; justify-content: space-between;">
          <button @click="modifyItem(editItem)" style="margin-top: 15px">Actualizar</button>
          <button @click="closeEditNameModal()" style="margin-left: 5px; margin-top: 15px" class="red-button">Cancelar</button>
        </div>
      </div>
    </template>
  </Modal>

  <!-- Sidebar de detalles -->
  <div class="sidebar" :class="{ 'show': showSidebar }">
    <ul style="display: flex; flex-direction: column; justify-content: center; align-items: center">
      <li style="margin-bottom: 2px; display: flex; align-items: center;" @click="openEditNameModal()"> Archivo: <span v-if="selectedItemPerms !== 'Read'" style="display: flex; vertical-align: middle; margin: 0; margin-left: 10%; cursor: pointer;" class="material-symbols-outlined">edit</span> </li>
      <li style="margin-top: 2px;"> {{ selectedItem?.name }}</li>
      <li style="margin-bottom: 2px;">Autor: {{ author?.username }}</li>
      <li style="margin-top: 2px;" class="email"> ({{ author?.email }})  </li>
      <li>Fecha de subida: {{ formatDate(selectedItem?.uploadDate) }}</li>
      <li>Última modificación: {{ formatDate(selectedItem?.modifiedDate) }}</li>

      <li style="display: inline-flex; justify-content: space-around; width: 90%;">
        <button v-if="['Owner', 'Admin'].includes(selectedItemPerms)" @click="openModal"><span class="material-symbols-outlined">groups</span></button>
        <button class="downloadButton" v-if="['Owner', 'Admin', 'Write', 'Read'].includes(selectedItemPerms) && selectedItem?.itemType === 'File'" @click="downloadFile"><span class="material-symbols-outlined">download</span></button>
        <button @click="toggleLike(selectedItem)">
          <span v-if="!currentUser?.favorites?.includes(selectedItem?._id)" class="material-symbols-outlined">favorite</span>
          <span v-else class="material-symbols-outlined filled-heart">favorite</span>
        </button>
        <button v-if="['Owner', 'Admin'].includes(selectedItemPerms)" @click="deleteItem(selectedItem)"><span class="material-symbols-outlined">delete</span></button>
      </li>
    </ul>
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
  word-wrap: break-word;
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

.sidebar ul li , .email {
  padding: 0 10px;
  margin: 10px 0;
  word-wrap: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 10;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 270px;
}

.email {
  -webkit-line-clamp: 5;
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

.scrollable {
  scrollbar-color: #C8B1E4 transparent;
  scroll-behavior: smooth;
  overflow-y: auto;
  max-height: 35%;
}
</style>