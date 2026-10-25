const state = { skins: [] };
const skinInput = document.querySelector('#skinInput');
const skinList = document.querySelector('#skinList');
const emptyState = document.querySelector('#emptyState');
const packNameInput = document.querySelector('#packName');
const createButton = document.querySelector('#createButton');
const summaryText = document.querySelector('#summaryText');
const dropZone = document.querySelector('#dropZone');
const statusBox = document.querySelector('#status');

skinInput.addEventListener('change', () => addFiles(skinInput.files));
['dragenter', 'dragover'].forEach(type => dropZone.addEventListener(type, event => { event.preventDefault(); dropZone.classList.add('dragover'); }));
['dragleave', 'drop'].forEach(type => dropZone.addEventListener(type, event => { event.preventDefault(); dropZone.classList.remove('dragover'); }));
dropZone.addEventListener('drop', event => addFiles(event.dataTransfer.files));
dropZone.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') skinInput.click(); });
packNameInput.addEventListener('input', render);
createButton.addEventListener('click', createPack);

async function addFiles(fileList) {
  const files = [...fileList].filter(file => file.type === 'image/png' || file.name.toLowerCase().endsWith('.png'));
  if (!files.length) return setStatus('Please choose PNG skin files.');
  for (const file of files) {
    if (state.skins.some(skin => skin.file.name === file.name)) continue;
    try {
      const image = await loadImage(file);
      if (!((image.width === 64 && image.height === 64) || (image.width === 128 && image.height === 128))) {
        setStatus(`${file.name}: unsupported size ${image.width}×${image.height}. Use 64×64 or 128×128.`);
        continue;
      }
      state.skins.push({ id: crypto.randomUUID(), file, url: URL.createObjectURL(file), displayName: file.name.replace(/\.png$/i, ''), geometry: 'geometry.humanoid.custom' });
    } catch { setStatus(`${file.name}: could not be read as an image.`); }
  }
  skinInput.value = '';
  render();
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('invalid image')); };
    image.src = url;
  });
}

function render() {
  skinList.replaceChildren();
  emptyState.hidden = state.skins.length > 0;
  state.skins.forEach((skin, index) => {
    const card = document.createElement('article'); card.className = 'skin-card';
    const previewWrap = document.createElement('div'); previewWrap.className = 'preview-wrap';
    const preview = document.createElement('img'); preview.className = 'preview'; preview.src = skin.url; preview.alt = `${skin.displayName} preview`; previewWrap.appendChild(preview);
    const fields = document.createElement('div');
    const fileName = document.createElement('div'); fileName.className = 'file-name'; fileName.title = skin.file.name; fileName.textContent = skin.file.name;
    const nameInput = document.createElement('input'); nameInput.className = 'skin-name'; nameInput.type = 'text'; nameInput.maxLength = 80; nameInput.value = skin.displayName; nameInput.placeholder = 'In-game display name';
    nameInput.addEventListener('input', () => { skin.displayName = nameInput.value; updateSummary(); });
    const model = document.createElement('select'); model.className = 'model'; model.innerHTML = '<option value="geometry.humanoid.custom">Steve / Classic</option><option value="geometry.humanoid.customSlim">Alex / Slim</option>'; model.value = skin.geometry; model.addEventListener('change', () => skin.geometry = model.value);
    fields.append(fileName, nameInput, model);
    const remove = document.createElement('button'); remove.className = 'remove-button'; remove.type = 'button'; remove.textContent = 'Remove';
    remove.addEventListener('click', () => { URL.revokeObjectURL(skin.url); state.skins.splice(index, 1); render(); });
    card.append(previewWrap, fields, remove); skinList.appendChild(card);
  });
  updateSummary();
}

function updateSummary() {
  const validName = packNameInput.value.trim().length > 0;
  createButton.disabled = state.skins.length === 0 || !validName;
  if (!state.skins.length) summaryText.textContent = 'Add at least one valid skin to continue.';
  else if (!validName) summaryText.textContent = 'Enter a skin pack name to continue.';
  else summaryText.textContent = `${state.skins.length} skin${state.skins.length === 1 ? '' : 's'} ready to package.`;
}
function setStatus(message) { statusBox.textContent = message; }
function safeIdentifier(text, fallback) { const value = text.normalize('NFKD').replace(/[^A-Za-z0-9_]+/g, '_').replace(/^_+|_+$/g, ''); return value || fallback; }
function escapeLang(value) { return value.replace(/\\/g, '\\\\').replace(/\r?\n/g, ' '); }

function createManifest(headerUuid, moduleUuid) {
  return JSON.stringify({ header: { name: 'pack.name', version: [1, 0, 0], uuid: headerUuid }, modules: [{ version: [1, 0, 0], type: 'skin_pack', uuid: moduleUuid }], format_version: 1 }, null, 2);
}
function createSkinsJson(packId) {
  return JSON.stringify({ serialize_name: packId, localization_name: packId, skins: state.skins.map((skin, index) => ({ localization_name: `skin_${index + 1}`, geometry: skin.geometry, texture: skin.file.name, type: 'free' })) }, null, 2);
}
function createLang(packId, packName) {
  const lines = [`skinpack.${packId}=${escapeLang(packName)}`];
  state.skins.forEach((skin, index) => lines.push(`skin.${packId}.skin_${index + 1}=${escapeLang(skin.displayName.trim() || skin.file.name.replace(/\.png$/i, ''))}`));
  return `${lines.join('\n')}\n`;
}

async function createPack() {
  if (!window.JSZip) return setStatus('The ZIP library could not be loaded. Check your internet connection and try again.');
  if (!state.skins.length || !packNameInput.value.trim()) return;
  createButton.disabled = true; setStatus('Creating your .mcpack...');
  try {
    const packId = safeIdentifier(packNameInput.value, 'SkinPack');
    const zip = new JSZip();
    zip.file('manifest.json', createManifest(crypto.randomUUID(), crypto.randomUUID()));
    zip.file('skins.json', createSkinsJson(packId));
    zip.file('texts/en_US.lang', createLang(packId, packNameInput.value.trim()));
    zip.file('texts/languages.json', JSON.stringify(['en_US'], null, 2));
    for (const skin of state.skins) zip.file(skin.file.name, await skin.file.arrayBuffer());
    const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/octet-stream' });
    const downloadName = `${sanitizeFilename(packNameInput.value.trim())}.mcpack`;
    const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = downloadName; document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus(`Created ${downloadName}. Open it with Minecraft Bedrock to import the pack.`);
  } catch (error) { console.error(error); setStatus('Could not create the skin pack. Please try again.'); }
  finally { updateSummary(); }
}
function sanitizeFilename(value) { return value.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_').replace(/\s+/g, ' ').trim() || 'Skin Pack'; }
render();
