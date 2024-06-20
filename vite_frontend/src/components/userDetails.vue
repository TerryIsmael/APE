<script setup>
import { ref, onBeforeMount, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import Utils from '../utils/UtilsFunctions.js';
import UserDetailsUtils from '../utils/UserDetailsFunctions.js';
import WorkspaceUtils from '../utils/WorkspaceFunctions.js';
import MainSidebar from './mainSidebar.vue';

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
const selectedFolder = ref('userDetails');
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
  await Utils.leaveWorkspace(workspaceId, isWsModalOpened, workspaces,workspace, path, currentPath, currentUser, items, folders, selectedFolder, existFolder, userWsPerms, router, errorMessage);
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
  await Utils.createWorkspace(isNewWsModalOpened, newWorkspace, router, workspace, path, ref('/chats'), currentUser, ref([]), folders, selectedFolder, ref(false), userWsPerms, errorMessage, isWsModalOpened, workspaces, showMainSidebar);
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

const websocketEventAdd = () => {
  props.ws.addEventListener('open', async (event) => {
    console.log('Connected to server');
    ws.value.send(JSON.stringify({ type: 'workspaceIdentification', userId: currentUser.value?._id, workspaceId: workspace.value?._id }));
  });
  props.ws.addEventListener('message', async (event) => {
    const jsonEvent = JSON.parse(event.data);
    if (jsonEvent.type === 'workspaceDeleted') {
      await fetchFolders();
    }
  });
};

watch([() => newUser.value.password, passwordMatch], checkPassword);

onBeforeMount(async () => {
  path.value = '/' + route.name;
  ws.value = props.ws;
  await fetchUser();
  await fetchFolders();
  websocketEventAdd();
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
              <input v-if="editing" type="text" v-model="newUser.email" maxlength="163" :placeholder=currentUser.email class="field-input"/>
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
  <MainSidebar :currentUser="currentUser" :workspace="workspace" :folders="workspace.folders" :selectedFolder="selectedFolder" :userWsPerms="workspace.permission" 
  :isWsModalOpened="isWsModalOpened" :errorMessage="errorMessage" :isLeaving="isLeaving" :workspaces="workspaces" :isNewWsModalOpened="isNewWsModalOpened"
  @selectItem="selectItem" @openWsModal="openWsModal"  @toggleLeave="toggleLeave" @openNewWsModal="openNewWsModal" @leaveWorkspace="leaveWorkspace"
  @redirectToWorkspace="redirectToWorkspace" @closeWsModal="closeWsModal" @closeNewWsModal="closeNewWsModal" @createWorkspace="createWorkspace"></MainSidebar>
  
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

.scrollable {
  scrollbar-color: #C8B1E4 transparent;
  scroll-behavior: smooth;
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

.red-button {
  background-color: #c55e5e; 
}
</style>