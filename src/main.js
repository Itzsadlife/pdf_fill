import './assets/main.css'
import 'bootstrap/dist/css/bootstrap.min.css';

import { createApp } from 'vue'
import App from './App.vue'
import { VueSignaturePad } from 'vue-signature-pad';

const app = createApp(App)
app.component("VueSignaturePad", VueSignaturePad);
app.mount('#app')