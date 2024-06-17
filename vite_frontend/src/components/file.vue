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
import { Alignment } from '@ckeditor/ckeditor5-alignment';  // Importing the package.
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
            console.log('Data saved');
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

const loadTransformedFile = async () => {
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

onBeforeMount(async () => {
    if(props.item.ready){
        switch(props.item.name.split('.').pop()){
        case 'pdf':
            await loadFile();
            appToUse.value = 'pdf';
            break;
        case 'docx':
            await loadTransformedFile();
            appToUse.value = 'CKEditor';
            break;
        default:
            appToUse.value = '';
            break;
        }
    }
});

</script>

<template>
    {{ errorMessage }}
    <div v-if="!props.item.ready">
        <h2>El archivo se está procesando. Inténtelo de nuevo en unos minutos...</h2>
        <img :src="'/loading.gif'" alt="item.name" width="100" height="100"/>
    </div>
    <div v-else>
        <div v-if="appToUse === 'pdf'" style="display:flex; justify-content: center;">
            <pdf-embed annotation-layer text-layer :source="url" :width="600" :height="800" />
        </div>
        <div v-if="appToUse === 'CKEditor'" style="color:black">
            <input type="file" ref="fileInput" @change="handleFileInputChange">
            <ckeditor :editor="ClassicEditor" v-model="editorData" :config="editorConfig"></ckeditor>

        </div>
    </div>
</template>