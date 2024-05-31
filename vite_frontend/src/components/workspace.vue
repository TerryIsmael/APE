<script>
import { ref, onMounted, onUnmounted, nextTick, onBeforeMount } from 'vue';
import { useRouter } from 'vue-router';
import { ItemType } from '../../../express_backend/src/models/item';

export default {
  setup() {
    
    const workspace = ref(null);
        
    const myFiles = ref([]);
    const currentUser = ref(null);
    const selectedFilePerms = ref(null);
    const router = useRouter();
    const showSidebar = ref(false);
    const showMainSidebar = ref(false);
    const showSharedPopup = ref(false);
    const formattedDate = ref(null);
    const selectedFile = ref(null);
    const isModalOpened = ref(false);
    const shareWith = ref(null);
    const sharePerm = ref(null);
    const errorMessage = ref([]);
    const fileInput = ref(null); 

    const folders = ref([]);
    const selectedFolder = "Favourites"; 

    // Creation of items
    const isNewItemModalOpened = ref(false);
    const newItem = ref({});
     
    const hours = ref(0);
    const minutes = ref(0);
    const seconds = ref(0);

    const fetchWorkspace = async () => {
      try {
        const wsId = localStorage.getItem('workspace');
        const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/workspace'+ (wsId?`/${wsId}`:''), {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          workspace.value = data;
          localStorage.setItem('workspace', data._id);
          folders.value = workspace.value.items.filter(item => item.type === 'Folder');
        } else if (response.status === 401) {
          router.push({ name: 'login' });
        }
      } catch (error) {
        console.log(error);
      }
    }
      
    const openModal = () => {
      isModalOpened.value = true;
      sharePerm.value = 'view';
    };

    const closeModal = () => {
      isModalOpened.value = false;
      errorMessage.value = [];
      clearModalFields();
    };

    const clearModalFields = () => {
      shareWith.value = '';
      sharePerm.value = 'view';
    };

    const toggleSharedPopup = () => {
      showSharedPopup.value = !showSharedPopup.value
    }

    const toggleSidebar = () => {
      showSidebar.value = !showSidebar.value;
    }

    const selectFile = async (file) => {
      showSidebar.value = true;
      selectedFile.value = file;
      selectedFilePerms.value = await verifyPerms(file, currentUser.value);
    }

    const closeSidebar = (event) => {
      const sidebar = document.querySelector('.sidebar');
      const modal = document.querySelector('.modal');
      const fileContainers = Array.from(document.querySelectorAll('.file-container'));
      const selectedFile = fileContainers.some(fileContainer => fileContainer.contains(event.target));
      if (sidebar && !sidebar.contains(event.target) && !modal && !selectedFile ) {
        showSidebar.value = false;
      }
    };

    const formatDate = (date) => {
      const options = { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' };
      return new Date(date).toLocaleDateString('es-ES', options);
    }

    const deleteFile = async (file) => {
      try {
        const confirmDelete = confirm("¿Estás seguro de que deseas eliminar este archivo?");
        if (!confirmDelete) return;
        const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/file', {
          body: JSON.stringify({ id: file._id }),
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: "include",
        });

        if (response.ok) {
          selectedFile.value = null;
          toggleSidebar();
          getMyFiles();
        } else if (response.status === 401) {
          router.push({ name: 'login' });
        }
      } catch (error) {
        console.log(error);
      }
    }

    const toggleLike = async (file) => {
      try {
        const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/file/like', {
          body: JSON.stringify({ fileId: file._id }),
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: "include",
        });
        if (response.ok) {
          await getMyFiles();
        } else if (response.status === 401) {
          router.push({ name: 'login' });
        }
      } catch (error) {
        console.log(error);
      }
    }

    const verifyPerms = async (file, user) => {
      if (file.owner._id === user._id) {
        return 'owner';
      } 
      const perm = await file.sharedWith.find(x => x.user._id === user._id)
      if (perm) {
        return perm.perm;
      } else {
        return 'none';
      }
    }

    const changePerms = async (perm, username) => {
      try { 
        const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/file', {
          body: JSON.stringify({ username: username, fileId: selectedFile.value._id, perm: perm }),
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: "include",
        });

        if (response.ok) {
          await getMyFiles();
          selectedFile.value = myFiles.value.find(file => file._id === selectedFile.value._id);
          errorMessage.value = [];
        } else if (response.status === 401) {
          router.push({ name: 'login' });
        } else if (response.status === 400 || response.status === 404) {
          errorMessage.value = [];
          response.json().then((data) => {
            if (data.error) {
              errorMessage.value.push(data.error);
            } else {
              data.errors.forEach((error) => {
                errorMessage.value.push(error.msg);
              });
            }
          throw new Error("Error al cambiar permisos");
          })
        }

      } catch (error) {
        console.log(error);
      }
    }

    const logout = async () => {
      try {
        const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: "include",
        });
        if (response.ok) {
          router.push({ name: 'login' });
        } else if (response.status === 401){
          router.push({ name: 'login' });
        }
      } catch (error) {
        console.log(error);
      }
    }

    const getMyFiles = async () => {
      try {
        const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/file', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          currentUser.value = data.currentUser;
          if (!data.files) return;
          const favs = await data.files.filter(file => currentUser.value.favorites.includes(file._id))
          const nofavs = await data.files.filter(file => !currentUser.value.favorites.includes(file._id))
          
          myFiles.value = [];
          myFiles.value.push(...favs);
          myFiles.value.push(...nofavs);

        } else if (response.status === 401) {
          router.push({ name: 'login' });
        } 
 
      } catch (error) {
        console.log(error);
      }
    }

    const translatePerm = (perm) => {
      switch (perm) {
        case 'owner':
          return 'Propietario';
        case 'write':
          return 'Escritura';
        case 'read':
          return 'Lectura';
        case 'view':
          return 'Vista';
        default:
          return 'Ninguno';
      }
    }

    const downloadFile = async () => {
      try {
        const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/file/download', {
          body: JSON.stringify({ id: selectedFile.value._id }),
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: "include",
        });
        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = selectedFile.value.filename;
          a.click();
          window.URL.revokeObjectURL(url);
        } else if (response.status === 401) {
          router.push({ name: 'login' });
        }
      } catch (error) {
        console.log(error);
      }
    }

    const selectUploadFile = () => {
      fileInput.value.click();
    };

    const uploadFile = async (event) => {
      const file = event.target.files[0];
      try {
        const formData = new FormData();
        formData.append('workspace', workspace.value._id);
        formData.append('file', file);
        const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/file', {
          method: 'POST',
          body: formData,
          credentials: "include",
        });
        if (response.ok) {
          getMyFiles();
          console.log('Archivo subido correctamente');
        } else if (response.status === 401) {
          router.push({ name: 'login' });
        } else{
          response.json().then((data) => { 
            console.log(data);
          })
        }
      } catch (error) {
        console.log(error);
      }
    }

    const openNewItemModal = (itemType) => {
      isNewItemModalOpened.value = true;
      newItem.value.name = '';
      newItem.value.itemType = itemType;
      if (itemType == 'Timer') {
        hours.value = 0;
        minutes.value = 0;
        seconds.value = 0;
      } else if (itemType == 'Note' || itemType == 'Notice') {
        newItem.value.text = '';
      }
    };

    const closeNewItemModal = () => {
      isNewItemModalOpened.value = false;
      newItem.value = {};
      errorMessage.value = [];
      hours.value = 0;
      minutes.value = 0;
      seconds.value = 0;
    };

    const handleNewItemForm = async () => {
      try { 
        let currentPath = window.location.pathname.split('/').slice(3).join('/');
        const itemType = newItem.value.itemType;

        if (itemType == 'Timer') {
          newItem.value.duration = ((hours.value * 3600000) + (minutes.value * 60000) + (seconds.value * 1000));
        } else if (itemType == 'Note' || itemType == 'Notice') {
          newItem.value.text = newItem.value.text;
        } 

        const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/item', {
          body: JSON.stringify({ workspace: workspace.value._id, path: `${currentPath}`, item: newItem.value }),
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: "include",
        });

        if (response.ok) {
          closeNewItemModal();
          await getMyFiles();
          errorMessage.value = [];
        } else if (response.status === 401) {
          router.push({ name: 'login' });
        } else if (response.status === 400 || response.status === 404) {
          errorMessage.value = [];
          response.json().then((data) => {
            if (data.error) {
              errorMessage.value.push(data.error);
            } else {
              data.errors.forEach((error) => {
                errorMessage.value.push(error.msg);
              });
            }
          throw new Error("Error al crear item");
          })
        }

      } catch (error) {
        console.log(error);
      }
    }

    onBeforeMount(() => {
      fetchWorkspace();
    });
    
    onMounted(() => {
      getMyFiles();
      document.addEventListener('click', closeSidebar);
    });

    onUnmounted(() => {
      document.removeEventListener('click', closeSidebar);
    });
    
    return {
      workspace,
      folders,
      selectedFolder,
      myFiles,
      showSidebar,
      showMainSidebar,
      showSharedPopup,
      selectedFile,
      selectedFilePerms,
      formattedDate,
      currentUser,
      isModalOpened,
      shareWith,
      sharePerm,
      errorMessage,
      fileInput,
      isNewItemModalOpened,
      newItem,
      hours,
      minutes,
      seconds,
      openModal,
      closeModal,
      clearModalFields,
      changePerms,
      getMyFiles,
      selectFile,
      toggleSidebar,
      toggleSharedPopup,
      toggleLike,
      formatDate,
      deleteFile,
      verifyPerms,
      logout,
      downloadFile,
      selectUploadFile,
      uploadFile,
      translatePerm,
      openNewItemModal,
      closeNewItemModal,
      handleNewItemForm,
    }
  }
}   
</script>
 
<template>

  <div :class="{'main-sidebar-toggle':true, 'main-sidebar-toggle-opened':showMainSidebar}">
    <span v-if="!showMainSidebar" @click="showMainSidebar = true" class="material-symbols-outlined">chevron_right</span>
    <span v-else @click="showMainSidebar = false" class="material-symbols-outlined">chevron_left</span>
  </div>

  <div class="main-sidebar-overlay" v-if="showMainSidebar"></div>
    <div class="main-sidebar" :class="{'show' : showMainSidebar}">

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

        <li style="font-weight: bolder; text-align: left; margin-left: 5%; margin-right: 5%; margin-bottom: 1%; margin-top: 3%; word-wrap: break-word; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">{{ workspace?.name }}</li>
        <button class="change-workspace-button">Cambiar</button>

        <li class = "main-sidebar-title">Inicio</li>
        <li class="li-clickable">Gestionar perfil</li>
        <li class="li-clickable">Gestionar workspaces</li>

        <li class="main-sidebar-subtitle">Workspace actual <span @click="openNewItemModal('Folder')" style="margin-left: 35%; text-align: right; cursor: pointer; vertical-align: middle" class="material-symbols-outlined">add</span></li>

        <li class="li-clickable">Detalles del workspace</li>
        <li :class="{'li-clickable':true, 'selected_folder':selectedFolder == 'Favourites'}">Anuncios</li>
        <li :class="{'li-clickable':true, 'selected_folder':selectedFolder == 'Favourites'}">Favoritos</li>
        <div v-for="folder in folders" style="overflow-y: auto; word-wrap: break-word; max-height: 60%">
          <li :class="{'li-clickable':true, 'selected_folder': selectedFolder.id !== undefined && selectedFolder.id == folder.id}" >{{ folder.name }}</li>
        </div>
      </ul>
      <ul style="height: 5%;">
        <li style="text-align: right;"> <button style="margin-right: 5%;" @click="logout"><span class="material-symbols-outlined">logout</span></button> </li>
      </ul>
    </div>
  <div class="main-content" style="display:flex; justify-content: center; align-items: center; word-wrap: break-word;"><h1 style="margin-right: 10px;"> {{ workspace?.name }}</h1></div>
  <div class="main-content" style="display:flex; flex-direction: column; align-items: center;">
    <div style="display: flex; justify-content: right; width:85%;">
      <div></div>

      <button style="margin-right: 1%;" @click="openNewItemModal('Folder')"><span class="material-symbols-outlined">create_new_folder</span></button>
      <div class="dropdown">
        <button @click="openDropdown"><span class="material-symbols-outlined">add</span></button>
        <div class="dropdown-content">
          <div @click="openNewItemModal('Notice')">Anuncio</div>
          <div @click="openNewItemModal('Calendar')">Calendario</div>
          <div @click="openNewItemModal('Note')">Nota</div>
          <div @click="openNewItemModal('Timer')">Temporizador</div>
          <input type="file" ref="fileInput" style="display: none" @change="uploadFile">
          <div @click="selectUploadFile" value="File">Archivo</div>
        </div>
      </div>      
    </div>

    <div class="container">
      <div v-if="myFiles.length === 0">
        <p style="font-size: xx-large; font-weight: bolder;">No hay archivos...</p>
      </div>
      <div class="files-container" v-else>
        <div class="file-container" v-for="file in myFiles" :key="file.id" @click="selectFile(file)">
          <img class="file-img" :src="'/files/'+file.contentType.toLowerCase()+'.png'" alt="file.filename" width="100" height="100" onerror="this.onerror=null;this.src='files/default.png';"> 
          <div style="display:flex; align-items: center;">
            <p class="filename">{{ file.filename }} </p>
            <span v-if="currentUser?.favorites.includes(file._id)" class="material-symbols-outlined filledHeart">favorite</span>
          </div>
        </div>
    </div>
    
    <div class="sidebar-overlay" v-if="showSidebar && selectedFile" @click="closeSidebar"></div>
      <div class="sidebar" :class="{ 'show': showSidebar }">
        <ul>
          <li>Archivo: {{ selectedFile?.filename }}</li>
          <li>Autor: {{ selectedFile?.owner.username }} ({{ selectedFile?.owner.email }})</li>
          <li>Fecha de subida: {{ formatDate(selectedFile?.uploadDate)}}</li>

          <li style="display: inline-flex; justify-content: space-around; width: 90%;">
            <button v-if="['owner'].includes(selectedFilePerms)" @click="openModal"><span class="material-symbols-outlined">groups</span></button>
            <button v-if="['owner','write','read'].includes(selectedFilePerms)" @click="downloadFile"><span class="material-symbols-outlined">download</span></button>
            <button @click="toggleLike(selectedFile)">
              <span v-if="!currentUser?.favorites.includes(selectedFile?._id)" class="material-symbols-outlined">favorite</span>
              <span v-else class="material-symbols-outlined filledHeart">favorite</span>
            </button>
            <button v-if="['owner','write'].includes(selectedFilePerms)" @click="deleteFile(selectedFile)"><span class="material-symbols-outlined">delete</span></button>
          </li>
        </ul>
      </div>
    </div>

    <Modal class="modal" :isOpen="isNewItemModalOpened" @modal-close="closeNewItemModal" name="item-modal">
      <template #header><strong>Crear {{ newItem.itemType }}</strong></template>                
      <template #footer>
        <div style="margin-top:20px">

          <div class="error" v-if="errorMessage.length !== 0">
            <p style="margin-top: 5px; margin-bottom: 5px;" v-for="error in errorMessage">{{ error }}</p>
          </div>
            <input type="text" v-model="newItem.name" placeholder="Nombre de item..." style="border-radius: 5px; margin-right:5px;  margin-bottom: 5px; height:30px; width: 200px; background-color: #f2f2f2; color: black;"/>
            <textarea v-if="newItem.itemType == 'Note'" v-model="newItem.text" placeholder="Contenido..." style="border-radius: 5px; height: 100px; width: 300px; background-color: #f2f2f2; color: black; resize: none"></textarea>
            <textarea v-if="newItem.itemType == 'Notice'" v-model="newItem.text" placeholder="Contenido..." maxlength="1000" style="border-radius: 5px; height: 100px; width: 300px; background-color: #f2f2f2; color: black; resize: none"></textarea>

            <div v-if="newItem.itemType == 'Timer'" style="display: inline-flex; vertical-align: middle; align-items: center;">
              <input v-model="hours" type="number" min="0" placeholder="Hor" style="border-top-left-radius: 5px; border-bottom-left-radius: 5px ; margin-top: 5px; margin-right:5px; height:30px; width: 56px; background-color: #f2f2f2; color: black"/>
              :<input v-model="minutes" type="number" min="0" placeholder="Min" style="margin-top:5px; margin-right: 5px; height:30px; width: 56px; background-color: #f2f2f2; color: black"/>
              :<input v-model="seconds" type="number" min="0" placeholder="Seg" style="border-top-right-radius: 5px; border-bottom-right-radius: 5px ; margin-top: 5px; margin-right:5px; height:30px; width: 56px; background-color: #f2f2f2; color: black"/>
            </div>
          </div>
          <button @click="handleNewItemForm()" style="margin-top:15px">Crear</button>
      </template>
    </Modal>

    <Modal class="modal" :isOpen="isModalOpened" @modal-close="closeModal" name="first-modal">
      <template #header><strong>Compartir archivo</strong></template>
      <template #content>
        
        <div v-if="selectedFile?.sharedWith.length === 0">
          <p>Este archivo no se ha compartido</p>
        </div>

        <div v-else>
          <p>Compartido con:</p>
          <table style="border-collapse: collapse; width: 100%; height: 100%;">
            <tbody style="display: table; justify-items: center; width: 100%; height: 100%;">
              <tr v-for="shared in selectedFile?.sharedWith" :key="shared.user._id" style="display: table-row;">
                <td style="padding: 0px; text-align: center;">{{ shared.user.username }}</td>
                <td style="padding: 0px; margin-left: 5px; margin-right: 5px;">-</td>
                <td style="padding: 0px; text-align: center;">{{ translatePerm(shared.perm) }}</td>
                <td style="padding: 0px; color: red; cursor: pointer; padding-top: 6px;" class="material-symbols-outlined" @click="changePerms('none', shared.user.username)">close</td>
              </tr>
            </tbody>
          </table>
        </div>
        
      </template>
      <template #footer>
        <div style="margin-top:20px">

          <div class="error" v-if="errorMessage.length !== 0">
            <p style="margin-top: 5px; margin-bottom: 5px;" v-for="error in errorMessage">{{ error }}</p>
          </div>

          <input type="text" v-model="shareWith" placeholder="Comparta con username" style="margin-right:5px; background-color: #f2f2f2; color: black"/>
          <select v-model="sharePerm" style="background-color: #f2f2f2; color: black;">
            <option value="view">Vista</option>
            <option value="read">Lectura</option>
            <option value="write">Escritura</option>
          </select>
          <button @click="changePerms(sharePerm, shareWith).then(clearModalFields())" style="margin-top:10px">Compartir</button>
        </div>
      </template>
    </Modal>
  </div>
</template>

<style scoped>

.container {
  display: flex;
  align-items: center;
}

.files-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 20px;
  flex-wrap: wrap;
}

.file-container {
  margin: 10px;
  padding: 10px;
  border: 1px solid #C8B1E4;
  border-radius: 10px;
  width: 150px;
  height: 175px;
}

.file-img {
  margin-bottom: 10px;
  justify-self: flex-start;
}
.filename {
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

.sidebar.show + .sidebar-overlay {
  display: block;
}

.sidebar ul {
  list-style-type: none; 
  padding: 0; 
}

.sidebar ul li {
  padding: 10px;
}

.container {
  position: relative;
  overflow-x: hidden;
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

.sidebar.show + .sidebar-overlay {
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
  z-index: 998;
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
.main-sidebar-toggle-opened{
  top: 15px;
  left: 275px;
  z-index: 999;
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

.material-symbols-outlined {
  font-variation-settings:
  'FILL' 0,
  'wght' 400,
  'GRAD' 0,
  'opsz' 24
}

.filledHeart {
  font-variation-settings:
  'FILL' 1
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

.selected_folder {
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
  box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2);
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

</style>