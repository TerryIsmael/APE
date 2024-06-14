<script setup>
import { ref, onBeforeMount, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import Utils from '../utils/UtilsFunctions.js';
import UserDetailsUtils from '../utils/UserDetailsFunctions.js';
import WorkspaceUtils from '../utils/WorkspaceFunctions.js';

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

const workspace = ref({});
const selectedFolder = ref('');
const folders = ref([]);
const showSidebar = ref(false);
const items = ref([]);
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

const newUser = ref({});
const passwordMatch = ref('');

const fetchUser = async () => {
  await Utils.fetchUser(currentUser, router);
};

const fetchFolders = async () => {
  await UserDetailsUtils.fetchFolders(workspace, errorMessage, router);
};

const selectItem = async (item, direct) => {
  await WorkspaceUtils.selectItem(item, direct, selectedFolder, router, selectedItem, showSidebar, selectedItemPerms, workspace, currentUser, author, userItemPerms, errorMessage);
};

const clearErrorMessage = () => {
  Utils.clearErrorMessage(errorMessage);
};

const logout = async () => {
  await Utils.logout(router);
};

const openWsModal = async () => {
  await Utils.openWsModal(isWsModalOpened, workspaces, isLeaving, router, errorMessage);
};

const closeWsModal = () => {
  Utils.closeWsModal(isWsModalOpened, workspaces, errorMessage);
};

const leaveWorkspace = async (workspaceId) => {
  await Utils.leaveWorkspace (workspaceId, isWsModalOpened, workspaces, router, errorMessage);
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

const toggleEdit = () => {
  UserDetailsUtils.toggleEdit(editing, newUser, currentUser, passwordMatch, errorMessage);
};

const checkPassword = () => {
  if (passwordMatch.value !== newUser.value.password && passwordMatch.value !== "" && newUser.value.password !== "") {
    if (!errorMessage.value.includes("Las contraseñas no coinciden")) {
      errorMessage.value.unshift("Las contraseñas no coinciden");
    }
  } else {
    errorMessage.value = errorMessage.value.filter(
      (error) => error !== "Las contraseñas no coinciden"
    );
  }
};

const editUser = async () => {
  await UserDetailsUtils.editUser(currentUser, newUser, errorMessage, editing, router);
  if (errorMessage.value.length === 0) {
    toggleEdit();
  }
};

const deleteUser = async () => {
  await UserDetailsUtils.deleteUser(errorMessage, router);
};

watch([() => newUser.value.password, passwordMatch], checkPassword);

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
        Tu perfil
      </h1>
    </div>

    <div class="container main-content" style="overflow-y: auto;">

      <div style="display: flex; justify-content: space-around; width: 92%; align-items: center;">
        <div style="flex: 1; display: flex; justify-content: flex-start; align-items: center; width: 85%">
          <button v-if="path !== ''" style=" max-height: 50px;" @click="$router.push('/workspace')"><span class="material-symbols-outlined">arrow_back</span></button>
          <h2 style="text-align: left; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-left: 1%;"> Ruta actual: {{ path }}</h2>
        </div>

        <div style="display: flex; justify-content: flex-end; width: 15%;">
          <div v-if="!editing" style="display: flex; justify-content: flex-end; width: 15%; margin-right: 8%">
            <button v-if="!editing" class="workspace-name-button" style="margin-right: 0px;" @click="toggleEdit()">Editar</button>
          </div>
          <div v-else style="display: flex; justify-content: flex-end; width: 15%; margin-right: 8%">
            <button @click="toggleEdit()" class="workspace-name-button red-button">Cancelar</button>
            <button @click="editUser()" style="margin-left: 10px;" class="workspace-name-button">Guardar</button>
          </div>
        </div>
      </div>
      
      <div style="width: 90%; margin-bottom: 5%;">
        <div class="error" v-if="errorMessage.length !== 0 && !isWsModalOpened && !isNewWsModalOpened" style="display: flex; justify-content: space-between;">
          <div>
            <p v-for="error in errorMessage" :key="error" style="margin-top: 5px; margin-bottom: 5px; text-align: center; position: relative;">
              {{ error }}
            </p>
          </div>
        </div>

        <div style="display: flex; width: 100%">
          <div class="column">

            <div class="item-container">
              <h2 class="field-name">Nombre de usuario</h2>
              <input v-if="editing" type="text" v-model="newUser.username" maxlength="16" :placeholder=currentUser.username class="field-input"/>
              <div v-else>
                <hr class="custom-hr">
                <h4 class="field-content"> {{ currentUser.username }} </h4>
              </div>
            </div>

            <div class="item-container">
              <h2 class="field-name">Nombre</h2>
              <input v-if="editing" type="text" v-model="newUser.firstName" maxlength="100" :placeholder=currentUser.firstName class="field-input"/>
              <div v-else>
                <hr class="custom-hr">
                <h4 class="field-content"> {{ currentUser.firstName }} </h4>
              </div>
            </div>

            <div v-if="editing" class="item-container">
              <h2 class="field-name">Contraseña</h2>
              <input type="password" v-model="newUser.password" placeholder="Nueva contraseña..." class="field-input"/>
            </div>

          </div>

          <div class="column" style="padding-left: 5px;">

            <div class="item-container">
              <h2 class="field-name">Correo electrónico</h2>
              <input v-if="editing" type="text" v-model="newUser.email" :placeholder=currentUser.email class="field-input"/>
              <div v-else>
                <hr class="custom-hr">
                <h4 class="field-content"> {{ currentUser.email }} </h4>
              </div>
            </div>

            <div class="item-container">
              <h2 class="field-name">Apellidos</h2>
              <input v-if="editing" type="text" v-model="newUser.surnames" maxlength="100" :placeholder=currentUser.surnames class="field-input"/>
              <div v-else>
                <hr class="custom-hr">
                <h4 class="field-content"> {{ currentUser.surnames }} </h4>
              </div>
            </div>

            <div v-if="editing" class="item-container">
              <h2 class="field-name">Confirmar contraseña</h2>
              <input type="password" v-model="passwordMatch" placeholder="Confirme nueva contraseña..." class="field-input"/>
            </div>
          </div>

        </div>
        <div v-if="!editing" style="display: flex; justify-content: flex-end; width: 100%; margin-right: 10%; margin-top: 5%;">
          <button @click="deleteUser()" class="workspace-name-button red-button">Eliminar cuenta</button>
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
      <li class="li-clickable selected-folder" @click="selectItem('userDetails', true)">Tu perfil</li>
      <li @click="selectItem('chats', true)" class="li-clickable">Chats</li>

      <li class="main-sidebar-subtitle">Workspace actual
        <span v-if="['Owner', 'Admin'].includes(workspace.permission)" @click="selectItem('wsDetails', true)" style="position: absolute; right: 12%; text-align: right; cursor: pointer; vertical-align: middle;" class="material-symbols-outlined">tune</span>
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
  display:flex; 
  height: 100%;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.column {
  padding-top: 1%;
  text-align: left; 
  flex: 1; 
  max-width: 50%;
}

.item-container {
  width: 100%;
  text-align: left;
  margin-top: 5px;
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

.field-name {
  text-align: left; 
  margin: 0;
  margin-bottom: 5px;
}

.field-content {
  max-width: 85%;
  margin-left: 0; 
  margin-right: 0; 
  margin-top: 0;
  text-align: left;
  word-wrap: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.field-input {
  border-radius: 5px;
  margin-bottom: 5px;
  height: 30px;
  width: 90%;
  background-color: #f2f2f2;
  color: black;
}

.custom-hr {
  width: 90%; 
  display: flex; 
  margin-left: 0%; 
  margin-top: 0.5%;
}

</style>