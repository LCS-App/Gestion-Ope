// Import / export JSON
/* ═══════════════════════════════════════
   IMPORT / EXPORT
═══════════════════════════════════════ */
function exportData(){
  const user = getCurrentUser();
  if(!user){ toast('Définissez votre nom avant d\'exporter', false); openDataModal(); return; }

  const data = {};
  DATA_KEYS.forEach(k => data[k] = DB.get(k));
  data._version = (_loadedVersion || 0) + 1;
  data._lastModifiedBy = user;
  data._lastModifiedAt = new Date().toISOString();
  data._appVersion = '2.1';

  // Met à jour la version locale
  _loadedVersion = data._version;
  _loadedMeta = data;
  updateSyncBar(data);

  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'gestion-ope-data.json';
  a.click();
  toast(`v${data._version} exportée — remplacez le fichier partagé`);
}

function importData(file){
  if(!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);

      // Vérifier conflit : version chargée < version du fichier ET on a des données locales
      const hasLocalData = DB.get('agents').length > 0;
      const fileVersion = data._version || 0;
      if(hasLocalData && _loadedVersion > 0 && fileVersion < _loadedVersion){
        // Notre version est plus récente — pas de conflit, on écrase le fichier
      }
      if(hasLocalData && _loadedVersion > 0 && fileVersion > _loadedVersion){
        // Le fichier est plus récent — OK, on charge
      }
      if(hasLocalData && _loadedVersion > 0 && fileVersion === _loadedVersion &&
         data._lastModifiedBy && data._lastModifiedBy !== getCurrentUser()){
        // Même version mais modifié par quelqu'un d'autre — conflit potentiel
        _pendingImportData = data;
        showConflictWarning(data);
        return;
      }

      applyImport(data);
    } catch {
      toast('Fichier invalide', false);
    }
  };
  reader.readAsText(file);
}

function applyImport(data){
  DATA_KEYS.forEach(k => { if(data[k]) DB.set(k, data[k]); });
  _loadedVersion = data._version || 0;
  _loadedMeta = data;
  updateSyncBar(data);
  closeDataModal();
  hideConflictWarning();
  toast(`v${_loadedVersion} chargée ✓`);
  updateAbsenceBadge();
  showView('planning');
}

function showConflictWarning(data){
  const el = document.getElementById('conflict-warning');
  if(!el) return;
  const who = data._lastModifiedBy || '?';
  const when = fmtRelative(data._lastModifiedAt);
  document.getElementById('conflict-text').innerHTML =
    `<svg viewBox="0 0 24 24" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><path d="M12 3.6l9 15.4H3z"/><path d="M12 9.6v4.6M12 17.2v.4"/></svg> Ce fichier a été modifié par <strong>${who}</strong> ${when}.<br>
     Charger ce fichier remplacera vos données locales non exportées.`;
  el.style.display = 'block';
}

function hideConflictWarning(){
  const el = document.getElementById('conflict-warning');
  if(el) el.style.display = 'none';
  _pendingImportData = null;
}

function confirmImport(){
  if(_pendingImportData) applyImport(_pendingImportData);
}

function openDataModal(){
  // Si pas de nom utilisateur → montrer l'étape nom d'abord
  const user = getCurrentUser();
  document.getElementById('step-name').style.display = user ? 'none' : 'block';
  document.getElementById('step-sync').style.display = user ? 'block' : 'none';
  if(user) document.getElementById('modal-username-display').textContent = user;
  hideConflictWarning();
  document.getElementById('data-modal').style.display = 'flex';
}

function closeDataModal(){
  document.getElementById('data-modal').style.display = 'none';
}

function skipImport(){
  const user = getCurrentUser();
  if(!user){ toast('Entrez votre nom pour continuer', false); return; }
  closeDataModal();
  updateAbsenceBadge();
  showView('planning');
}

function saveName(){
  const name = document.getElementById('input-username').value.trim();
  if(!name){ toast('Entrez votre prénom', false); return; }
  setCurrentUser(name);
  document.getElementById('step-name').style.display = 'none';
  document.getElementById('step-sync').style.display = 'block';
  document.getElementById('modal-username-display').textContent = name;
}

