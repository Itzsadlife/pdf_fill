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
      :pdf="pdf"
      @loaded="onLoaded"
      annotation-layer
      @text-loaded="onLoaded"
      @annotation-loaded="onLoaded"
      @annotation="onAnnotation"
    />
    <button @click="saveAndFlattenPdf">Save and Flatten</button>
    <button @click="save">Save Without Flatten</button>

    <div class="container">
      <VueSignaturePad
        id="signature"
        width="100%"
        height="200px"
        ref="signaturePad"
        :options="options"
      />
    </div>
    <div class="buttons">
      <button @click="undo">Undo</button>
      <button @click="saveSignature">Save Signature</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from "vue";
import { VuePDF, usePDF } from "@tato30/vue-pdf";
import "@tato30/vue-pdf/style.css";
import axios from "axios";

// Initialize selected PDF
const selectedPdf = ref("/src/assets/Acknowlegement Receipt IBPO.pdf");
const pdfUrl = ref(selectedPdf.value);

const { pdf } = usePDF(pdfUrl);

const formAnnotations = ref([]);
const signatureData = ref("");

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

const saveAndFlattenPdf = async () => {
  const existingPdfBytes = await fetch(pdfUrl.value).then((res) => res.arrayBuffer());
  const { PDFDocument } = await import("pdf-lib");
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

  if (signatureData.value) {
    const pngImage = await pdfDoc.embedPng(signatureData.value);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    firstPage.drawImage(pngImage, {
      x: 50,
      y: 50,
      width: 150,
      height: 50,
    });
  }

  form.flatten();

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
};

const save = async () => {
  const existingPdfBytes = await fetch(pdfUrl.value).then((res) => res.arrayBuffer());
  const { PDFDocument } = await import("pdf-lib");
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

  if (signatureData.value) {
    const pngImage = await pdfDoc.embedPng(signatureData.value);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    firstPage.drawImage(pngImage, {
      x: 50,
      y: 50,
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
    console.log(response.data);
    await loadPdf();
  } catch (error) {
    console.error("Error saving PDF:", error);
  }
};

const options = ref({
  penColor: "#c0f",
});

const undo = () => {
  signaturePad.value.undoSignature();
};

const saveSignature = () => {
  const { data } = signaturePad.value.saveSignature();
  signatureData.value = data;
  console.log("Saved signature data", data);
};

const signaturePad = ref(null);

watch(selectedPdf, (newVal) => {
  console.log(`Selected PDF changed to: ${newVal}`);
  loadPdf();
});

onMounted(() => {
  console.log("Component mounted. Loading initial PDF.");
  loadPdf();
});
</script>

<style>
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
</style>
