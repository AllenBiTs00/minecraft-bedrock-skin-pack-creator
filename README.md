# Minecraft Bedrock Skin Pack Creator

A simple browser-based Minecraft Bedrock skin pack creator.

## Features

- Upload multiple PNG skins at once
- Keep the original PNG filenames unchanged
- Set a separate in-game display name for every skin
- Choose Steve / Classic or Alex / Slim geometry
- Choose the final skin pack name
- Generate a ready-to-import `.mcpack`
- Generates `manifest.json`, `skins.json`, `texts/en_US.lang`, and `texts/languages.json`
- Skin images stay in the browser and are not uploaded to a server

## Run locally

Open `index.html` in a browser, or serve the repository with any static web server.

## GitHub Pages

This repository is intended to be hosted as a static GitHub Pages site.

## Bedrock pack structure

```text
Skin Pack/
├── manifest.json
├── skins.json
├── SkinA.png
├── SkinB.png
└── texts/
    ├── en_US.lang
    └── languages.json
```

The generated pack follows the current documented Bedrock skin pack structure.
