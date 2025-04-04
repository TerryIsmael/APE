<script setup>
import { ref, onMounted, onUnmounted, onBeforeMount, watch, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import Timer from './Timer.vue';
import WorkspaceUtils from '../utils/WorkspaceFunctions.js';
import Utils from '../utils/UtilsFunctions.js';
import Calendar from './calendar.vue';
import File from './file.vue';
import MainSidebar from './mainSidebar.vue';
const props = defineProps({
  ws: {
    type: Object,
    required: true
  },
});

const loading = ref(true);
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
const routedItemPerm = ref(null);
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
const editing = ref(false);

const titleText = ref('');
const noteText = ref('');

const selectedFolderPerms = ref(null);

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
  await WorkspaceUtils.fetchWorkspace(workspace, path, currentPath, currentUser, items, folders, selectedFolder, existFolder, userWsPerms, router, errorMessage);
  loading.value = false;
};

const formatDate = (date) => {
  return Utils.formatDate(date);
};

const selectItem = async (item, direct) => {
  await WorkspaceUtils.selectItem(item, direct, selectedFolder, router, selectedItem, showSidebar, selectedItemPerms, workspace, currentUser, author, userItemPerms, errorMessage);
};

const toggleLike = async (item) => {
  await WorkspaceUtils.toggleLike(item, workspace, router, currentUser, path, items, folders, errorMessage);
};

const translateItemType = (item) => {
  return Utils.translateItemType(item);
};

const deleteItem = async (item) => {
  await WorkspaceUtils.deleteItem(item, selectedItem, author, workspace, path, currentPath, currentUser, items, folders, selectedFolder, existFolder, userWsPerms, router, showSidebar, errorMessage);
};

const selectImage = (item) => {
  return Utils.selectImage(item);
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

const navigateToPreviousFolder = () => {
  WorkspaceUtils.navigateToPreviousFolder(path, router);
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

const showFolderDetails = async () => {
  await WorkspaceUtils.showFolderDetails(selectedItem, folders, selectedFolder, selectedItemPerms, showSidebar, author, router, workspace, currentUser, errorMessage);
};

const changePerms = async (perm, profileId) => {
  await WorkspaceUtils.changePerms(perm, profileId, selectedItem, workspace, path, currentPath, currentUser, items, folders, selectedFolder, existFolder, userWsPerms, router, errorMessage);
};

const verifyPerms = (item) => {
  return WorkspaceUtils.verifyPerms(item, workspace, currentUser);
};

const getFilteredProfiles = computed(() => {
  const fileOwnerProfile = selectedItem.value.profilePerms.find(profilePerm => profilePerm.permission === 'Owner').profile;
  const ownProfile = workspace.value.profiles.find(profile => profile.users.find(user => user._id === currentUser.value._id));
  const ownerProfile = workspace.value.profiles.find(profile => profile.wsPerm === 'Owner');
  const profiles = workspace.value.profiles.filter(profile => {
    const name = profile.profileType === 'Individual' ? profile.users[0].username : profile.name;
    const matchesSearchTerm = searchProfileTerm.value.trim() === '' || name.toLowerCase().includes(searchProfileTerm.value.toLowerCase().trim());
    const isNotOwner = profile._id !== ownerProfile._id && profile._id !== fileOwnerProfile._id;
    const isNotOwnProfile = profile._id !== ownProfile._id;

    return searchTypeProfile.value === 'All' ? (matchesSearchTerm && isNotOwner && isNotOwnProfile) : (matchesSearchTerm && isNotOwner && profile.profileType === searchTypeProfile.value && isNotOwnProfile);
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

const selectUploadFile = () => {
  errorMessage.value = [];
  fileInput.value.click();
};

const uploadFile = async (event) => {
  await WorkspaceUtils.uploadFile(event, workspace, path, currentPath, currentUser, items, folders, selectedFolder, existFolder, userWsPerms, router, errorMessage, fileInput);
};

const checkDictUserItemPerms = (profileId) => {
  if (!userItemPerms.value[profileId]) {
    userItemPerms.value[profileId] = 'None';
  }
};

const handleRightClick = (event, item) => {
  selectItem(item, false);
};

const openEditNameModal= () => {
  WorkspaceUtils.openEditNameModal(editItem, selectedItem, isEditNameModalOpened, errorMessage);
};

const closeEditNameModal = () => {
  WorkspaceUtils.closeEditNameModal(isEditNameModalOpened, editItem, errorMessage)
};

const modifyItem = async (item, changeName) => {
  await WorkspaceUtils.modifyItem(item, changeName, selectedItem, workspace, path, currentPath, currentUser, items, folders, selectedFolder, existFolder, userWsPerms, router, errorMessage);
  if (errorMessage.value.length === 0 && isEditNameModalOpened.value) {
    closeEditNameModal();
  }
  if (errorMessage.value.length === 0 && editing.value) {
    editing.value = false;
  }
};

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
    item.path = (folder.path?(folder.path + "/"):"")+ folder.name;
    await modifyItem(item);
  }
};

const getItemBindings = (item, index) => {
  let bindings = {};
  if (index === 0){
    bindings = {
      onDrop: (event) => onDrop(event, item, true),
      onDragover: (event) => event.preventDefault(),
      onDragenter: (event) => event.preventDefault()
    };
  } else if (!index) {
    const perm = WorkspaceUtils.verifyPerms(item, workspace, currentUser);
    if(perm && perm !== 'Read') {
      bindings = {
        draggable: true,
        dragstart: (event) => startDrag(event, item)
      }
      if (item.itemType === 'Folder') {
        bindings = {
          ...bindings,
          onDrop: (event) => onDrop(event, item),
          onDragover: (event) => event.preventDefault(),
          onDragenter: (event) => event.preventDefault()
        };
      }
    }
  } 
  return bindings;
};

const initPath = () => {
  routedItem.value = null;
  path.value = route.params.path ? JSON.stringify(route.params.path).replace("[", '').replace("]", '').replace(/"/g, '').split(',').join('/') : '';
  const pathArray = path.value.split('/');
  if (pathArray[pathArray.length - 2] == "i") {
    routedItem.value = null;
    workspace.value.items.forEach(item => {
      if (item._id == pathArray[pathArray.length - 1] && item.path == pathArray.slice(0, pathArray.length - 2).join('/')) {
        routedItem.value = item;
        routedItemPerm.value = verifyPerms(item);
        path.value = pathArray.slice(0, pathArray.length - 2).join('/');
        showMainSidebar.value = false;
        if (routedItem.value.itemType !== 'Note' || !['Write', 'Owner', 'Admin'].includes(routedItemPerm.value) ) {
          editing.value = false;
        }
      }
    });
    if (!routedItem.value) {
      routedItem.value = 'Not found';
      editing.value = false;
    }
  } 
  showSidebar.value = false;
};

const openFormEditNote = () => {
  editing.value = true;
  titleText.value = {...routedItem.value}.name;
  noteText.value = {...routedItem.value}.text;
};

const saveNote = async () => {
  routedItem.value.name = titleText.value;
  routedItem.value.text = noteText.value;
  await modifyItem(routedItem.value);
};

const openWsModal = async () => {
  await Utils.openWsModal(isWsModalOpened, workspaces, isLeaving, router, errorMessage);
};

const closeWsModal = () => {
  Utils.closeWsModal(isWsModalOpened, workspaces, errorMessage);
};

const fetchUserWorkspaces = async () => {
  await Utils.fetchUserWorkspaces(workspaces, router, errorMessage);
};

const leaveWorkspace = async (workspaceId) => {
  await Utils.leaveWorkspace(workspaceId, isWsModalOpened, workspaces, workspace, path, currentPath, currentUser, items, folders, selectedFolder, existFolder, userWsPerms, router, errorMessage);
};

const redirectToWorkspace = async(workspaceId) => {
  await Utils.redirectToWorkspace(workspaceId, router, workspace, path, currentPath, currentUser, items, folders, selectedFolder, existFolder, userWsPerms, errorMessage, isWsModalOpened, workspaces, showMainSidebar, ws);
  initPath();
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
    showMainSidebar.value = false;
  }
};

const getFolderPermission = () => {
  const folderArray = path.value.split('/');
  const f = folderArray.pop();
  const p = folderArray.join('/');
  if (f) {
    selectedFolderPerms.value = WorkspaceUtils.verifyPerms(workspace.value.items.find(folder => folder.name === f && folder.path === p), workspace, currentUser)
  } else {
    selectedFolderPerms.value = null;
  }
};

const canSeeWriteButtons = () => {
  return ['Owner', 'Admin'].includes(userWsPerms.value) || (path.value === '' && userWsPerms.value === 'Write') || (selectedFolderPerms.value && (selectedFolderPerms.value === 'Write' || selectedFolderPerms.value === 'Owner'));
};

const websocketEventAdd = () => {
  props.ws.addEventListener('message', async (event) => {
    const jsonEvent = JSON.parse(event.data);
    if (jsonEvent.type === 'workspaceUpdated') {
      await fetchWorkspace();
      initPath();
    }
    if (jsonEvent.type === 'profileDeleted' || jsonEvent.type === 'addedToWorkspace' ){
      await fetchUserWorkspaces();
    }
    if ((jsonEvent.type === 'profileDeleted' && jsonEvent.wsAffected === workspace.value._id.toString()) || jsonEvent.type === 'workspaceDeleted') {
      localStorage.removeItem('workspace');
      await fetchWorkspace();
      initPath();
    }
  });
};

onBeforeMount(async () => {
  path.value = route.params.path ? JSON.stringify(route.params.path).replace("[", '').replace("]", '').replace(/"/g, '').split(',').join('/') : '';
  ws.value = props.ws;
  await fetchUser();
  await fetchWorkspace();
  initPath();
  ws.value.send(JSON.stringify({ type: 'workspaceIdentification', userId: currentUser.value?._id, workspaceId: workspace.value._id }));
  websocketEventAdd();
  getFolderPermission();
});

onMounted( async () => {
  selectedFolder.value = path.value;
  workspaceId.value = localStorage.getItem('workspace');
  document.addEventListener('click', closeSidebar);
});

onUnmounted(() => {
  ws.value.removeEventListener('open', websocketEventAdd);
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
    getFolderPermission();
  }
);

watch(
  () => minutes.value,
  (newVal) => {
    if (newVal > 59) {
      minutes.value = 59;
    }
  }
);

watch(
  () => seconds.value,
  (newVal) => {
    if (newVal > 59) {
      seconds.value = 59;
    }
  }
);
</script>

<template>
  <div v-if="loading">
    <img :src="'/loading.gif'" alt="item.name" width="100" height="100"/>
  </div>
  <div v-else style="height: 100%;">
    <Timer v-if="routedItem && routedItem !='Not found' && routedItem.itemType == 'Timer'" :item="routedItem" :ws="ws" :workspace="workspace" :path="path" :currentUser="currentUser"></Timer>
    <Calendar v-if="routedItem && routedItem !='Not found' && routedItem.itemType == 'Calendar'" :item="routedItem" :ws="ws" :workspace="workspace" :path="path" :currentUser="currentUser"></Calendar>
    <File v-if="routedItem && routedItem !='Not found' && routedItem.itemType == 'File'" :item="routedItem" :ws="ws" :workspace="workspace" :routedItemPerm="routedItemPerm"></File>
    <div v-if="routedItem && routedItem !='Not found' && routedItem.itemType == 'Note'" style="display:flex; flex-direction:column; align-items: center;">
      <div :class="{ 'main-sidebar-toggle': true, 'main-sidebar-toggle-opened': showMainSidebar }">
        <span v-if="!showMainSidebar" @click="showMainSidebar = true" class="material-symbols-outlined"
          style="z-index: 1002">chevron_right</span>
        <span v-else @click="showMainSidebar = false" class="material-symbols-outlined"
          style="z-index: 1002">chevron_left</span>
      </div>
      <div class="main-content" style="display: flex; justify-content: center; align-items: center; word-wrap: break-word; justify-content: space-between; width: 82%;">
        <div style="display: flex; justify-content: start; width: 10vw;">
          <button @click="navigateToPreviousFolder()"><span class="material-symbols-outlined">arrow_back</span></button>
        </div>
        
        <h1 @click="$router.push('/workspace/')" style="cursor: pointer; display: flex; align-items: center; margin-right: 10px; justify-content: center; width: 80%;">
          <span style="color: #C8B1E4; font-size: 60px; width: 5%; padding-right: 1%;" class="material-symbols-outlined">home</span>
          <span class="item-name-title">{{ workspace?.name }}</span> 
        </h1>

        <div style="display: flex; justify-content: end; width: 10vw;" >
          <button @click="openFormEditNote" v-if="!editing && routedItemPerm && routedItemPerm !== 'Read'">Editar</button>
        </div>
      </div>

      <div class="main-content" style="display: flex; flex-direction: column; justify-content: center; align-items: center; width: 80vw; margin-bottom: 3%">

        <div class="error" v-if="errorMessage.length !== 0 && !isModalOpened && !isNewWsModalOpened && !isNewItemModalOpened && !isEditNameModalOpened" style="display: flex; justify-content: space-between; padding-left: 2%;">
          <div>
            <p v-for="error in errorMessage" :key="error" style="margin-top: 5px; margin-bottom: 5px; text-align: center; position: relative;">
              {{ error }}
            </p>
          </div>
          <button @click="clearErrorMessage()" style="display: flex; align-items: top; padding: 0; padding-left: 5px; padding-top: 10px; background: none; border: none; cursor: pointer; color: #f2f2f2; outline: none;">
            <span style="font-size: 20px; "class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="notebook" style="color: black; width: 80%; margin-top: 10px; margin-bottom: 20px; padding: 20px; border: 1px solid #C8B1E4; border-radius: 0 0 10px 10px;" v-if="!editing">
          <h1>{{ routedItem.name }}</h1>
          <p>{{ routedItem.text }}</p>
        </div>
        <div class="notebook" style="color:black; width: 80%; height: 90vh; margin-top: 10px; margin-bottom: 20px; padding: 20px; padding-bottom: 10px; border: 1px solid #C8B1E4; border-radius: 0 0 10px 10px;" v-else>
          <textarea v-model="titleText" maxlength="330" style="height: 10vh; color:black; text-align: center; margin-top: 20px; margin-bottom:30px; width: 100%; font-size: 2vh; font-weight: bolder; resize: none; border: none; background-color: transparent; font-size: 3.2em; line-height: 1.1;"></textarea>
          <textarea v-model="noteText" style="color:black; width: 100%; height: 70%; font-size: 2vh; resize: none; border: none; background-color: transparent;"></textarea>
          <div style="margin: 5px; height: 5%;">
            <button style="margin-right: 5px;" @click="saveNote">Guardar</button>
            <button style="margin-left: 5px; background-color: #c55e5e" @click="editing=!editing">Cancelar</button>
          </div>
        </div>
      </div>

    </div>
    <div v-if="routedItem == 'Not found'">
      <div class="main-content" style="display: flex; justify-content: center; align-items: center; word-wrap: break-word;">
        <h1 @click="$router.push('/workspace/')" style="cursor: pointer; display: flex; align-items: center; margin-right: 10px">
          <span style="color: #C8B1E4; font-size: 60px;" class="material-symbols-outlined">home</span>
          {{ workspace?.name }}
        </h1>
      </div>
      <h2>No se encuentra el item. Puede que haya sido movido o eliminado, o que se te hayan revocado los permisos.</h2>
    </div>

    <div v-if="!routedItem">
      <div class="main-content" style="display: flex; justify-content: center; align-items: center; word-wrap: break-word; line-break: anywhere;">
        <h1 @click="$router.push('/workspace/')" style="cursor: pointer; display: flex; align-items: center; margin-right: 10px;">
          <span style="color: #C8B1E4; font-size: 60px;" class="material-symbols-outlined">home</span>
          {{ workspace?.name }}
        </h1>
      </div>

      <div class="main-content" style="display:flex; flex-direction: column; align-items: center;">

        <div style="display: flex; justify-content: space-around; width: 87%; align-items: center;">
          <div style="display: flex; justify-content: flex-start; align-items: center; width: 85%">
            <button v-if="path !== ''" style="max-height: 50px;" @click="navigateToPreviousFolder()"><span class="material-symbols-outlined">arrow_back</span></button>
            <div style="display:flex; width: 85%; justify-content: start; text-align: left; white-space: nowrap; margin-left: 1%;">
              <h2 style="margin-right: 1%">Ruta actual:</h2>
              <h2 v-if="currentPath.split('/')[0] === '...'">...</h2>
              <h2 class="ellipsis" v-for="(folder, index) in currentPath.split('/').slice(1)" :key="index" v-bind="getItemBindings({}, index)">/{{ folder }}</h2>
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; width: 15%;">
            <button v-if="currentPath !== '/'" style="margin-right: 10px; max-height: 50px;" @click="showFolderDetails()">
              <span class="material-symbols-outlined">info</span>
            </button>
            <button v-if="canSeeWriteButtons()" style="margin-right: 10px; max-height: 50px;" @click="openNewItemModal('Folder')">
              <span class="material-symbols-outlined">create_new_folder</span>
            </button>
            <div v-if="canSeeWriteButtons()" class="dropdown">
              <button style="max-height: 50px;" @click="openDropdown">
                <span class="material-symbols-outlined">add</span>
              </button>
              <div style="z-index: 1002;" class="dropdown-content">
                <div @click="openNewItemModal('Calendar')">Calendario</div>
                <div @click="openNewItemModal('Timer')">Temporizador</div>
                <div @click="openNewItemModal('Note')">Nota</div>
                <input type="file" ref="fileInput" style="display: none" @change="uploadFile">
                <div @click="selectUploadFile" value="File">Archivo</div>
              </div>
            </div>
          </div>
        </div>
        <div class="main-content container">
          <p v-if="!existFolder" style="font-size: xx-large; font-weight: bolder;">No existe este directorio o no tienes permisos para acceder</p>
          <div v-if="existFolder && items.length === 0">
            <p style="font-size: xx-large; font-weight: bolder;">Aún no hay items...</p>
          </div>

          <div v-else>
            <div class="error" v-if="errorMessage.length !== 0 && !isModalOpened && !isNewWsModalOpened && !isNewItemModalOpened && !isEditNameModalOpened" style="display: flex; justify-content: space-between; padding-left: 2%;">
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
              <div class="item-container" v-for="item in items" :key="item.id" @click="selectItem(item, true)"
                 @contextmenu.prevent="handleRightClick(event, item)" v-bind="getItemBindings(item)" @dragstart="startDrag($event, item)">
                <div>
                  <div v-if="currentUser?.favorites?.includes(item._id)">
                    <img class="item-img" style="" :src="selectImage(item)" alt="item.name" width="100" height="100">
                    <span v-if="currentUser?.favorites?.includes(item._id)"
                      class="material-symbols-outlined filled-heart absolute-heart">favorite</span>
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
        </div>
      </div>
    </div>
  </div>
  
  <!-- Main sidebar -->
  <MainSidebar :currentUser="currentUser" :workspace="workspace" :folders="folders" :selectedFolder="selectedFolder" :userWsPerms="userWsPerms" 
  :isWsModalOpened="isWsModalOpened" :errorMessage="errorMessage" :isLeaving="isLeaving" :workspaces="workspaces" :isNewWsModalOpened="isNewWsModalOpened"
  @selectItem="selectItem" @openNewItemModal="openNewItemModal" @openWsModal="openWsModal"  @toggleLeave="toggleLeave" @openNewWsModal="openNewWsModal" @leaveWorkspace="leaveWorkspace"
  @redirectToWorkspace="redirectToWorkspace" @closeWsModal="closeWsModal" @closeNewWsModal="closeNewWsModal" @createWorkspace="createWorkspace"></MainSidebar>
  
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
            :<input v-model="seconds" type="number" min="0" placeholder="Seg" class="timer-input" style="border-top-right-radius: 5px; border-bottom-right-radius: 5px;" />
          </div>
      </div>
      <button @click="handleNewItemForm()" style="margin-top:15px">Crear</button>
    </template>
  </Modal>

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
          <button @click="modifyItem(editItem, true)" style="margin-top: 15px">Actualizar</button>
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
  text-align: left;
  max-width: 70%;
  margin-right: 10px;
  word-wrap: break-word; 
  display: -webkit-box; 
  -webkit-line-clamp: 1;
  line-clamp: 1;
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
  word-wrap: break-word;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
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
  line-clamp: 10;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 270px;
}

.email {
  -webkit-line-clamp: 5;
  line-clamp: 5;
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

.notebook {
  padding: 20px;
  margin: 50px auto;
  background: white;
  border: 1px solid #ccc;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  position: relative;
}

.notebook:before {
  content: "";
  position: absolute;
  top: 0;
  left: 50%;
  width: 100%;
  height: 30px;
  background: repeating-linear-gradient(to right,
      #f1f1f1,
      #f1f1f1 10px,
      #fff 10px,
      #fff 20px);
  transform: translateX(-50%);
  border-bottom: 1px solid #ccc;
}

.notebook:after {
  content: "";
  position: absolute;
  top: 0;
  left: 50%;
  width: 100%;
  height: 30px;
  background: white;
  transform: translateX(-50%);
  border-bottom: 1px solid #ccc;
  clip-path: polygon(0 0, 100% 0, 100% 50%, 0 50%);
}

.notebook h1 {
  margin-top: 20px;
  text-align: center;
  padding-bottom: 10px;
  margin-bottom: 30px;
  word-wrap: break-word; 
  display: -webkit-box; 
  -webkit-line-clamp: 10;
  line-clamp: 10; 
  -webkit-box-orient: vertical; 
  overflow: hidden;
}

.notebook p {
  line-height: 1.5;
  white-space: pre-line; 
  font-size: 2vh;
  word-wrap: break-word;
}

.red-button {
  background-color: #c55e5e; 
}

.ellipsis {
  display: inline-block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-name-title {
    display: -webkit-box;
    -webkit-line-clamp: 1;
    line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
    padding-bottom: 10px;
    width: 90%;
    margin-right: 5px;
    padding-left: 1%;
}

</style>