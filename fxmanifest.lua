fx_version 'cerulean'
game 'gta5'
author 'nnaridz'
version '1.0.0'
lua54 'yes'

ui_page 'interface/index.html'

files {
    'interface/index.html',
    'interface/style.css',
    'interface/app.js'
}

client_scripts {
    '@es_extended/imports.lua',
    'config.lua',
    'client/main.lua',
    'client/default.lua',
    'client/list.lua',
    'client/dialog.lua'
}
