import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './assets/css/style.css'
import '@fortawesome/fontawesome-free/css/all.css'

function applyFavicon() {
  const link = document.querySelector('link[rel="icon"][data-favicon]')
  if (!link) return
  const darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches
  link.href = darkMode ? './LogoMark-Light.png' : './LogoMark-Dark.png'
}

applyFavicon()
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyFavicon)

const app = createApp(App)

app.use(router)

app.mount('#app')
