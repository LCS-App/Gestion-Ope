// Auth Microsoft (MSAL), config Dataverse, stockage Graph (legacy)
/* ═══════════════════════════════════════
   STORAGE
═══════════════════════════════════════ */
/* ══ Microsoft Graph / OneDrive : auth + données ══ */
(function(){
  // En aperçu intégré (iframe) ou en #demo, on saute MSAL : l'auth par redirection
  // ne peut pas fonctionner dans un iframe, et la démo n'en a pas besoin.
  var iframed = false; try { iframed = (window.parent !== window); } catch(e){ iframed = true; }
  if(location.hash==='#demo' || iframed) return;
  var s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/@azure/msal-browser@2.38.3/lib/msal-browser.min.js';
  s.onload = function(){ bootMsal(); };
  s.onerror = function(){ showLoginScreen(true, 'Impossible de charger MSAL. Vérifiez votre connexion internet.'); };
  document.head.appendChild(s);
})();

function showLoginScreen(show, errMsg=''){
  const ls=document.getElementById('login-screen');
  if(ls) ls.style.display = show ? 'flex' : 'none';
  if(errMsg){ const e=document.getElementById('login-error'); if(e) e.textContent=errMsg; }
}
/* Comptes autorisés sur l'application complète. Pour en ajouter : une adresse de plus dans cette liste. Les autres comptes sont renvoyés vers planning.html. */
const RESPONSABLES = [
  'jonathan.garcia@conciergerie-solidaire.fr',
  'ines.bultez@conciergerie-solidaire.fr',
  'charlotte.delineau@conciergerie-solidaire.fr',
  'quentin.renaud@conciergerie-solidaire.fr',
  'ilana.auque@conciergerie-solidaire.fr'
];
function afterAuth(account){
  const mail=((account&&account.username)||'').trim().toLowerCase();
  if(mail && !RESPONSABLES.includes(mail)){ location.replace(location.href.replace(/[^\/]*$/,'')+'planning.html'); return; }
  showLoginScreen(false);
  const el=document.getElementById('user-info');
  if(el && account) el.textContent = account.name || account.username || '';
  _dvBadge();
  _dvEnsureConsent(account).then(()=>loadAllData()).then(()=>{ seed(); migrateTournees(); migrateAgentTypes(); migrateNomPrenom(); _dvSnapshot(); _dvBackfillFiliale().catch(e=>console.warn('Filiale',e)); _warnNomsIncomplets(); _fixRemplSansAbsence(); updateAbsenceBadge(); showView('planning'); })
    .catch(e=>{ console.error(e); if(e && e.accessDenied) showAccessDenied(account,e); else { showSyncStatus(''); alert('Lecture Dataverse impossible :\n\n'+e.message); } });
}
/* Première ouverture : le compte vient de la session de l'app principale (Graph) — le jeton Dataverse
   exige un consentement, impossible en silencieux → une redirection Microsoft, une seule fois. */
async function _dvEnsureConsent(account){
  try { _token = await msalApp.acquireTokenSilent({ scopes: SCOPES, account }); sessionStorage.removeItem('dv-consent'); }
  catch(e){
    if(sessionStorage.getItem('dv-consent')){ sessionStorage.removeItem('dv-consent'); throw new Error('Accès Dataverse refusé ('+(e.errorCode||e.message)+')'); }
    sessionStorage.setItem('dv-consent','1');
    showSyncStatus('Autorisation Dataverse…');
    await msalApp.acquireTokenRedirect({ scopes: SCOPES, account });
    await new Promise(()=>{});
  }
}
function showAccessDenied(account,err){
  showLoginScreen(false);
  const who = account ? (account.username || account.name || '') : '';
  const w=document.getElementById('who-denied'); if(w) w.textContent = who + (err&&err.message ? '\n' + err.message.slice(0,260) : '');
  if(w) w.style.whiteSpace='pre-wrap';
  const s=document.getElementById('access-denied-screen'); if(s) s.style.display='flex';
}
async function ensureStorageReady(){ if(!SHARED) await resolveStorage(); }
function login(){
  showLoginScreen(true,'');
  if(!window._msalApp){ showLoginScreen(true,'MSAL non initialisé'); return; }
  window._msalApp.loginRedirect({ scopes: SCOPES })
    .catch(e=>showLoginScreen(true,'Erreur : '+e.message));
}
function logout(){ if(window._msalApp) window._msalApp.logoutRedirect(); }
function bootMsal(){
  try {
    if(typeof msal === 'undefined' || !msal.PublicClientApplication){ showLoginScreen(true,'MSAL non chargé (script bloqué ?).'); return; }
    msalApp = new msal.PublicClientApplication(MSAL_CONFIG);
    window._msalApp = msalApp;
  } catch(e){ showLoginScreen(true,'Erreur MSAL : '+e.message); return; }
  Promise.resolve(msalApp.initialize ? msalApp.initialize() : null)
   .then(()=>msalApp.handleRedirectPromise())
   .then(()=>{ const a=msalApp.getAllAccounts(); if(a.length){ afterAuth(a[0]); } else { showLoginScreen(true); } })
   .catch(e=>showLoginScreen(true,'Erreur : '+e.message));
}

const MSAL_CONFIG = {
  auth: {
    clientId: '99c4bf43-6e9f-4b9d-839c-eab0e1716357',
    authority: 'https://login.microsoftonline.com/4dffba4f-a634-4907-bf2a-a4e013bbf6d3',
    redirectUri: window.location.origin + window.location.pathname,
  },
  cache: { cacheLocation: 'localStorage' }
};
/* FORK DATAVERSE — lecture + écriture dans les tables lcs_ (DV_READONLY = true pour repasser en lecture seule). */
const DV_URL = 'https://orgfad8e0a9.crm12.dynamics.com';
const DV_API = DV_URL + '/api/data/v9.2/';
const DV_READONLY = false;
const SCOPES = [DV_URL + '/user_impersonation'];
const FOLDER  = 'GestionOpe';
const FILES   = ['sites','agents','affec','absences','rempl','pointage','tournees','except','fermetures','evenements'];

/* Dossier d'équipe partagé (SharePoint/Teams). L'app résout ce lien une fois,
   puis lit/écrit tous les JSON dedans — mêmes données pour toute l'équipe.
   Repli automatique sur le OneDrive perso si le partagé est injoignable. */
const SHARE_URL = 'https://conciergeriesolidaire.sharepoint.com/:f:/s/LCS33-Equipe33/IgBSomhnITOJS7Iylw4q5EX7ASSJmiivDD9yY8B61Moyiyc?e=PDbkzu';
var SHARED = null; // { driveId, itemId } une fois résolu

var DEMO_MODE=false;
var msalApp, _token = null, _cache = {}, _syncTimers = {};

/* Jeton Graph : renouvellement silencieux avec 5 min de marge.
   On ne redirige JAMAIS automatiquement (ça rechargeait la page en pleine saisie
   et donnait l'impression d'une déconnexion après chaque modif) : si le silencieux
   échoue vraiment, on affiche une bande « Session expirée » avec un bouton
   Reconnecter qui passe par une popup — la page et les modifs en cours sont conservées. */
const _TOKEN_MARGIN_MS = 5*60*1000;
async function getToken(){
  if(_token && _token.expiresOn && (_token.expiresOn.getTime() - Date.now()) > _TOKEN_MARGIN_MS) return _token.accessToken;
  const account = msalApp.getAllAccounts()[0];
  if(!account){ _requireReauth(); throw new Error('Session expirée'); }
  try {
    const r = await msalApp.acquireTokenSilent({ scopes: SCOPES, account });
    _token = r; _clearReauth(); return r.accessToken;
  } catch(e1){
    try {
      const r = await msalApp.acquireTokenSilent({ scopes: SCOPES, account, forceRefresh: true });
      _token = r; _clearReauth(); return r.accessToken;
    } catch(e2){
      _requireReauth();
      throw new Error('Session expirée — reconnexion nécessaire');
    }
  }
}

function _reauthBanner(){
  let el = document.getElementById('reauth-banner');
  if(!el){
    el = document.createElement('div');
    el.id = 'reauth-banner';
    el.style.cssText = 'display:none;position:fixed;top:0;left:0;right:0;z-index:10001;background:var(--text);color:#fff;font-size:13px;font-weight:700;padding:9px 12px;box-shadow:var(--shadow-lg);align-items:center;justify-content:center;gap:14px';
    el.innerHTML = '<span>Session Microsoft expirée — vos modifications sont conservées.</span>'
      + '<button onclick="reauth()" style="height:28px;padding:0 14px;background:var(--blue);color:#000;border:none;border-radius:7px;font-family:inherit;font-size:12.5px;font-weight:800;cursor:pointer">Reconnecter</button>';
    document.body.prepend(el);
  }
  return el;
}
function _requireReauth(){ _reauthBanner().style.display='flex'; }
function _clearReauth(){ const el=document.getElementById('reauth-banner'); if(el) el.style.display='none'; }

/* Reconnexion sans perdre la page : popup d'abord, redirection en dernier recours. */
async function reauth(){
  const account = msalApp.getAllAccounts()[0];
  try {
    const r = await msalApp.acquireTokenPopup(account ? { scopes: SCOPES, account } : { scopes: SCOPES });
    _token = r; _clearReauth();
    Object.entries(_cache).forEach(([k,v])=>{ if(FILES.includes(k)) _attemptSave(k, v, 0); });
    toast('Reconnecté');
  } catch(e){
    msalApp.acquireTokenRedirect({ scopes: SCOPES });
  }
}
async function graphGet(path){
  const token = await getToken();
  const r = await fetch('https://graph.microsoft.com/v1.0'+path, { headers: { Authorization: 'Bearer '+token } });
  if(!r.ok) throw new Error('GET '+path+' → '+r.status);
  return r.json();
}
function encodeShareUrl(url){
  const b64 = btoa(unescape(encodeURIComponent(url)));
  return 'u!' + b64.replace(/=+$/,'').replace(/\//g,'_').replace(/\+/g,'-');
}

/* Résout le dossier partagé → { driveId, itemId }.
   Plus de repli OneDrive perso : si le dossier d'équipe est injoignable,
   c'est que l'utilisateur n'y a pas accès → accès refusé. */
async function resolveStorage(){
  if(!SHARE_URL){ const e=new Error('Aucun espace partagé configuré.'); e.accessDenied=true; throw e; }
  try {
    const item = await graphGet(`/shares/${encodeShareUrl(SHARE_URL)}/driveItem?$select=id,parentReference,name`);
    if(item && item.id && item.parentReference && item.parentReference.driveId){
      SHARED = { driveId: item.parentReference.driveId, itemId: item.id };
      return;
    }
    throw new Error('Réponse inattendue du dossier partagé.');
  } catch(e){
    console.warn('Dossier partagé injoignable :', e.message);
    const err = new Error('Vous n’avez pas accès à l’espace d’équipe.'); err.accessDenied = true; throw err;
  }
}

async function ensureFolder(){
  try { await graphGet(`/me/drive/root:/${FOLDER}`); }
  catch {
    await fetch('https://graph.microsoft.com/v1.0/me/drive/root/children', {
      method:'POST', headers:{ Authorization:'Bearer '+(await getToken()), 'Content-Type':'application/json' },
      body: JSON.stringify({ name: FOLDER, folder: {}, '@microsoft.graph.conflictBehavior':'rename' })
    });
  }
}

function fileUrl(name){
  return SHARED
    ? `https://graph.microsoft.com/v1.0/drives/${SHARED.driveId}/items/${SHARED.itemId}:/${name}.json:/content`
    : `https://graph.microsoft.com/v1.0/me/drive/root:/${FOLDER}/${name}.json:/content`;
}
async function readFile(name){
  try {
    const token = await getToken();
    const r = await fetch(fileUrl(name), { headers:{ Authorization:'Bearer '+token } });
    if(!r.ok) return [];
    return await r.json();
  } catch { return []; }
}
async function writeFile(name, data){
  const token = await getToken();
  const r = await fetch(fileUrl(name), {
    method:'PUT', headers:{ Authorization:'Bearer '+token, 'Content-Type':'application/json' }, body: JSON.stringify(data)
  });
  if(!r.ok){
    // 401/403 : jeton périmé côté serveur → on l'invalide, la tentative suivante le renouvelle.
    if(r.status===401 || r.status===403) _token = null;
    throw new Error('PUT '+name+' → '+r.status);
  }
  _cache[name] = data;
}
