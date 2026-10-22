// Jeu de données démo
/* ═══════════════════════════════════════
   SEED
═══════════════════════════════════════ */
function seed(){
  if(gs().length) return;
  const sites=[
    {id:DB.id(),nom:'Aéroport de Bordeaux',adresse:'Aéroport Bordeaux Mérignac',groupe:'Tournée Michael',creneaux:[{jours:['Lun','Mar','Mer','Jeu','Ven'],debut:'09:00',fin:'12:00'},{jours:['Lun','Mar','Mer','Jeu','Ven'],debut:'13:00',fin:'17:00'}]},
    {id:DB.id(),nom:'Darwin',adresse:'Darwin Ecosystem, Bordeaux',groupe:'Tournée Karima',creneaux:[{jours:['Lun','Mar','Mer','Jeu','Ven'],debut:'09:00',fin:'17:00'}]},
    {id:DB.id(),nom:'Campus F. d\'Assise',adresse:'Bordeaux',groupe:'Tournée Karima',creneaux:[{jours:['Lun','Mar','Mer','Jeu','Ven'],debut:'08:00',fin:'12:00'},{jours:['Lun','Mar','Mer','Jeu','Ven'],debut:'13:00',fin:'17:00'}]},
    {id:DB.id(),nom:'BM / Alfred Daney',adresse:'85/87 bd Alfred Daney, Bordeaux',groupe:'Tournée Karima',client:'Bordeaux Métropole',creneaux:[{jours:['Mar'],debut:'10:00',fin:'11:00'}]},
    {id:DB.id(),nom:'Arcachon',adresse:'22 bd du Général Leclerc, Arcachon',groupe:'Tournée Elvira',creneaux:[{jours:['Lun','Mar','Mer','Jeu','Ven'],debut:'10:30',fin:'13:00'},{jours:['Lun','Mar','Mer','Jeu','Ven'],debut:'13:30',fin:'17:30'}]},
  ];
  ss(sites);
  const agents=[
    {id:DB.id(),nom:'NIPHON Michael',tel:'06 00 00 00 01',email:'michael@exemple.fr',notes:'Agent multisite — Tournée logistique',type:'logistique',remplacant:false},
    {id:DB.id(),nom:'EL HIMER Karima',tel:'06 79 10 68 56',email:'karima@exemple.fr',notes:'Tournées logistiques — Bordeaux Métropole',type:'logistique',remplacant:false},
    {id:DB.id(),nom:'AUGRAUD Charlie',tel:'06 32 46 68 39',email:'charlie@exemple.fr',notes:'Agent multisite — Remplaçant principal',type:'multisite',remplacant:true},
    {id:DB.id(),nom:'BIWOLÉ Amélie',tel:'06 87 70 04 10',email:'amelie@exemple.fr',notes:'Remplaçante disponible',type:'multisite',remplacant:true},
    {id:DB.id(),nom:'MICHITTU Aurélie',tel:'06 00 00 00 05',email:'aurelie@exemple.fr',notes:'Campus F. d\'Assise',type:'accueil',remplacant:false},
    {id:DB.id(),nom:'TAILLEFER Eloïse',tel:'06 00 00 00 06',email:'eloise@exemple.fr',notes:'Arcachon',type:'accueil',remplacant:false},
  ];
  sa(agents);
  const s=gs(), a=ga();
  saf([
    {id:DB.id(),agentId:a[0].id,siteId:s[0].id,jours:['Lun','Mer','Ven'],debut:'09:00',fin:'12:00',semaine:'toutes',notes:'Accueil matin'},
    {id:DB.id(),agentId:a[0].id,siteId:s[1].id,jours:['Mar','Jeu'],debut:'09:00',fin:'17:00',semaine:'toutes',notes:''},
    {id:DB.id(),agentId:a[1].id,siteId:s[1].id,jours:['Lun','Mar','Mer','Jeu','Ven'],debut:'09:00',fin:'12:00',semaine:'A',notes:'Semaine impaire'},
    {id:DB.id(),agentId:a[1].id,siteId:s[1].id,jours:['Lun','Mar','Mer','Jeu','Ven'],debut:'13:00',fin:'17:00',semaine:'B',notes:'Semaine paire'},
    {id:DB.id(),agentId:a[4].id,siteId:s[2].id,jours:['Lun','Mar','Mer','Jeu','Ven'],debut:'08:00',fin:'12:00',semaine:'toutes',notes:''},
    {id:DB.id(),agentId:a[4].id,siteId:s[2].id,jours:['Lun','Mar','Mer','Jeu','Ven'],debut:'13:00',fin:'17:00',semaine:'toutes',notes:''},
    {id:DB.id(),agentId:a[5].id,siteId:s[4].id,jours:['Lun','Mar','Mer','Jeu','Ven'],debut:'10:30',fin:'17:30',semaine:'toutes',notes:''},
  ]);
}

