<template>
  <div>
    <select v-model="selectedPdf" @change="loadPdf">
      <option value="/src/assets/Acknowlegement Receipt IBPO.pdf">
        Acknowlegement Receipt IBPO
      </option>
      <option value="/src/assets/Authorisation Letter - AFFIN & LIBBWEI.pdf">
        Authorisation Letter - AFFIN & LIBBWEI
      </option>
    </select>

    <VuePDF
      ref="VPDF"
      :pdf="pdf"
      @loaded="onLoaded"
      annotation-layer
      @text-loaded="onLoaded"
      @annotation-loaded="onLoaded"
      @annotation="onAnnotation"
    />
    <button @click="save(true)">Save and Flatten</button>
    <button @click="save(false)">Save Without Flatten</button>

    <!-- Consultant Signature Modal -->
    <div v-if="showConsultantSignatureModal" class="modal">
      <div class="modal-content">
        <span class="close" @click="showConsultantSignatureModal = false">&times;</span>
        <h2>Consultant Signature</h2>
        <VueSignaturePad
          id="consultantSignature"
          width="100%"
          height="200px"
          ref="consultantSignaturePad"
          :options="signatureOptions"
        />
        <div class="buttons">
          <button @click="undo('consultant')">Undo</button>
          <button @click="saveSignature('consultant')">Save Signature</button>
        </div>
      </div>
    </div>

    <!-- User Signature Modal -->
    <div v-if="showUserSignatureModal" class="modal">
      <div class="modal-content">
        <span class="close" @click="showUserSignatureModal = false">&times;</span>
        <h2>User Signature</h2>
        <VueSignaturePad
          id="userSignature"
          width="100%"
          height="200px"
          ref="userSignaturePad"
          :options="signatureOptions"
        />
        <div class="buttons">
          <button @click="undo('user')">Undo</button>
          <button @click="saveSignature('user')">Save Signature</button>
        </div>
      </div>
    </div>

    <!-- Buttons to trigger modals -->
    <button @click="showConsultantSignatureModal = true">Add Consultant Signature</button>
    <button @click="showUserSignatureModal = true">Add User Signature</button>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from "vue";
import { VuePDF, usePDF } from "@tato30/vue-pdf";
import "@tato30/vue-pdf/style.css";
import { PDFDocument } from "pdf-lib";
import axios from "axios";

// Initialize selected PDF
const selectedPdf = ref("/src/assets/Acknowlegement Receipt IBPO.pdf");
const pdfUrl = ref(selectedPdf.value);
const VPDF = ref({});
const { pdf } = usePDF(pdfUrl);

const formAnnotations = ref([]);
const consultantSignatureData = ref("");
const userSignatureData = ref("");

// Modal controls
const showConsultantSignatureModal = ref(false);
const showUserSignatureModal = ref(false);

const signatureOptions = ref({
  penColor: "#000",
});

// Load PDF from backend
const loadPdf = async () => {
  try {
    const response = await axios.get("http://localhost:3001/get-pdf-url");
    console.log("PDF URLs received:", response.data.pdfUrls);
    const fileName = selectedPdf.value.split("/").pop();
    pdfUrl.value = response.data.pdfUrls[fileName];
    console.log("pdfUrl.value", pdfUrl.value);
  } catch (error) {
    console.error("Error loading PDF URL:", error);
  }
};

const onLoaded = (pageData) => {
  console.log("Page loaded:", pageData);
};

const onAnnotation = (value) => {
  console.log(value);
  formAnnotations.value.push(value);
};

const drawSignature = async (type, data) => {
  const existingPdfBytes = await fetch(pdfUrl.value).then((res) => res.arrayBuffer());
  const pdfDoc = await PDFDocument.load(existingPdfBytes);

  if (type === 'consultant' && data) {
    const pngImage = await pdfDoc.embedPng(data);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    firstPage.drawImage(pngImage, {
      x: 20,
      y: 210,
      width: 150,
      height: 50,
    });
  } else if (type === 'user' && data) {
    const pngImage = await pdfDoc.embedPng(data);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    firstPage.drawImage(pngImage, {
      x: 320,
      y: 210,
      width: 150,
      height: 50,
    });
  }

  const pdfBytes = await pdfDoc.save();
  const pdfBlob = new Blob([pdfBytes], { type: "application/pdf" });
  const formData = new FormData();
  formData.append(
    "file",
    pdfBlob,
    selectedPdf.value.split("/").pop().replace(".pdf", "-modified.pdf")
  );

  try {
    const response = await axios.post("http://localhost:3001/save-pdf", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    console.log("response data", response.data);
    await loadPdf();
  } catch (error) {
    console.error("Error saving PDF:", error);
  }
  window.location.reload();
};

const saveSignature = (type) => {
  if (type === 'consultant') {
    const { data } = consultantSignaturePad.value.saveSignature();
    consultantSignatureData.value = data;
    showConsultantSignatureModal.value = false;
    console.log("Saved consultant signature data", data);
    drawSignature('consultant', data);
  } else if (type === 'user') {
    const { data } = userSignaturePad.value.saveSignature();
    userSignatureData.value = data;
    showUserSignatureModal.value = false;
    console.log("Saved user signature data", data);
    drawSignature('user', data);
  }
};

const save = async (flatten) => {
  const existingPdfBytes = await fetch(pdfUrl.value).then((res) => res.arrayBuffer());
  const pdfDoc = await PDFDocument.load(existingPdfBytes);

  const form = pdfDoc.getForm();
  const fields = form.getFields();
  const fieldNames = fields.map((field) => field.getName());

  formAnnotations.value.forEach((annotation) => {
    if (annotation.type === "form-text") {
      if (fieldNames.includes(annotation.data.fieldName)) {
        const textField = form.getTextField(annotation.data.fieldName);
        if (textField) {
          textField.setText(annotation.data.value);
        } else {
          console.warn(`No such field: ${annotation.data.fieldName}`);
        }
      }
    }
  });

  if (flatten) {
    form.flatten();
  }

  const pdfBytes = await pdfDoc.save();
  const pdfBlob = new Blob([pdfBytes], { type: "application/pdf" });
  const formData = new FormData();
  formData.append(
    "file",
    pdfBlob,
    selectedPdf.value.split("/").pop().replace(".pdf", "-modified.pdf")
  );

  try {
    const response = await axios.post("http://localhost:3001/save-pdf", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    console.log(response.data);
    await loadPdf();
  } catch (error) {
    console.error("Error saving PDF:", error);
  }
  window.location.reload();
};

const undo = (type) => {
  if (type === 'consultant') {
    consultantSignaturePad.value.undoSignature();
  } else if (type === 'user') {
    userSignaturePad.value.undoSignature();
  }
};

const consultantSignaturePad = ref(null);
const userSignaturePad = ref(null);

watch(()=> selectedPdf, (newVal) => {
  console.log(`Selected PDF changed to: ${newVal}`);
  loadPdf();
});

onMounted(() => {
  console.log("Component mounted. Loading initial PDF.");
  loadPdf();
});
</script>

<style>

#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}

#signature {
  border: double 3px transparent;
  border-radius: 5px;
  background-image: linear-gradient(white, white),
    radial-gradient(circle at top left, #4bc5e8, #9f6274);
  background-origin: border-box;
  background-clip: content-box, border-box;
}

.container {
  width: 100%;
  padding: 8px 16px;
}

.buttons {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-top: 8px;
}

.modal {
  display: block;
  position: fixed;
  z-index: 1;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  overflow: auto;
  background-color: rgb(0,0,0);
  background-color: rgba(0,0,0,0.4);
}

.modal-content {
  background-color: #fefefe;
  margin: 15% auto;
  padding: 20px;
  border: 1px solid #888;
  width: 80%;
}

.close {
  color: #aaa;
  float: right;
  font-size: 28px;
  font-weight: bold;
}

.close:hover,
.close:focus {
  color: black;
  text-decoration: none;
  cursor: pointer;
}
</style>
