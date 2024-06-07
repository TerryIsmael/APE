<script setup>
import { ref, onMounted, onUnmounted, nextTick, onBeforeMount, watch, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import Timer from './Timer.vue';
import WorkspaceUtils from '../utils/WorkspaceFunctions.js';
import Utils from '../utils/UtilsFunctions.js';

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
const workspaceId = ref(null);
const workspace = ref({});
const currentPath = ref('');
const items = ref([]);
const folders = ref([]);
const author = ref(null);
const selectedItem = ref(null);
const selectedItemPerms = ref(null);
const selectedFolder = ref('');
const existFolder = ref(false);
const routedItem = ref(null);
const showSidebar = ref(false);
const showMainSidebar = ref(false);
const isModalOpened = ref(false);
const searchProfileTerm = ref('');
const searchTypeProfile = ref('All');
const errorMessage = ref([]);

const isNewItemModalOpened = ref(false);
const newItem = ref({});
const fileInput = ref(null);
const hours = ref(0);
const minutes = ref(0);
const seconds = ref(0);

const selectedFolderPerms = ref(null);

const fetchUser = async () => {
  await Utils.fetchUser(currentUser, router);
}

const fetchWorkspace = async () => {
  await WorkspaceUtils.fetchWorkspace(workspace, path, currentPath, currentUser, items, folders, selectedFolder, existFolder, userWsPerms, router);
  ws.value.send(JSON.stringify({ type: 'workspaceIdentification', workspaceId: workspace.value._id }));
}

const formatDate = (date) => {
  return Utils.formatDate(date);
}

const selectItem = async (item, direct) => {
  await WorkspaceUtils.selectItem(item, direct, selectedFolder, router, selectedItem, showSidebar, selectedItemPerms, workspace, currentUser, author, userItemPerms, errorMessage);
}

const toggleLike = async (item) => {
  await WorkspaceUtils.toggleLike(item, workspace, router, currentUser, path, items, folders);
}

const translateItemType = (item) => {
  return Utils.translateItemType(item);
}

const translatePerm = (perm) => {
  return Utils.translatePerm(perm);
}

const deleteItem = async (item) => {
  await WorkspaceUtils.deleteItem(item, selectedItem, author, workspace, path, currentPath, currentUser, items, folders, selectedFolder, existFolder, userWsPerms, router, showSidebar);
}

const selectImage = (item) => {
  return Utils.selectImage(item);
}

const openNewItemModal = (itemType) => {
  WorkspaceUtils.openNewItemModal(itemType, isNewItemModalOpened, newItem, hours, minutes, seconds, errorMessage);
};

const closeNewItemModal = () => {
  WorkspaceUtils.closeNewItemModal(isNewItemModalOpened, newItem, errorMessage, hours, minutes, seconds);
};

const handleNewItemForm = async () => {
  await WorkspaceUtils.handleNewItemForm(newItem, hours, minutes, seconds, path, workspace, errorMessage, currentPath, currentUser, items, folders, selectedFolder, existFolder, userWsPerms, isNewItemModalOpened, router);
}

const navigateToPreviousFolder = () => {
  WorkspaceUtils.navigateToPreviousFolder(path, router);
}

const openModal = () => {
  Utils.openModal(isModalOpened);
};

const closeModal = () => {
  Utils.closeModal(isModalOpened, errorMessage);
};

const closeSidebar = (event) => {
  WorkspaceUtils.closeSidebar(event, showSidebar, author);
};

const showFolderDetails = async () => {
  await WorkspaceUtils.showFolderDetails(selectedItem, folders, selectedFolder, selectedItemPerms, showSidebar, author, router, workspace, currentUser);
}

const changePerms = async (perm, profileId) => {
  await WorkspaceUtils.changePerms(perm, profileId, selectedItem, workspace, path, currentPath, currentUser, items, folders, selectedFolder, existFolder, userWsPerms, router, errorMessage);
}

const getFilteredProfiles = computed(() => {
  const ownerProfile = selectedItem.value.profilePerms.find(profilePerm => profilePerm.permission === 'Owner').profile;
  const profiles = workspace.value.profiles.filter(profile => {
    const name = profile.profileType === 'Individual' ? profile.users[0].username : profile.name;
    const matchesSearchTerm = searchProfileTerm.value === '' || name.toLowerCase().includes(searchProfileTerm.value.toLowerCase());
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
  await WorkspaceUtils.downloadFile(workspace, selectedItem);
}

const selectUploadFile = () => {
  fileInput.value.click();
};

const uploadFile = async (event) => {
  await WorkspaceUtils.uploadFile(event, workspace, path, currentPath, currentUser, items, folders, selectedFolder, existFolder, userWsPerms, router, errorMessage, fileInput);
}

const logout = async () => {
  await Utils.logout(router);
}

const checkDictUserItemPerms = (profileId) => {
  if (!userItemPerms.value[profileId]) {
    userItemPerms.value[profileId] = 'None';
  }
}

const handleRightClick = (event, item) => {
  selectItem(item, false);
};

const clearErrorMessage = () => {
  Utils.clearErrorMessage(errorMessage);
}

const modifyItem = async (item) => {
  await WorkspaceUtils.modifyItem(item, workspace, path, currentPath, currentUser, items, folders, selectedFolder, existFolder, userWsPerms, router, errorMessage);
}

const startDrag = (evt, item) => {
  evt.dataTransfer.setData('itemId', item._id);
  evt.dataTransfer.dropEffect = 'move';
  evt.dataTransfer.effectAllowed = 'move';
};

const onDrop = async (evt, folder, back) => {
  const itemId = evt.dataTransfer.getData('itemId')
  const item = items.value.find((item) => item._id == itemId);
  if (back) {
    const path = item.path.split('/').slice(0, -1).join('/');
    item.path = path;
    await modifyItem(item);
  } else {
    if (item._id === folder._id) return;
    item.path = folder.path + "/" + folder.name;
    await modifyItem(item);
  }
};

const getItemBindings = (item, index) => {
  if (item.itemType === 'Folder') {
    return {
      onDrop: (event) => onDrop(event, item),
      onDragover: (event) => event.preventDefault(),
      onDragenter: (event) => event.preventDefault()
    };
  } else if (index === 0) {
    return {
      onDrop: (event) => onDrop(event, item, true),
      onDragover: (event) => event.preventDefault(),
      onDragenter: (event) => event.preventDefault()
    };
  }
  return {};
};

const initPath = () => {
  const pathArray = path.value.split('/');
  if (pathArray[pathArray.length - 2] == "i") {
    workspace.value.items.forEach(item => {
      if (item.name == pathArray[pathArray.length - 1] && item.path == pathArray.slice(0, pathArray.length - 2).join('/')) {
        routedItem.value = item;
        path.value = pathArray.slice(0, pathArray.length - 2).join('/');
        showMainSidebar.value = false;
      } else {
        routedItem.value = "Not found";
      }
    });
  } else {
    routedItem.value = null;
  }
  showSidebar.value = false;
}

onBeforeMount(async () => {
  path.value = route.params.path ? JSON.stringify(route.params.path).replace("[", '').replace("]", '').replace(/"/g, '').split(',').join('/') : '';
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
  initPath();
});

onMounted(() => {
  selectedFolder.value = path.value;
  workspaceId.value = localStorage.getItem('workspace');
  document.addEventListener('click', closeSidebar);
});

onUnmounted(() => {
  document.removeEventListener('click', closeSidebar);
});

watch(
  () => route.params.path,
  () => {
    path.value = route.params.path ? JSON.stringify(route.params.path).replace("[", '').replace("]", '').replace(/"/g, '').split(',').join('/') : '';
    selectedFolder.value = path.value;
    fetchWorkspace();
    const pathArray = path.value.split('/');
    initPath();
  }
);

</script>

<template>
  <Timer v-if="routedItem && routedItem.itemType == 'Timer'" :item="routedItem" :ws="ws" :workspace="workspaceId"
    :path="path"></Timer>
  <div v-if="routedItem == 'Not found'">
    <div class="main-content"
      style="display: flex; justify-content: center; align-items: center; word-wrap: break-word;">
      <h1 @click="$router.push('/workspace/')"
        style="cursor: pointer; display: flex; align-items: center; margin-right: 10px">
        <span style="color: #C8B1E4; font-size: 60px;" class="material-symbols-outlined">home</span>
        {{ workspace?.name }}
      </h1>
    </div>
    <h2>No se encuentra el item. Puede que haya sido movido o eliminado.</h2>
  </div>

  <div v-if="!routedItem">
    <div class="main-content"
      style="display: flex; justify-content: center; align-items: center; word-wrap: break-word;">
      <h1 @click="$router.push('/workspace/')"
        style="cursor: pointer; display: flex; align-items: center; margin-right: 10px">
        <span style="color: #C8B1E4; font-size: 60px;" class="material-symbols-outlined">home</span>
        {{ workspace?.name }}
      </h1>
    </div>

    <div class="main-content" style="display:flex; flex-direction: column; align-items: center;">

      <div style="display: flex; justify-content: space-around; width: 87%; align-items: center;">
        <div style="flex: 1; display: flex; justify-content: flex-start; align-items: center; width: 85%">
          <button v-if="path !== ''" style=" max-height: 50px;" @click="navigateToPreviousFolder()"><span
              class="material-symbols-outlined">arrow_back</span></button>
          <div
            style="display:flex; width: 100%; justify-content: start; text-align: left; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-left: 1%;">
            <h2 style="margin-right: 1%">Ruta actual:</h2>
            <h2 v-if="currentPath.split('/')[0] === '...'">...</h2>
            <h2 v-for="(folder, index) in currentPath.split('/').slice(1)" :key="index"
              v-bind="getItemBindings({}, index)">/{{ folder }}</h2>
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end; width: 15%;">
          <button v-if="currentPath !== '/'" style="margin-right: 10px; max-height: 50px;" @click="showFolderDetails()">
            <span class="material-symbols-outlined">info</span>
          </button>
          <button style="margin-right: 10px; max-height: 50px;" @click="openNewItemModal('Folder')">
            <span class="material-symbols-outlined">create_new_folder</span>
          </button>
          <div class="dropdown">
            <button style="max-height: 50px;" @click="openDropdown">
              <span class="material-symbols-outlined">add</span>
            </button>
            <div style="z-index: 1002;" class="dropdown-content">
              <div @click="openNewItemModal('Notice')">Anuncio</div>
              <div @click="openNewItemModal('Calendar')">Calendario</div>
              <div @click="openNewItemModal('Note')">Nota</div>
              <div @click="openNewItemModal('Timer')">Temporizador</div>
              <input type="file" ref="fileInput" style="display: none" @change="uploadFile">
              <div @click="selectUploadFile" value="File">Archivo</div>
            </div>
          </div>
        </div>
      </div>
      <div class="main-content container">
        <p v-if="!existFolder" style="font-size: xx-large; font-weight: bolder;">No existe este directorio</p>
        <div v-if="existFolder && items.length === 0">
          <p style="font-size: xx-large; font-weight: bolder;">Aún no hay items...</p>
        </div>

        <div v-else>
          <div class="error" v-if="errorMessage.length !== 0 && !isModalOpened && !isNewItemModalOpened" v-for="error in errorMessage" style="width: 60%;">
            <p style="margin-top: 5px; margin-bottom: 5px; text-align: center">{{ error }}</p>
          </div>

          <div class="items-container">
            <div class="item-container" v-for="item in items" :key="item.id" @click="selectItem(item, true)" draggable="true" @dragstart="startDrag($event, item)" @contextmenu.prevent="handleRightClick(event,item)" v-bind="getItemBindings(item)">
              <div>
                <div v-if="currentUser?.favorites?.includes(item._id)">
                  <img class="item-img" style="" :src="selectImage(item)" alt="item.name" width="100" height="100">
                  <span v-if="currentUser?.favorites?.includes(item._id)" class="material-symbols-outlined filled-heart absolute-heart">favorite</span>       
                </div>
                <div v-else>
                  <img class="item-img" :src="selectImage(item)" alt="item.name" width="100" height="100">
                </div>
                <div style="display:flex; align-items: center;">
                  <p class="item-name">{{ item.name }} </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Main sidebar -->
        <div class="main-sidebar-overlay" v-if="showMainSidebar"></div>
        <div class="main-sidebar" :class="{ 'show': showMainSidebar }">

          <div :class="{ 'main-sidebar-toggle': true, 'main-sidebar-toggle-opened': showMainSidebar }">
            <span v-if="!showMainSidebar" @click="showMainSidebar = true" class="material-symbols-outlined"
              style="z-index: 1002">chevron_right</span>
            <span v-else @click="showMainSidebar = false" class="material-symbols-outlined"
              style="z-index: 1002">chevron_left</span>
          </div>

          <ul style="height: 85%; min-height: 85%;">
            <div style="display:flex; width: 50px; height: 50px;">
              <div style="margin-left: 35%"><img class="logo-img"
                  src="https://i.pinimg.com/564x/27/bb/89/27bb898786b2fe976f67c318b91a5d2d.jpg"></img></div>
              <div
                style="margin-left: 65%; display:flex; align-items: center; justify-content: space-between; width: calc(100% - 40px);">
                <div style="text-align: center;">
                  <p style="margin: 0; font-weight: bold;">APE</p>
                  <p style="margin: 0;">{{ currentUser?.username }}</p>
                </div>
              </div>
            </div>

            <li @click="$router.push('/workspace/')"
              style="font-weight: bolder; text-align: left; margin-left: 5%; margin-right: 5%; margin-bottom: 1%; margin-top: 3%; word-wrap: break-word; display: flex; align-items: center; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; cursor: pointer;">
              <span style="vertical-align: middle; margin-right: 8px;" class="material-symbols-outlined">home</span>
              <p
                style=" margin: 0%; padding: 0%; word-wrap: break-word; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                {{ workspace?.name }} </p>
            </li>

            <button class="change-workspace-button">Cambiar</button>
            <li class="main-sidebar-title">Inicio</li>
            <li class="li-clickable">Gestionar perfil</li>
            <li class="li-clickable">Gestionar workspaces</li>

            <li class="main-sidebar-subtitle">Workspace actual
              <span v-if="['Owner', 'Admin', 'Write'].includes(userWsPerms)" @click="openNewItemModal('Folder')"
                style="margin-left: 35%; text-align: right; cursor: pointer; vertical-align: middle"
                class="material-symbols-outlined">add</span>
            </li>

            <li @click="selectItem('wsDetails', true)"
              :class="{ 'li-clickable': true, 'selected-folder': selectedFolder == 'wsDetails' }">Detalles del workspace
            </li>
            <li @click="selectItem('notices', true)"
              :class="{ 'li-clickable': true, 'selected-folder': selectedFolder == 'notices' }">Anuncios</li>
            <li @click="selectItem('favorites', true)"
              :class="{ 'li-clickable': true, 'selected-folder': selectedFolder == 'favorites' }">Favoritos</li>

            <div class="scrollable" style="max-height: 35%; overflow-y: auto;">
              <div v-for="folder in folders" :key="folder._id" style="word-wrap: break-word;">
                <li @click="selectItem(folder, true)"
                  :class="{ 'li-clickable': true, 'selected-folder': selectedFolder === folder.name }"> {{ folder.name
                  }}
                </li>
              </div>
            </div>

          </ul>
          <ul style="height: 5%;">
            <li style="text-align: right;"> <button style="margin-right: 5%;" @click="logout"><span
                  class="material-symbols-outlined">logout</span></button> </li>
          </ul>
        </div>


        <!-- Modal de nuevo item -->
        <Modal class="modal" :isOpen="isNewItemModalOpened" @modal-close="closeNewItemModal" name="item-modal">
          <template #header><strong>Crear {{ translateItemType(newItem.itemType) }}</strong></template>
          <template #footer>

            <div style="margin-top: 20px">
              <div class="error" v-if="errorMessage.length !== 0">
                <p style="margin-top: 5px; margin-bottom: 5px;" v-for="error in errorMessage">{{ error }}</p>
              </div>
              <input type="text" v-model="newItem.name" placeholder="Nombre de item..." class="text-input"
                style="margin-bottom: 5px;" />
              <textarea v-if="newItem.itemType == 'Note'" v-model="newItem.text" placeholder="Contenido..."
                class="text-input textarea-input"></textarea>
              <textarea v-if="newItem.itemType == 'Notice'" v-model="newItem.text" placeholder="Contenido..."
                maxlength="1000" class="text-input textarea-input"></textarea>
              <div v-if="newItem.itemType == 'Notice'"
                style="display: flex; justify-content: center; align-items: center;">
                Prioritario: <input type="checkbox" v-model="newItem.important"
                  style="border-radius: 5px; margin: 12px; margin-top: 15px ; transform: scale(1.5);"></input>
              </div>

              <div v-if="newItem.itemType == 'Timer'"
                style="display: inline-flex; vertical-align: middle; align-items: center; justify-content: center;">
                <input v-model="hours" type="number" min="0" placeholder="Hor" class="timer-input"
                  style="border-top-left-radius: 5px; border-bottom-left-radius: 5px;" />
                :<input v-model="minutes" type="number" min="0" placeholder="Min" class="timer-input" />
                :<input v-model="seconds" type="number" min="0" placeholder="Seg" class="timer-input"
                  style="border-top-right-radius: 5px; border-bottom-right-radius: 5px;" />
              </div>
            </div>
            <button @click="handleNewItemForm()" style="margin-top:15px">Crear</button>
          </template>
        </Modal>

        <!-- Sidebar de detalles -->
        <div class="sidebar-overlay" v-if="showSidebar && selectedItem.itemType !== 'Folder'" @click="closeSidebar">
        </div>
        <div class="sidebar" :class="{ 'show': showSidebar }">
          <ul>
            <li style="margin-bottom: 2px;"> Archivo: </li>
            <li style="margin-top: 2px;"> {{ selectedItem?.name }}</li>
            <li style="margin-bottom: 2px;">Autor: {{ author?.username }}</li>
            <li style="margin-top: 2px;"> ({{ author?.email }})</li>
            <li>Fecha de subida: {{ formatDate(selectedItem?.uploadDate) }}</li>
            <li>Última modificación: {{ formatDate(selectedItem?.modifiedDate) }}</li>

            <li style="display: inline-flex; justify-content: space-around; width: 90%;">
              <button v-if="['Owner', 'Admin'].includes(selectedItemPerms)" @click="openModal"><span
                  class="material-symbols-outlined">groups</span></button>
              <button class="downloadButton"
                v-if="['Owner', 'Admin', 'Write', 'Read'].includes(selectedItemPerms) && selectedItem?.itemType === 'File'"
                @click="downloadFile"><span class="material-symbols-outlined">download</span></button>
              <button @click="toggleLike(selectedItem)">
                <span v-if="!currentUser?.favorites?.includes(selectedItem?._id)"
                  class="material-symbols-outlined">favorite</span>
                <span v-else class="material-symbols-outlined filled-heart">favorite</span>
              </button>
              <button v-if="['Owner', 'Admin'].includes(selectedItemPerms)" @click="deleteItem(selectedItem)"><span
                  class="material-symbols-outlined">delete</span></button>
            </li>
          </ul>
        </div>
      </div>

      <!-- Modal de permisos -->
      <Modal class="modal" :isOpen="isModalOpened" @modal-close="closeModal" name="first-modal">
        <template #header><strong>Compartir archivo</strong></template>
        <template #content>
          <div style="margin-top:20px">
            <div class="error" v-if="errorMessage.length !== 0">
              <p style="margin-top: 5px; margin-bottom: 5px;" v-for="error in errorMessage">{{ error }}</p>
            </div>

            <p>Compartir con:</p>

            <div
              style="display: inline-flex; width: 90%; align-items: center; justify-content: space-between; margin-bottom: 15px">
              <input v-model="searchProfileTerm" placeholder="Buscar perfil por nombre..." class="text-input"
                style="width: 70%;" />
              <select v-model="searchTypeProfile" class="text-input" style="width: 25%;">
                <option value="Individual">Individual</option>
                <option value="Group">Grupo</option>
                <option value="All">Todos</option>
              </select>
            </div>

            <div v-for="profile in getFilteredProfiles" :key="profile._id">
              <div
                style="display: inline-flex; width: 90%; height: 40px; align-items: center; justify-content: space-between;">
                <p style="margin-right: 10px;">{{ profile.profileType == 'Individual' ? profile.users[0].username :
                  profile.name }}</p>
                {{ checkDictUserItemPerms(profile._id) }}
                <select v-model="userItemPerms[profile._id]"
                  @change="changePerms(userItemPerms[profile._id], profile._id)" class="text-input" style="width: 25%;">
                  <option :selected="!(profile._id in userItemPerms)" value='None'>Ninguno</option>
                  <option value="Read">Lectura</option>
                  <option value="Write">Escritura</option>
                </select>
              </div>
            </div>
          </div>
        </template>
        <template #footer></template>
      </Modal>
    </div>
  </div>
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

.text-input {
  border-radius: 5px;
  margin-bottom: 5px;
  height: 30px;
  width: 90%;
  background-color: #f2f2f2;
  color: black;
}

.textarea-input {
  margin-top: 5px;
  height: 200px;
  resize: none;
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
  width: 300px;
  height: 100vh;
  height: 100%;
  background-color: #2F184B;
  transition: right 0.3s ease;
}

.sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 999;
  display: none;
}

.sidebar.show+.sidebar-overlay {
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

.sidebar {
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
}

.sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 999;
  display: none;
}

.sidebar.show+.sidebar-overlay {
  display: block;
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

.main-sidebar.show+.main-sidebar-overlay {
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
  width: 90%;
  height: auto;
  background-color: rgb(151, 47, 47);
  border-radius: 10px;
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

.dropdown {
  position: relative;
  display: inline-block;
  color: black;
}

.dropdown-content {
  display: none;
  position: absolute;
  background-color: #f9f9f9;
  min-width: 160px;
  box-shadow: 0px 8px 16px 0px rgba(0, 0, 0, 0.2);
  padding: 12px 16px;
  z-index: 1;
}

.dropdown-content div {
  display: block;
  padding: 5px;
  cursor: pointer;
}

.dropdown:hover .dropdown-content {
  display: block;
}

.scrollable {
  scrollbar-color: #C8B1E4 transparent;
  scroll-behavior: smooth;
}
</style>