<script setup>
import { ref, onBeforeMount, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import Utils from '../utils/UtilsFunctions.js';
import NoticeUtils from '../utils/NoticeFunctions.js';
import WorkspaceUtils from '../utils/WorkspaceFunctions.js';
import MainSidebar from './mainSidebar.vue';

const props = defineProps({
  ws: {
    type: Object,
    required: true
  },
});

const router = useRouter();
const route = useRoute();
const path = ref('');

const currentUser = ref(null);
const userWsPerms = ref(null);
const wsId = ref(null);
const workspace = ref(null);
const showMainSidebar = ref(false);
const isNewItemModalOpened = ref(false);
const newItem = ref({});

const isModalOpened = ref(false);
const searchProfileTerm = ref('');
const searchTypeProfile = ref('All');
const errorMessage = ref([]);
const selectedItem = ref(null);
const selectedItemPerms = ref(null);
const userItemPerms = ref(null);
const loading = ref(true);

const currentPath = ref('');
const items = ref([]);
const folders = ref([]);
const selectedFolder = ref('notices');
const existFolder = ref(false);

const workspaces = ref([]);
const isWsModalOpened = ref(false);
const isLeaving = ref(false);
const isNewWsModalOpened = ref(false);
const ws = ref(null);

const editItem = ref({});
const isEditNameModalOpened = ref(false); 

const fetchUser = async () => {
  await Utils.fetchUser(currentUser, router);
};

const fetchNotices = async () => {  
  await NoticeUtils.fetchNotices(wsId, workspace, router, userWsPerms, currentUser, errorMessage);
};

const verifyNoticePerms = (item) => {
  return NoticeUtils.verifyNoticePerms(item, userWsPerms, workspace, currentUser);
};

const selectItem = async (item) => {
  await NoticeUtils.selectItem(item, router, userWsPerms, workspace, currentUser, selectedItem, selectedItemPerms, userItemPerms);
};

const openNewItemModal = (itemType) => {
  NoticeUtils.openNewItemModal(itemType, isNewItemModalOpened, newItem, errorMessage);
};

const closeNewItemModal = () => {
  NoticeUtils.closeNewItemModal(isNewItemModalOpened, newItem, errorMessage);
};

const handleNewItemForm = async () => {
  await NoticeUtils.handleNewItemForm(newItem, workspace, router, wsId, userWsPerms, currentUser, isNewItemModalOpened, errorMessage);
};

const translateItemType = (item) => {
  return Utils.translateItemType(item);
};

const formatDate = (date) => {
  return Utils.formatDate(date);
};

const deleteItem = async (itemId) => {
  await NoticeUtils.deleteItem(itemId, workspace, router, wsId, userWsPerms, currentUser, errorMessage);
};

const openModal = () => {
  Utils.openModal(isModalOpened, errorMessage);
};

const closeModal = () => {
  Utils.closeModal(isModalOpened, errorMessage);
};

const getFilteredProfiles = computed(() => {
  const ownerProfile = selectedItem.value.profilePerms?.find(profilePerm => profilePerm.permission === 'Owner').profile;
  const ownProfile = workspace.value.profiles.find(profile => profile.users.find(user => user._id === currentUser.value._id));

  const profiles = workspace.value.profiles.filter(profile => {
    const name = profile.profileType === 'Individual' ? profile.users[0].username : profile.name;
    const matchesSearchTerm = searchProfileTerm.value.trim() === '' || name.toLowerCase().includes(searchProfileTerm.value.toLowerCase().trim());
    const isNotOwner = profile._id !== ownerProfile;
    const isNotOwnProfile = profile._id !== ownProfile._id;

    return searchTypeProfile.value === 'All' ? (matchesSearchTerm && isNotOwner && isNotOwnProfile) : (matchesSearchTerm && isNotOwner && profile.profileType === searchTypeProfile.value && isNotOwnProfile);
  });

  const orderedProfiles = [];
  const inProfilePerms = profiles.filter(profile => selectedItem.value.profilePerms.find(profilePerm => profilePerm.profile === profile._id));
  const notInProfilePerms = profiles.filter(profile => !selectedItem.value.profilePerms.find(profilePerm => profilePerm.profile === profile._id));
  orderedProfiles.push(...inProfilePerms);
  orderedProfiles.push(...notInProfilePerms);
  return orderedProfiles; 
});

const changePerms = async (perm, profileId) => {
  await NoticeUtils.changePerms(perm, profileId, workspace, selectedItem, wsId, router, userWsPerms, currentUser, errorMessage);
};

const checkDictUserItemPerms = (profileId) => {
  if (!userItemPerms.value[profileId]) {
    userItemPerms.value[profileId] = 'None';
  }
};

const toggleDictPerm = (profileId) => {
  const perm = userItemPerms.value[profileId];
  if (perm == 'None') {
    userItemPerms.value[profileId] = 'Read';
  } else {
    userItemPerms.value[profileId] = 'None';
  }
};

const updatePermission = async (profileId, newPerm) => {
  toggleDictPerm(profileId);
  await changePerms(newPerm, profileId);
};

const handleSelectItem = async (item) => {
  await selectItem(item);
  openModal();
};

const clearErrorMessage = () => {
  Utils.clearErrorMessage(errorMessage);
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

const openEditNameModal = (item) => {
  selectedItem.value = item;
  WorkspaceUtils.openEditNameModal(editItem, selectedItem, isEditNameModalOpened, errorMessage);
};

const closeEditNameModal = () => {
  WorkspaceUtils.closeEditNameModal(isEditNameModalOpened, editItem, errorMessage)
};

const modifyItem = async (item) => {
  await NoticeUtils.modifyItem(item, wsId, workspace, currentUser, userWsPerms, router, errorMessage);
  if (errorMessage.value.length === 0) {
    closeEditNameModal();
  }
};

const websocketEventAdd = () => {
  props.ws.addEventListener('message', async (event) => {
    const jsonEvent = await JSON.parse(event.data);
    if (jsonEvent.type === 'workspaceUpdated') {
      await fetchUser();
      await fetchNotices();
    }
    if ((jsonEvent.type === 'profileDeleted' && jsonEvent.wsAffected === workspace.value._id.toString()) || jsonEvent.type === 'workspaceDeleted') {
      localStorage.removeItem('workspace');
      await router.push('/workspace');
    }
  });
};

onBeforeMount(async () => {
  path.value = "/" + route.name;
  wsId.value = localStorage.getItem('workspace');
  await fetchUser();
  await fetchNotices();
  websocketEventAdd();
  loading.value = false;
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

      <div style="display: flex; justify-content: space-around; width: 92%; align-items: center;">
        <div style="flex: 1; display: flex; justify-content: flex-start; align-items: center; width: 85%">
          <button v-if="path !== ''" style=" max-height: 50px;" @click="$router.push('/workspace')"><span class="material-symbols-outlined">arrow_back</span></button>
          <h2 style="text-align: left; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-left: 1%;"> Ruta actual: {{ path }}</h2>
        </div>

        <div v-if="['Owner', 'Admin', 'Write'].includes(userWsPerms)" style="display: flex; justify-content: flex-end; width: 15%;">
          <button @click="openNewItemModal('Notice')" style="max-height: 50px;">
            <span class="material-symbols-outlined">add</span>
          </button>
        </div>
      </div>
      
      <div class="main-content container">
        <div v-if="workspace?.notices?.length === 0">
          <p style="font-size: xx-large; font-weight: bolder;">Aún no hay anuncios...</p>
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
            <div class="item-container" v-for="item in workspace?.notices" :key="item.id">
              <div style="display: flex; align-items: center;">
                <h2 class="item-name"> {{ item?.notice?.name }}</h2>
                <span v-if="item?.notice?.important" style="vertical-align: middle;" :class="{'material-symbols-outlined': true, 'important-icon': true, 'important-icon-left': ['Owner', 'Admin'].includes(verifyNoticePerms(item?.notice))}">campaign</span>
                <span v-if="item && ['Owner', 'Admin'].includes(verifyNoticePerms(item?.notice))" class="delete-icon material-symbols-outlined" @click="deleteItem(item?.notice?._id)">delete</span>
                <span v-if="item && ['Owner', 'Admin'].includes(verifyNoticePerms(item?.notice))" class="group-icon material-symbols-outlined" @click="() => handleSelectItem(item?.notice)"><span class="material-symbols-outlined">groups</span></span>
                <span v-if="item && ['Owner', 'Admin'].includes(verifyNoticePerms(item?.notice))" class="material-symbols-outlined group-icon edit-icon-left" @click="openEditNameModal(item?.notice)"><span class="material-symbols-outlined">edit</span></span>
              </div>

              <h4 class="item-name" style="color: #525252">
                Subido por {{ item.owner?.username }} ({{ item.owner?.email }}) el {{ formatDate(item?.notice?.modifiedDate) }}
              </h4>
              <hr>          
              <p class="text-container">{{ item?.notice?.text }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Main sidebar -->
  <MainSidebar :currentUser="currentUser" :workspace="workspace" :folders="workspace?.folders" :selectedFolder="selectedFolder" :userWsPerms="userWsPerms" 
  :isWsModalOpened="isWsModalOpened" :errorMessage="errorMessage" :isLeaving="isLeaving" :workspaces="workspaces" :isNewWsModalOpened="isNewWsModalOpened"
  @selectItem="selectItem" @openWsModal="openWsModal" @toggleLeave="toggleLeave" @openNewWsModal="openNewWsModal" @leaveWorkspace="leaveWorkspace"
  @redirectToWorkspace="redirectToWorkspace" @closeWsModal="closeWsModal" @closeNewWsModal="closeNewWsModal" @createWorkspace="createWorkspace"></MainSidebar>
  
  <!-- Modal de edit item --> 
  <Modal class="modal" :isOpen="isEditNameModalOpened" @modal-close="closeEditNameModal" name="edit-item-modal">
    <template #header><strong>Modificar anuncio</strong></template>
    <template #content>
      <div class="error" v-if="errorMessage.length !== 0" style="padding-left: 5%; padding-right: 5%; margin-top: 10px;">
          <p style="margin-top: 5px; margin-bottom: 5px; text-align: center" v-for="error in errorMessage">{{ error }}</p>
      </div>

      <div style="margin-top: 20px">              
        <input type="text" v-model="editItem.name" maxlength="330" placeholder="Nombre de item..." class="text-input" style="margin-bottom: 5px;"/>
        <textarea v-model="editItem.text" placeholder="Contenido..." maxlength="1000" class="text-input textarea-input"></textarea>
          <div style="display:flex; justify-content: center; align-items: center">
            Prioritario: <input type="checkbox" v-model="editItem.important" style="border-radius: 5px; margin: 12px; margin-top: 15px ; transform: scale(1.5);"></input>
          </div>      
      </div>

      <div style="display: flex; align-items: center; width: 100%; justify-content: center;">
        <div style="display: flex; justify-content: space-between;">
          <button @click="modifyItem(editItem)" style="margin-top: 15px">Actualizar</button>
          <button @click="closeEditNameModal()" style="margin-left: 5px; margin-top: 15px" class="red-button">Cancelar</button>
        </div>
      </div>
    </template>
  </Modal>

  <!-- Modal de nuevo item --> 
  <Modal class="modal" :isOpen="isNewItemModalOpened" @modal-close="closeNewItemModal" name="item-modal">
    <template #header><strong>Crear {{ translateItemType(newItem.itemType) }}</strong></template>                
    <template #content>
      <div class="error" v-if="errorMessage.length !== 0" style="padding-left: 5%; padding-right: 5%; margin-top: 10px;">
        <p style="margin-top: 5px; margin-bottom: 5px;" v-for="error in errorMessage">{{ error }}</p>
      </div>

      <div style="margin-top: 20px">
          <input type="text" v-model="newItem.name" maxlength="330" placeholder="Nombre de item..." class="text-input"/>
          <textarea v-model="newItem.text" placeholder="Contenido..." maxlength="1000" class="text-input textarea-input"></textarea>
          <div style="display:flex; justify-content: center; align-items: center">
            Prioritario: <input type="checkbox" v-model="newItem.important" style="border-radius: 5px; margin: 12px; margin-top: 15px ; transform: scale(1.5);"></input>
          </div>
        </div>
        <button @click="handleNewItemForm()" style="margin-top:15px">Crear</button>
    </template>
  </Modal>

  <!-- Modal de permisos -->
  <Modal class="modal" :isOpen="isModalOpened" @modal-close="closeModal" name="first-modal">
    <template #header><strong>Cambiar visibilidad de anuncio</strong></template>
    <template #content>
      <div class="error" v-if="errorMessage.length !== 0" style="padding-left: 5%; padding-right: 5%; margin-top: 10px;">
          <p style="margin-top: 5px; margin-bottom: 5px;" v-for="error in errorMessage">{{ error }}</p>
      </div>

      <div style="margin-top: 20px">
        <p>Hacer visible para:</p>
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
              <button v-if="userItemPerms[profile._id] === 'Read'" @click="() => updatePermission(profile._id, 'None')" class="change-perm-button remove-perm-button">Quitar</button>
              <button v-else @click="() => updatePermission(profile._id, 'Read')" class="change-perm-button">Añadir</button>
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
  margin-bottom: 5%;
}

.items-container {
  width: 80vw;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
}

.item-container {
  width: 95%;
  height: auto;
  margin: 10px;
  padding: 15px;
  color: black;
  background-color: #F2F2F2;
  border-radius: 10px;
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

.text-input.textarea-input {
  margin-top: 5px;
  height: 200px;
  resize: none;
}

.item-name {
  margin: 0; 
  margin-left: 10px;
  margin-right: 10px;
  text-align: left;
  word-wrap: break-word;
  width: 92%;
}

.text-container {
  text-align: left;
  margin: 0; 
  margin-left: 10px;
  word-wrap: break-word;
  width: 96%;
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

.change-perm-button {
  width: 25%; 
  height: 30px;
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

.remove-perm-button {
  background-color: #c55e5e;
}

.scrollable {
  scrollbar-color: #C8B1E4 transparent;
  scroll-behavior: smooth;
}

.delete-icon {
  position: absolute;
  top: 10px;
  right: 10px;
  cursor: pointer;
  color: rgb(151, 47, 47);
  font-size: 24px;
}

.important-icon {
  position: absolute;
  top: 10px;
  right: 10px;
  color: rgb(151, 47, 47);
  font-size: 24px;
}

.important-icon-left {
  right: 35px; 
}

.group-icon {
  position: absolute;
  top: 40px;
  right: 10px;
  color: rgb(151, 47, 47);
  font-size: 24px;
  cursor: pointer;
} 

.edit-icon-left {
  right: 35px;
  top: 38px;
  font-size: 12px;
}

.red-button {
  background-color: #c55e5e; 
}

</style>