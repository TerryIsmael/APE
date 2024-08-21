<script setup>
import { ref, onMounted, onBeforeMount, onUnmounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import WorkspaceUtils from '../utils/WorkspaceFunctions.js';
import WorkspaceDetailsUtils from "../utils/WorkspaceDetailsFunctions.js";
import Utils from '../utils/UtilsFunctions.js';
import MainSidebar from './mainSidebar.vue';

const props = defineProps({
  ws: {
    type: Object,
    required: true
  },
});

const currentUser = ref(null);
const userWsPerms = ref(null);
const router = useRouter();
const route = useRoute();

const path = ref('');
const selectedFolder = ref('');
const currentPath = ref('');
const items = ref([]);
const selectedItem = ref(null);
const existFolder = ref(false);
const showSidebar = ref(false);
const selectedItemPerms = ref(null);
const author = ref(null);
const profileWsPerms = ref({});

const workspaceId = ref(null);
const workspace = ref({});
const newWorkspace = ref({});
const inviteProfile = ref('none');
const userToInvite = ref('');
const permToInvite = ref('Read');
const isModalOpened = ref(false);
const searchModalProfileTerm = ref('');
const modalProfile = ref({});
const selectedProfile = ref(null);
const linkDuration = ref('day');
const invitations = ref([]);

const folders = ref([]);
const showMainSidebar = ref(false);
const searchProfileTerm = ref('');
const searchTypeProfile = ref('All');
const errorMessage = ref([]);
const editing = ref(false);
const loading = ref(true);

const workspaces = ref([]);
const isWsModalOpened = ref(false);
const isLeaving = ref(false);
const isNewWsModalOpened = ref(false);

const fetchInvitations = async () => {
  await WorkspaceDetailsUtils.fetchInvitations(workspace, invitations, errorMessage, router);
};

const createInvitationLink = async (profile) => {
  await WorkspaceDetailsUtils.createInvitationLink(workspace, inviteProfile, linkDuration, invitations, errorMessage, router);
};

const isUserInModalProfile = (user) => {
  return WorkspaceDetailsUtils.isUserInModalProfile(user, modalProfile);
};

const handleSelectProfile = (profile) => {
  selectedProfile.value = profile;
  openModal();
};

const openModal = () => {
  WorkspaceDetailsUtils.openModal(selectedProfile, modalProfile, isModalOpened, errorMessage);
};

const closeModal = () => {
  WorkspaceDetailsUtils.closeModal(selectedProfile, modalProfile, isModalOpened, errorMessage);
};

const setModalProfileUsers = (user) => {
  WorkspaceDetailsUtils.setModalProfileUsers(user, modalProfile);
};

const toggleEdit = () => {
  WorkspaceDetailsUtils.toggleEdit(editing, newWorkspace, workspace, errorMessage);
};

const saveProfile = async () => {
  await WorkspaceDetailsUtils.saveProfile(modalProfile, workspace, path, currentPath, currentUser, items, folders, selectedFolder, existFolder, userWsPerms, router, errorMessage);
  
  if (errorMessage.value.length === 0) {
    WorkspaceDetailsUtils.populateVariables(workspace, author, profileWsPerms);
    closeModal();
  }
};

const fetchUser = async () => {
  await Utils.fetchUser(currentUser, router);
};

const fetchWorkspace = async () => {
  await WorkspaceUtils.fetchWorkspace(workspace, path, currentPath, currentUser, items, folders, selectedFolder, existFolder, userWsPerms, router, errorMessage);
  WorkspaceDetailsUtils.populateVariables(workspace, author, profileWsPerms);
};

const editWorkspace = async () => {
  await WorkspaceDetailsUtils.editWorkspace(newWorkspace, workspace, router, errorMessage, author, profileWsPerms, editing);
};

const selectItem = async (item, direct) => {
  profileWsPerms.value = {};
  author.value = null;
  await WorkspaceUtils.selectItem(item, direct, selectedFolder, router, selectedItem, showSidebar, selectedItemPerms, workspace, currentUser, author, profileWsPerms, errorMessage);
};

const formatDate = (date) => {
  return Utils.formatDate(date);
};

const translatePerm = (perm) => {
  return Utils.translatePerm(perm);
};

const toggleActiveInvitation = async (invitation) => {
  await WorkspaceDetailsUtils.toggleActiveInvitation(workspace, invitation, invitations, errorMessage, router);
};

const deleteInvitation = async (invitation) => {
  await WorkspaceDetailsUtils.deleteInvitation(workspace, invitation, invitations, errorMessage, router);
};

const inviteUser = async () => {
  await WorkspaceDetailsUtils.inviteUser(workspace, userToInvite, permToInvite, profileWsPerms, author, path, currentPath, currentUser, items, folders, selectedFolder, existFolder, userWsPerms, errorMessage, router);
};

const copyInvitation = async (invitation) => {
  await navigator.clipboard.writeText(window.location.origin + '/invite/' + invitation.code);
  var message = document.getElementById("message");
  message.style.visibility = "visible";
  setTimeout(function() {
    message.style.visibility = "hidden";
  }, 3000);
};

const getFilteredProfiles = computed(() => {
  let orderedProfiles = [];
  let profiles = [];

  if (userWsPerms.value === 'Owner') {
    const ownerProfile = workspace.value.profiles.find(profile => profile.wsPerm === 'Owner');
    profiles = workspace.value.profiles.filter(profile => {
      const name = profile.profileType === 'Individual' ? profile.users[0].username : profile.name;
      const matchesSearchTerm = searchProfileTerm.value.trim() === '' || name.toLowerCase().includes(searchProfileTerm.value.toLowerCase().trim());
      const isNotOwner = profile !== ownerProfile;
      return searchTypeProfile.value === 'All' ? (matchesSearchTerm && isNotOwner) : (matchesSearchTerm && isNotOwner && profile.profileType === searchTypeProfile.value);
    });
  
  } else if (userWsPerms.value === 'Admin') {
    const forbiddenProfiles = workspace.value.profiles.filter(profile => profile.wsPerm === 'Owner' || profile.wsPerm === 'Admin');

    profiles = workspace.value.profiles.filter(profile => {
      const isForbidden = forbiddenProfiles.includes(profile);
      const name = profile.profileType === 'Individual' ? profile.users[0].username : profile.name;
      const matchesSearchTerm = searchProfileTerm.value.trim() === '' || name.toLowerCase().includes(searchProfileTerm.value.toLowerCase().trim());
      return searchTypeProfile.value === 'All' ? (matchesSearchTerm && !isForbidden) : (matchesSearchTerm && !isForbidden && profile.profileType === searchTypeProfile.value);
    });
  }

  const withoutPerms = profiles.filter(profile => profile.wsPerm === 'Read');
  const withPerms = profiles.filter(profile => profile.wsPerm !== 'Read');
  orderedProfiles.push(...withPerms);
  orderedProfiles.push(...withoutPerms); 
  return orderedProfiles;
});

const getGroupProfiles = computed(() => {
  const profiles = workspace.value.profiles.filter(profile => {
    const profileType = profile.profileType === 'Group';
    const isNotAdmin = profile.wsPerm !== 'Admin';
    if (userWsPerms.value === 'Owner') {
      return (profileType);
    } else if (userWsPerms.value === 'Admin') {
      return (profileType && isNotAdmin);
    }
  });

  return profiles.sort((a, b) => {
    if (a.name < b.name) return -1;
    if (a.name > b.name) return 1;
    else return 0;
  });
});

const getIndividualProfiles = computed(() => {
  const profiles = workspace.value.profiles.filter(profile => {
    const name = profile.users[0]?.username;
    return (profile.profileType === 'Individual' && (searchModalProfileTerm.value.trim() === '' || name.toLowerCase().includes(searchModalProfileTerm.value.toLowerCase().trim())));
  });

  const orderedUsers = [];
  const users = profiles.map(profile => profile.users[0])
  const withoutPerms = users.filter(user => !isUserInModalProfile(user));
  const withPerms = users.filter(user => isUserInModalProfile(user));

  withPerms.length != 0 ? orderedUsers.push(...withPerms) : null;
  orderedUsers.push(...withoutPerms);
  return orderedUsers;
});

const clearErrorMessage = () => {
  Utils.clearErrorMessage(errorMessage);
};

const changeWsPerms = async (perm, profileId) => {
  await WorkspaceDetailsUtils.changeWsPerms(perm, profileId, workspace, path, currentPath, currentUser, items, folders, selectedFolder, existFolder, userWsPerms, router, errorMessage);
  WorkspaceDetailsUtils.populateVariables(workspace, author, profileWsPerms);
};

const deleteProfile = async (profileId) => {
  await WorkspaceDetailsUtils.deleteProfile(profileId, workspace, path, currentPath, currentUser, items, folders, selectedFolder, existFolder, userWsPerms, router, errorMessage);
  WorkspaceDetailsUtils.populateVariables(workspace, author, profileWsPerms);
};

const deleteWorkspace = async () => {
  await WorkspaceDetailsUtils.deleteWorkspace(workspace, router, errorMessage);
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
  await Utils.redirectToWorkspace(workspaceId, router, workspace, path, currentPath, currentUser, items, folders, selectedFolder, existFolder, userWsPerms, errorMessage, isWsModalOpened, workspaces, showMainSidebar, ref(props.ws));
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

const createWorkspace = async (newWorkspaceName) => {
  await Utils.createWorkspace(isNewWsModalOpened, newWorkspaceName, router, workspace, path, currentPath, currentUser, items, folders, selectedFolder, existFolder, userWsPerms, errorMessage, isWsModalOpened, workspaces, showMainSidebar, ws);
  if (errorMessage.value.length === 0) {
    closeNewWsModal();
  }
};

const refreshWindow = async () => {
  await fetchWorkspace();
  await fetchInvitations();
  inviteProfile.value = workspace.value?.profiles?.find(profile=> profile._id === inviteProfile._id);

  if (!inviteProfile.value) inviteProfile.value = 'none';
};

const websocketEventAdd = () => {
  props.ws.addEventListener('message', async (event) => {
    const jsonEvent = JSON.parse(event.data);
    if (jsonEvent.type === 'workspaceUpdated') {
      await refreshWindow();
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
  await fetchInvitations();
  loading.value = false;
  websocketEventAdd();
});

onMounted(() => {
  workspaceId.value = localStorage.getItem('workspace');
});

onUnmounted(() => {
  props.ws.removeEventListener('open', websocketEventAdd);
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

    <div class="main-content" style="display: flex; justify-content: center; align-items: center; word-wrap: break-word;">
      <h1 @click="$router.push('/workspace/')" style="cursor: pointer; display: flex; align-items: center; margin-right: 10px">
          <span style="color: #C8B1E4; font-size: 60px;" class="material-symbols-outlined">home</span>
          Detalles del workspace
      </h1>
    </div>

    <div class="main-content" style="display:flex; flex-direction: column; align-items: center; margin-bottom: 5%;">

      <div style="display: flex; justify-content: space-around; width: 90%; align-items: center; justify-content: center;">
          <div style="flex: 1; display: flex; justify-content: flex-start; align-items: center; width: 85%">
              <button style="max-height: 50px;" @click="$router.push('/workspace')"><span class="material-symbols-outlined">arrow_back</span></button>
              <div style="display:flex; width: 100%; justify-content: start; text-align: left; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-left: 1%;">
                <h2 style="margin-right: 1%">Ruta actual: {{ path }}</h2>
              </div>
          </div>

          <div style="display: flex; justify-content: flex-end; width: 20%;">
            <button v-if="userWsPerms === 'Owner' && !workspace.default" class="red-button" style="margin-right: 19.5%; max-height: 50px; display:flex; justify-content: center; align-items: center;" @click="deleteWorkspace()">Eliminar workspace</button>
          </div>
      </div>
      
      <div class="main-content" style="width: 90%;">
        <div class="error" v-if="errorMessage.length !== 0 && !isModalOpened && !isNewWsModalOpened" style="display: flex; justify-content: space-between; padding-left: 2%;">
          <div>
            <p v-for="error in errorMessage" :key="error" style="margin-top: 5px; margin-bottom: 5px; text-align: center; position: relative;"> {{ error }} </p>
          </div>
          <button @click="clearErrorMessage()" style="display: flex; align-items: top; padding: 0; padding-left: 5px; padding-top: 10px; background: none; border: none; cursor: pointer; color: #f2f2f2; outline: none;">
            <span style="font-size: 20px; "class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div style="display: flex; width: 100%">
          <div class="column"> 
            <h2 style="margin-left: 0; margin-right: 0; margin-bottom: 0;">Detalles del workspace</h2>
            <hr style="width: 90%; display: flex; margin-left: 0%;">

            <h4 style="margin: 0;">Fecha de creación: {{ formatDate(workspace?.creationDate) }}</h4>
            <h4 style="margin-left: 0; margin-right: 0; margin-top: 0;">Creado por: {{ author?.username }} ({{ author?.email }})</h4>
            <h2 style="margin: 0;">Invitación al workspace</h2>
            <hr style="width: 90%; display: flex; margin-left: 0%;">

            <h3 style="margin: 0; margin-top: 5px; margin-bottom: 5px;">Mediante nombre de usuario</h3>
            <div style="display: flex; justify-content: space-between; align-items: baseline">
              <input type="text" class="text-input" maxlength="16" v-model="userToInvite" placeholder="Username del nuevo miembro..."></input>
              <select v-model="permToInvite" class="text-input" style="width: 32%; margin-left:3px">
                  <option :value="'Read'">Lectura</option>
                  <option :value="'Write'">Escritura</option>
                  <option v-if="userWsPerms === 'Owner' ":value="'Admin'">Admin</option>
              </select> 
              <button style="margin-top: 0.5%;" class="invite-button" @click="inviteUser">Invitar</button>
            </div>

            <h3 style="margin-left: 0; margin-right: 0; margin-top: 5px; margin-bottom: 5px;">Mediante link de invitación</h3>
            
            <p style="margin: 0%; margin-bottom: 5px;">Seleccione un perfil para generar el link:</p>
            <div style="display: flex; justify-content: space-between; width: 100%;">
              <select v-model="inviteProfile" class="text-input" style="width: 60%;">
                  <option :value="'none'"> Ninguno - Lectura </option>
                  <option v-if="getGroupProfiles.length > 0" v-for="profile in getGroupProfiles" :key="profile._id" :value="profile">{{ profile.name }} - {{ translatePerm(profile.wsPerm) }} </option>
              </select>
              <select v-model="linkDuration" class="text-input" style="width: 20%; margin-left:3px">
                  <option :value="'day'"> 1 día </option>
                  <option :value="'week'">1 semana</option>
                  <option :value="'month'">1 mes</option>
                  <option :value="'none'">Para siempre</option>
              </select>
              <button class="invite-button" @click="createInvitationLink" >Generar</button>
            </div>
            <div id="message">Enlace copiado al portapapeles</div>
            <table v-if="invitations.length !== 0" style="width: 90.5%; margin-top:2%">
              <tr>
                <th style="width:30%">Perfil</th>
                <th style="width:26%">Duración</th>
                <th style="width:6%">Activo</th>
                <th style="width:8%; margin-left:5%; text-align: end;">Eliminar</th>
              </tr>
              <tr v-for="invitation in invitations" :key="invitation._id"> 
                <td style="word-break: break-all;">{{ invitation.profile?(invitation.profile.name+ " - "+ translatePerm(invitation.profile.wsPerm)):"Ninguno - Lectura" }} <span @click="copyInvitation(invitation)" class="material-symbols-outlined" style="cursor:pointer;vertical-align:middle">content_copy</span></td>
                <td>{{ invitation.expirationDate?Utils.formatDate(invitation.expirationDate):"Indefinida" }}</td>
                <td class="td-center"><span @click="toggleActiveInvitation(invitation)" class="material-symbols-outlined" style="cursor:pointer">{{ invitation.active ? 'check' : 'close' }}</span></td>
                <td class="td-center" style="margin-left:5%; text-align: end"><span @click="deleteInvitation(invitation)" class="material-symbols-outlined" style="cursor:pointer">delete</span></td>
              </tr>
            </table>
            <p v-else>Aún no hay links de invitación al workspace</p>
          </div>

          <div class="column" style="padding-left: 5px;">
            <div style="display:flex; justify-content:space-between; align-items:center"> 
              <h2 style="text-align: left; margin-bottom: 5px;">Nombre del workspace</h2>

              <div v-if="!editing" style="display: flex; justify-content: flex-end; width: 15%; margin-right: 8%">
                <button v-if="!editing" class="workspace-name-button" style="margin-right: 0px;" @click="toggleEdit()">Editar</button>
              </div>
              <div v-else style="display: flex; justify-content: flex-end; width: 15%; margin-right: 8%">
                <button @click="toggleEdit()" class="workspace-name-button red-button">Cancelar</button>
                <button @click="editWorkspace()" class="workspace-name-button">Guardar</button>
              </div>
            </div>

            <input v-if="editing" type="text" class="workspace-input" maxlength="55" v-model="newWorkspace.name" :placeholder=workspace.name></input>
            <div v-else style="margin: 0;">
              <hr style="width: 92%; display: flex; margin-left: 0%; margin-top: 0.5%">
              <h4 style="margin-left: 0; margin-right: 0; margin-top: 0;"> {{ workspace.name }}</h4>
            </div>

            <div style="display: inline-flex; justify-content: space-between; align-items: center; margin-top: 10px; width: 92%">
              <h2 style="margin: 0; text-align: left; margin-bottom: 5px;">Perfiles</h2> 
              <div style="margin: 0; padding: 0">
                <span @click="openModal()" style="text-align: right; cursor: pointer; vertical-align: bottom" class="material-symbols-outlined">add</span> 
              </div>
            </div>

            <div style="height: 80%; overflow-y: auto;">
              <div style="display: inline-flex; width: 91.5%; align-items: center; justify-content: space-between; margin-bottom: 15px">
                <input v-model="searchProfileTerm" placeholder="Buscar perfil por nombre..." class="text-input" style="width: 70%;"/>
                <select v-model="searchTypeProfile" class="text-input" style="width: 25%;">
                    <option value="Individual">Individual</option>
                    <option value="Group">Grupo</option>
                    <option value="All">Todos</option>
                </select>
              </div>
              
              <div v-if="getFilteredProfiles.length !== 0" v-for="profile in getFilteredProfiles" :key="profile._id" style="width: 100%;">
                <div style="display: inline-flex; width: 91.5%; height: 40px; align-items: center; justify-content: space-between;">

                  <div style="display: inline-flex; align-items: center; justify-content: left; width: 75%;">
                    <p class="profile-name">{{ profile.profileType == 'Individual' ? profile.users[0].username : profile.name }}</p>
                    <span v-if="profile.profileType !== 'Individual'" @click="handleSelectProfile(profile)" style="vertical-align: middle; cursor: pointer; margin-right: 2px;" class="material-symbols-outlined">edit</span>
                    <span v-if="profile.profileType === 'Group'" @click="deleteProfile(profile._id)" style="vertical-align: middle; cursor: pointer; margin: 0;" class="material-symbols-outlined">delete</span>
                    <span v-if="profile.profileType === 'Individual'"  @click="deleteProfile(profile._id)" style="vertical-align: middle; cursor: pointer; margin: 0;" class="material-symbols-outlined">person_remove</span>
                  </div>

                  <select v-model="profileWsPerms[profile._id]" @change="changeWsPerms(profileWsPerms[profile._id], profile._id)" class="text-input" style="width: 25%; margin: 0%; padding: 0;">
                    <option value="Read">Lectura</option>
                    <option value="Write">Escritura</option>
                    <option v-if="userWsPerms === 'Owner'" value="Admin">Admin</option>
                  </select>
                </div>
              </div>

              <p v-else style="margin-top: 0;">Aún no hay perfiles en el workspace</p>
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
  
  <!-- Modal de perfil --> 
  <Modal class="modal" :isOpen="isModalOpened" @modal-close="closeModal" name="profile-modal">
    <template #header v-if="selectedProfile"><strong>Editar perfil</strong></template>
    <template #header v-else><strong>Crear nuevo perfil grupal</strong></template>
    <template #content>
      <div class="error" v-if="errorMessage.length !== 0" style="padding-left: 5%; padding-right: 5%; margin-top: 10px;">
        <p style="margin-top: 5px; margin-bottom: 5px; text-align: center" v-for="error in errorMessage">{{ error }}</p>
      </div>

      <div style="margin-top: 20px; justify-content: center;"> 
        <div style="display: flex; justify-content: space-between; align-items: center; margin-left: 5px; margin-right: 5px;">
          <input type="text" v-model="modalProfile.name" maxlength="60" placeholder="Nombre de perfil..." class="text-input" style="width: 70%;"/>

          <select v-model="modalProfile.wsPerm" class="text-input" style="width: 25%;">
            <option value="Read">Lectura</option>
            <option value="Write">Escritura</option>
            <option v-if="userWsPerms === 'Owner'" value="Admin">Admin</option>
          </select>
        </div>

        <div style="display: inline-flex; width: 100%; align-items: center; justify-content: space-between; margin-top: 10px; margin-bottom: 5px; margin-left: 5px;">
          <input v-model="searchModalProfileTerm" placeholder="Buscar por nombre de usuario..." class="text-input" style="width: 96.5%;"/>
        </div>

        <div v-for="user in getIndividualProfiles" style="height: 80%; overflow-y: auto; width: 100%;">
          <div style="display: inline-flex; width: 95%; height: 40px; align-items: center; justify-content: space-between;">
            <p style="margin-right: 10px;">{{ user.username }}</p>
            <button v-if="isUserInModalProfile(user)" @click="setModalProfileUsers(user)" class="change-perm-button red-button">Quitar</button>
            <button v-else @click="setModalProfileUsers(user)" class="change-perm-button">Añadir</button>
          </div>
        </div>
      </div>
    </template>
    <template #footer>
      <button style="margin-top:15px" @click="saveProfile()">Guardar</button>
    </template>
  </Modal>
</template>

<style scoped>

#message {
  visibility: hidden;
  background-color: #C8B1E4;
  color: #000000;
  text-align: center;
  border-radius: 5px;
  padding: 10px;
  position: fixed;
  z-index: 1;
  font-size: 1em;
  font-weight: 500;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  margin-left: -50px;
} 

table {
  width: 100%;
  border-collapse: collapse;
}

.td-center {
  text-align: center;
  padding: 8px;
  padding-right: 4%;
}

.column {
  text-align: left;
  flex: 1; 
  max-width: 50%;
}

.text-input {
  border-radius: 5px;
  margin-bottom: 5px;
  height: 30px;
  width: 90%;
  background-color: #f2f2f2;
  color: black;
}

.workspace-input {
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

.invite-button {
  margin: 0;
  flex-shrink: 0;
  margin-right: 9%;
  margin-left: 15px;
  height: 30px;
  width: 80px;
  border-radius: 8px;
  padding: 0;
  font-size: 1em;
  font-weight: 500;
  font-family: inherit;
  background-color: #C8B1E4;
  color: black;
  cursor: pointer;
}

.workspace-name-button {
  width: 90px; 
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
  margin-right: 10px;
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

.profile-name {
  max-width: 81%;
  margin-right: 5px;
  word-wrap: break-word; 
  display: -webkit-box; 
  -webkit-line-clamp: 1;
  line-clamp: 1; 
  -webkit-box-orient: vertical; 
  overflow: hidden;
}

.scrollable {
  scrollbar-color: #C8B1E4 transparent;
  scroll-behavior: smooth;
}

.red-button {
  background-color: #c55e5e; 
}

</style>