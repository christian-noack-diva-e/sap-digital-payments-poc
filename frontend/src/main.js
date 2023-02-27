import { createApp } from 'vue'
import { createLogger } from 'vue-logger-plugin'
import App from './App.vue'

import './assets/main.css'

createApp(App)
    .use(createLogger({
        prefixFormat: ({ level, caller }) => (
            level.toUpperCase() + ' [' + new Date().toUTCString() + ']'
        )
    }))
    .mount('#app')
