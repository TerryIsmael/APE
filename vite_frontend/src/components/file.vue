<script setup>
import { ref, onBeforeMount, onMounted } from 'vue';
import Utils from '../utils/UtilsFunctions.js';
import PdfEmbed, { useVuePdfEmbed } from 'vue-pdf-embed';
import 'vue-pdf-embed/dist/style/index.css'
import 'vue-pdf-embed/dist/style/annotationLayer.css'
import 'vue-pdf-embed/dist/style/textLayer.css'
import CKEditor from '@ckeditor/ckeditor5-vue';
import { ClassicEditor } from '@ckeditor/ckeditor5-editor-classic';
import { Essentials } from '@ckeditor/ckeditor5-essentials';
import { Bold, Italic } from '@ckeditor/ckeditor5-basic-styles';
import { Link } from '@ckeditor/ckeditor5-link';
import { Paragraph } from '@ckeditor/ckeditor5-paragraph';
import { Alignment } from '@ckeditor/ckeditor5-alignment';
import { Autoformat } from '@ckeditor/ckeditor5-autoformat';
import { BlockQuote } from '@ckeditor/ckeditor5-block-quote';
import { Heading } from '@ckeditor/ckeditor5-heading';
import { Image, ImageCaption, ImageStyle, ImageToolbar, ImageUpload, ImageResize, PictureEditing } from '@ckeditor/ckeditor5-image';
import { Autosave } from '@ckeditor/ckeditor5-autosave';
import { Indent } from '@ckeditor/ckeditor5-indent';
import { List } from '@ckeditor/ckeditor5-list';
import { MediaEmbed } from '@ckeditor/ckeditor5-media-embed';
import { PasteFromOffice } from '@ckeditor/ckeditor5-paste-from-office';
import { Table, TableToolbar } from '@ckeditor/ckeditor5-table';
import { TextTransformation } from '@ckeditor/ckeditor5-typing';
import { CKBox, CKBoxImageEdit } from "@ckeditor/ckeditor5-ckbox";
import { CloudServices } from '@ckeditor/ckeditor5-cloud-services';
import { read, utils as xlsxUtils, writeFileXLSX  } from 'xlsx';
import WorkspaceUtils from '../utils/WorkspaceFunctions.js';

const props = defineProps({
    item: {
        type: Object,
        required: true
    },
    workspace: {
        type: Object,
        required: true
    },
    ws: {
        type: Object,
        required: true
    },
    path: {
        type: String,
        required: true
    }
});
const url = ref(null);
const errorMessage = ref([]);
const appToUse = ref(null);
const workspace = ref(props.workspace);
const isLoading = ref(true);
const editor = ref(ClassicEditor);
const editorConfig = {
    plugins: [
        Essentials,
        Bold,
        Italic,
        Link,
        Paragraph,
        Alignment,
        Autoformat,
        BlockQuote,
        Heading,
        Indent,
        Image,
        ImageToolbar,
        ImageCaption,
        ImageStyle,
        ImageUpload,
        ImageResize,
        Autosave,
        List,
        MediaEmbed,
        Paragraph,
        PasteFromOffice,
        Table,
        TableToolbar,
        TextTransformation,

    ],
    ckbox: {
            language: 'es'
    },
    autosave: {
        waitingTime: 3000,
        save( editor ) {
            return saveData( editor.getData() );
        }
    },
    language: 'es',
    toolbar: {
        items: [
            'undo',
            'redo',
            '|',
            'heading',
            'alignment',
            '|',
            'bold',
            'italic',
            'link',
            'bulletedList',
            'numberedList',
            '|',
            'outdent',
            'indent',
            '|',
            'imageUpload',
            'blockQuote',
            'insertTable',
            'mediaEmbed',
        ],
    },
    image: {
        resize: true,
        toolbar: [
        'imageTextAlternative',
        'toggleImageCaption',
        '|',
        'imageStyle:alignLeft',
        'imageStyle:alignCenter',
        'imageStyle:alignRight'
        ],
        styles: [
        'alignLeft',
        'alignCenter',
        'alignRight'
        ]
    },
    extraPlugins: ImageUpload,
    uploadUrl: '', 
    imageUploadUrl: '', 
    imageUploadParams: { bypassOnData: true }
};

const handleFileInputChange = (event) => {
  const file = event.target.files[0];
  if (file) {
    if (!file.type.startsWith('image/')) {
        errorMessage.value.push('El archivo seleccionado no es una imagen');
        return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
        editorData.value += `<img src="${reader.result}" alt="image" />`;
    };
  }
};


const editorData = ref(null);


const saveData = async () => {
    try {
        const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/file', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: "include",
            body: JSON.stringify({ workspace: props.workspace._id, fileId: props.item._id, content: editorData.value })
        });
        if (response.ok) {
            
        } else {
            errorMessage.value = [];
            const data = await response.json();
            if (data.error || data.errors) {
                Utils.parseErrorMessage(data, errorMessage);
            } else {
                throw new Error("Error al editar chat");
            }
        }
    } catch (error) {
        console.log(error);
    }
}

const loadFile = async () => {
    try {
        const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/file/download', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: "include",
            body: JSON.stringify({ workspace: props.workspace._id, fileId: props.item._id })
        });
        if (response.ok) {
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            url.value = blobUrl;
        } else {
            errorMessage.value = [];
            const data = await response.json();
            if (data.error || data.errors) {
                Utils.parseErrorMessage(data, errorMessage);
            } else {
                throw new Error("Error al editar chat");
            }
        }
    } catch (error) {
        console.log(error);
    }
};

const loadTransformedDOCXFile = async () => {
    try {
        const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/file/download', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: "include",
            body: JSON.stringify({ workspace: props.workspace._id, fileId: props.item._id, editorMode: true })
        });
        if (response.ok) {
            const blob = await response.blob();
            const reader = new FileReader();

            reader.onload = function (e) {
                editorData.value = e.target.result;
            };
            reader.onerror = function(event) {
                console.error('Error reading file:', event.target.error);
            };
            reader.readAsText(blob);
        } else {
            errorMessage.value = [];
            const data = await response.json();
            if (data.error || data.errors) {
                Utils.parseErrorMessage(data, errorMessage);
            } else {
                throw new Error("Error al editar chat");
            }
        }
    } catch (error) {
        console.log(error);
    }
};
const fileInput = ref(null);
const selectUploadFile = () => {
  errorMessage.value = [];
  fileInput.value.click();
};

const selectImage = (item) => {
  return Utils.selectImage(item);
};








const html = ref("");
const table = ref();

const loadTransformedXLSXFile = async () => {
    try {
        const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/file/download', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: "include",
            body: JSON.stringify({ workspace: props.workspace._id, fileId: props.item._id })
        });
        if (response.ok) {
            const buffer = await response.arrayBuffer();
            const readedBuffer = read(buffer);
            //console.log(readedBuffer);
            html.value = xlsxUtils.sheet_to_html(readedBuffer.Sheets[readedBuffer.SheetNames[0]]);
            //console.log(html.value); 
        } else {
            errorMessage.value = [];
            const data = await response.json();
            if (data.error || data.errors) {
                Utils.parseErrorMessage(data, errorMessage);
            } else {
                throw new Error("Error al editar chat");
            }
        }
    } catch (error) {
        console.log(error);
    }
};

const downloadFile = async () => {
  await WorkspaceUtils.downloadFile(workspace, ref(props.item), errorMessage);
};

onBeforeMount(async () => {
    if(props.item.ready){
        switch(props.item.name.split('.').pop()){
        case 'pdf':
            await loadFile();
            appToUse.value = 'pdf';
            break;
        case 'docx':
            await loadTransformedDOCXFile();
            appToUse.value = 'CKEditor';
            break;
        case 'xlsx':
            await loadTransformedXLSXFile();
            appToUse.value = 'Sheets';
            break;
        default:
            appToUse.value = '';
            break;
        }
    }
    isLoading.value = false;
});

</script>

<template>
    <div style="display: flex; justify-content: center; align-items: center; word-wrap: break-word; line-break: anywhere; justify-self: start;">
        <h1 @click="$router.push('/workspace/')" style="cursor: pointer; display: flex; align-items: center; margin-right: 10px;">
            <span style="color: #C8B1E4; font-size: 60px;" class="material-symbols-outlined">home</span>
            <span class="item-name-title" style="padding-bottom:10px">{{ item.name }}</span>
        </h1>
    </div>
    <div class="error" v-if="errorMessage.length !== 0 && !isModalOpened && !isNewWsModalOpened && !isEditNameModalOpened" style="display: flex; justify-content: space-between; padding-left: 2%;">
        <div>
            <p v-for="error in errorMessage" :key="error" style="margin-top: 5px; margin-bottom: 5px; text-align: center; position: relative;">
            {{ error }}
            </p>
        </div>
        <button @click="errorMessage = []" style="display: flex; align-items: top; padding: 0; padding-left: 5px; padding-top: 10px; background: none; border: none; cursor: pointer; color: #f2f2f2; outline: none;">
            <span style="font-size: 20px; "class="material-symbols-outlined">close</span>
        </button>
    </div>
    <div v-if="isLoading">
        <h2>Cargando...</h2>
        <img :src="'/loading.gif'" alt="item.name" width="100" height="100"/>
    </div>
    <div v-else>
        <div v-if="!props.item.ready">
            <h2>El archivo se está procesando. Inténtelo de nuevo en unos minutos...</h2>
            <img :src="'/loading.gif'" alt="item.name" width="100" height="100"/>
        </div>
        <div v-else>
            <div v-if="appToUse === 'pdf'" style="display:flex; flex-direction: column; align-items: center">
                <div style="max-height: 82vh; overflow-y: auto;">
                    <pdf-embed annotation-layer text-layer :source="url" :width="600" :height="800" />
                </div>
                <button @click="downloadFile" style="margin-top: 20px; width: 20%;">Descargar</button>
            </div>
            <div v-if="appToUse === 'CKEditor'" style="color:black">
                <input hidden type="file" ref="fileInput" @change="handleFileInputChange">
                <button @click="selectUploadFile" style="margin:5px">Subir imagen</button>
                <ckeditor :editor="ClassicEditor" v-model="editorData" :config="editorConfig"></ckeditor>
            </div>
            <div v-if="appToUse === 'Sheets'" style="display: flex; flex-direction: column;">
                <div class="xlsx-table" ref="table" v-html="html"></div>
                <div style="display:flex; justify-content: center;">
                <button @click="downloadFile" style="margin-top: 20px; width: 20%;">Descargar</button>
                </div>
            </div>
            <div v-if="!appToUse" style="display:flex; flex-direction:column; align-items: center;justify-content: center; height: 100%;">
                
                <div class="item-container">
                    <div>
                        <div>
                            <img class="item-img" :src="selectImage(item)" alt="item.name" width="100" height="100">
                        </div>
                        <div style="display:flex; align-items: center;">
                            <p class="item-name">{{ item.name }} </p>
                        </div>
                    </div>
                </div>
                <div style="display: flex; justify-content: center; align-items: center;">
                    <button @click="downloadFile" style="margin-top: 20px;">Descargar</button>
                </div>      
            </div>
        </div>
    </div>
</template>

<style>

.material-symbols-outlined {
  font-variation-settings:
    'FILL' 0,
    'wght' 400,
    'GRAD' 0,
    'opsz' 24;
}

.xlsx-table {
    border: 2px solid black;
    border-collapse: collapse;
    max-width: 100%;
    overflow-x: auto;
    max-height: 70vh;
    overflow-y: auto;
}

.xlsx-table table {
    width: 100%;
    border-collapse: collapse;

}

.xlsx-table table tbody tr td, 
.xlsx-table table thead tr th {
    border: 1px solid black!important; 
    padding: 25px;
    color:black;
    background-color: white;
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

.ck-editor__main, .ck-content {
    max-height: 70vh;
}

.item-name-title {
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
    padding-bottom:10px;
}

</style>