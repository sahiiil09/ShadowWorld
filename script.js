import {
  firebaseDB,
  ref,
  set,
  onValue
} from "./firebase.js";

const ADMINS = [
  { username: "sd sahil", password: "saheen" },
  { username: "taskeen", password: "saheen" }
];

const TODAY = new Date().toLocaleDateString("en-IN");
const ROOT_PATH = "shadowWorld";

let db = {
  members: [],
  pending: [],
  attendance: {},
  rules: [
    "Loyalty se upar kuch nahi — group pehle.",
    "Shadow World ki baat bahar nahi jaani chahiye.",
    "Admins ka decision final hai.",
    "Attendance lazmi hai — 3 baar absent = warning.",
    "Respect karo ya chale jao."
  ]
};

let currentUser = null;
let currentRole = null;
let firstLoadDone = false;

function getInitials(n){
  return String(n || "")
    .split(" ")
    .filter(Boolean)
    .map(w => w[0])
    .join("")
    .toUpperCase()
    .slice(0,2);
}

async function saveDB(){
  try{
    await set(ref(firebaseDB, ROOT_PATH), db);
  }catch(e){
    console.error("Save error", e);
    alert("Data save nahi hua. Firebase rules check karo.");
  }
}

function loadDB(){
  onValue(ref(firebaseDB, ROOT_PATH), async (snapshot) => {
    if(snapshot.exists()){
      const data = snapshot.val();
      db = {
        members: Array.isArray(data.members) ? data.members : [],
        pending: Array.isArray(data.pending) ? data.pending : [],
        attendance: data.attendance || {},
        rules: Array.isArray(data.rules) ? data.rules : db.rules
      };
    }else{
      if(!db.attendance[TODAY]) db.attendance[TODAY] = {};
      await saveDB();
    }

    if(!db.attendance) db.attendance = {};
    if(!db.attendance[TODAY]) db.attendance[TODAY] = {};

    if(!firstLoadDone){
      firstLoadDone = true;
      showPage("pg-login");
      return;
    }

    if(currentRole === "admin"){
      renderAdmin();
    }

    if(currentRole === "member"){
      const mem = db.members.find(m => m.username === currentUser && !m.removed);
      if(mem) renderMemberPage(mem);
      else doLogout();
    }
  }, (error) => {
    console.error("Firebase load error", error);
    showPage("pg-login");
    showErr("login-err", "Firebase connection error. Rules check karo.");
  });
}

function showPage(id){
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  const page = document.getElementById(id);
  if(page) page.classList.add("active");

  document.getElementById("logout-btn").style.display =
    (id === "pg-login" || id === "pg-register" || id === "pg-loading") ? "none" : "block";
}

function showErr(id,msg){
  const e = document.getElementById(id);
  if(!e) return;
  e.textContent = msg;
  e.style.display = "block";
  setTimeout(() => e.style.display = "none", 3000);
}

function showOk(id,msg){
  const e = document.getElementById(id);
  if(!e) return;
  e.textContent = msg;
  e.style.display = "block";
  setTimeout(() => e.style.display = "none", 3000);
}

function doLogin(){
  const u = document.getElementById("login-user").value.trim();
  const p = document.getElementById("login-pass").value.trim();

  if(!u || !p){
    showErr("login-err", "Username aur password dono chahiye");
    return;
  }

  const adm = ADMINS.find(a => a.username === u && a.password === p);

  if(adm){
    currentUser = u;
    currentRole = "admin";
    showPage("pg-admin");
    renderAdmin();
    return;
  }

  const mem = db.members.find(m => m.username === u && m.password === p && !m.removed);

  if(mem){
    currentUser = u;
    currentRole = "member";
    showPage("pg-member");
    renderMemberPage(mem);
    return;
  }

  showErr("login-err", "Username ya password galat hai");
}

async function doRegister(){
  const name = document.getElementById("reg-name").value.trim();
  const user = document.getElementById("reg-user").value.trim();

  if(!name || !user){
    showErr("reg-err", "Naam aur username dono chahiye");
    return;
  }

  if(db.members.find(m => m.username === user) || db.pending.find(p => p.username === user)){
    showErr("reg-err", "Yeh username pehle se liya hua hai");
    return;
  }

  db.pending.push({
    id: Date.now(),
    name,
    username: user,
    requestedAt: TODAY
  });

  await saveDB();

  showOk("reg-ok", "Request bheji gayi! Admin password set karega.");
  document.getElementById("reg-name").value = "";
  document.getElementById("reg-user").value = "";
}

function doLogout(){
  currentUser = null;
  currentRole = null;
  document.getElementById("login-user").value = "";
  document.getElementById("login-pass").value = "";
  showPage("pg-login");
}

function renderMemberPage(mem){
  document.getElementById("mem-avatar").textContent = getInitials(mem.name);
  document.getElementById("mem-name").textContent = mem.name;
  document.getElementById("mem-role").textContent = mem.role || "Member";
  document.getElementById("mem-joined").textContent = "Joined: " + mem.joined;

  const todayAtt = (db.attendance[TODAY] || {})[mem.id];
  const statusEl = document.getElementById("att-big-status");
  const btnWrap = document.getElementById("att-btn-wrap");

  if(todayAtt){
    statusEl.textContent = "PRESENT";
    statusEl.className = "att-big-status att-present";
    btnWrap.innerHTML = '<div style="font-size:0.8rem;color:#00cc66;margin-top:0.5rem;">Aaj ki attendance lag gayi</div>';
  }else{
    statusEl.textContent = "NOT MARKED";
    statusEl.className = "att-big-status att-absent";
    btnWrap.innerHTML = '<button class="btn-red" style="width:auto;padding:0.65rem 2rem;" onclick="markAttendance()">MARK PRESENT</button>';
  }

  const logEl = document.getElementById("mem-att-log");
  const days = Object.keys(db.attendance);
  const myLogs = days.filter(d => db.attendance[d] && db.attendance[d][mem.id]);

  logEl.innerHTML = myLogs.length
    ? myLogs.reverse().map(d => `<div class="log-row"><span style="color:#888;">${d}</span><span style="color:#00cc66;font-size:0.8rem;">PRESENT</span></div>`).join("")
    : '<div style="color:#333;font-size:0.85rem;">Koi record nahi abhi tak</div>';
}

async function markAttendance(){
  const mem = db.members.find(m => m.username === currentUser);
  if(!mem) return;

  db.attendance[TODAY] = db.attendance[TODAY] || {};
  if(db.attendance[TODAY][mem.id]) return;

  db.attendance[TODAY][mem.id] = true;
  await saveDB();
  renderMemberPage(mem);
}

function adminTab(name,el){
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("on"));
  document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("on"));
  el.classList.add("on");
  document.getElementById("atab-" + name).classList.add("on");
}

function renderAdmin(){
  const active = db.members.filter(m => !m.removed);
  const presentToday = Object.values(db.attendance[TODAY] || {}).filter(v => v).length;

  document.getElementById("a-total").textContent = active.length;
  document.getElementById("a-present").textContent = presentToday;
  document.getElementById("a-pending").textContent = db.pending.length;

  document.getElementById("a-members-list").innerHTML = active.map(m => `
    <div class="member-row">
      <div class="avatar">${getInitials(m.name)}</div>
      <div class="member-info">
        <div class="m-name">${escapeHTML(m.name)} <span style="color:#555;font-size:0.75rem;">@${escapeHTML(m.username)}</span></div>
        <div class="m-meta">${escapeHTML(m.role || "Member")} · Pass: <span style="color:#cc0000;">${escapeHTML(m.password)}</span></div>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        <button class="btn-sm" onclick="adminEditPass(${m.id})">PASS</button>
        <button class="btn-danger-sm" onclick="adminKick(${m.id})">KICK</button>
      </div>
    </div>
  `).join("") || '<div style="color:#333;font-size:0.85rem;padding:0.5rem;">Koi active member nahi</div>';

  const removed = db.members.filter(m => m.removed);
  document.getElementById("a-removed-list").innerHTML = removed.map(m => `
    <div class="member-row" style="opacity:0.4;">
      <div class="avatar">${getInitials(m.name)}</div>
      <div class="member-info">
        <div class="m-name">${escapeHTML(m.name)}</div>
        <div class="m-meta">${escapeHTML(m.role || "Member")}</div>
      </div>
      <button class="btn-sm" onclick="adminRestore(${m.id})">RESTORE</button>
    </div>
  `).join("") || '<div style="color:#333;font-size:0.85rem;padding:0.5rem;">Koi removed member nahi</div>';

  document.getElementById("a-pending-list").innerHTML = db.pending.map(p => `
    <div class="pending-row">
      <div class="avatar">${getInitials(p.name)}</div>
      <div class="member-info">
        <div class="m-name">${escapeHTML(p.name)}</div>
        <div class="m-meta">@${escapeHTML(p.username)} · ${escapeHTML(p.requestedAt)}</div>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
        <input class="inp" placeholder="Password" id="ppass-${p.id}" style="width:90px;margin:0;padding:0.4rem 0.6rem;font-size:0.8rem;" />
        <input class="inp" placeholder="Role" id="prole-${p.id}" style="width:80px;margin:0;padding:0.4rem 0.6rem;font-size:0.8rem;" />
        <button class="btn-sm" onclick="adminApprove(${p.id})">OK</button>
        <button class="btn-danger-sm" onclick="adminReject(${p.id})">X</button>
      </div>
    </div>
  `).join("") || '<div style="color:#333;font-size:0.85rem;padding:0.5rem;">Koi pending request nahi</div>';

  const todayMap = db.attendance[TODAY] || {};
  document.getElementById("a-att-today").innerHTML = db.members.filter(m => !m.removed).map(m => `
    <div class="member-row">
      <div class="avatar">${getInitials(m.name)}</div>
      <div class="member-info">
        <div class="m-name">${escapeHTML(m.name)}</div>
        <div class="m-meta">@${escapeHTML(m.username)}</div>
      </div>
      <span class="badge ${todayMap[m.id] ? "badge-present" : "badge-absent"}">${todayMap[m.id] ? "PRESENT" : "ABSENT"}</span>
    </div>
  `).join("") || '<div style="color:#333;font-size:0.85rem;">Koi member nahi</div>';

  const days = Object.keys(db.attendance).reverse().slice(0,10);
  const totalActive = db.members.filter(m => !m.removed).length;
  document.getElementById("a-att-log").innerHTML = days.map(d => {
    const cnt = Object.values(db.attendance[d] || {}).filter(v => v).length;
    return `<div class="log-row"><span style="color:#888;">${escapeHTML(d)}</span><span style="color:#cc0000;font-weight:600;">${cnt}/${totalActive} present</span></div>`;
  }).join("") || '<div style="color:#333;font-size:0.85rem;">Koi log nahi</div>';

  document.getElementById("a-rules-list").innerHTML = db.rules.map((r,i) => `
    <div class="member-row" style="align-items:flex-start;">
      <div style="color:#cc0000;font-size:0.8rem;font-weight:700;min-width:24px;">0${i+1}</div>
      <div style="flex:1;font-size:0.85rem;color:#ccc;">${escapeHTML(r)}</div>
      <button class="btn-danger-sm" onclick="adminRemoveRule(${i})">X</button>
    </div>
  `).join("");
}

async function adminAddMember(){
  const name = document.getElementById("a-add-name").value.trim();
  const user = document.getElementById("a-add-user").value.trim();
  const pass = document.getElementById("a-add-pass").value.trim();
  const role = document.getElementById("a-add-role").value.trim() || "Member";

  if(!name || !user || !pass) return;
  if(db.members.find(m => m.username === user)){
    alert("Username pehle se hai");
    return;
  }

  db.members.push({
    id: Date.now(),
    name,
    username: user,
    password: pass,
    role,
    removed:false,
    joined:TODAY
  });

  document.getElementById("a-add-name").value = "";
  document.getElementById("a-add-user").value = "";
  document.getElementById("a-add-pass").value = "";
  document.getElementById("a-add-role").value = "";

  await saveDB();
  renderAdmin();
}

async function adminApprove(id){
  const p = db.pending.find(x => x.id === id);
  if(!p) return;

  const pass = document.getElementById("ppass-" + id)?.value.trim();
  const role = document.getElementById("prole-" + id)?.value.trim() || "Member";

  if(!pass){
    alert("Password set karo pehle");
    return;
  }

  db.members.push({
    id: Date.now(),
    name:p.name,
    username:p.username,
    password:pass,
    role,
    removed:false,
    joined:TODAY
  });

  db.pending = db.pending.filter(x => x.id !== id);

  await saveDB();
  renderAdmin();
}

async function adminReject(id){
  db.pending = db.pending.filter(x => x.id !== id);
  await saveDB();
  renderAdmin();
}

async function adminKick(id){
  db.members = db.members.map(m => m.id === id ? {...m, removed:true} : m);
  await saveDB();
  renderAdmin();
}

async function adminRestore(id){
  db.members = db.members.map(m => m.id === id ? {...m, removed:false} : m);
  await saveDB();
  renderAdmin();
}

async function adminEditPass(id){
  const np = prompt("Naya password dal:");
  if(!np) return;

  db.members = db.members.map(m => m.id === id ? {...m, password:np} : m);

  await saveDB();
  renderAdmin();
}

async function adminAddRule(){
  const r = document.getElementById("a-new-rule").value.trim();
  if(!r) return;

  db.rules.push(r);
  document.getElementById("a-new-rule").value = "";

  await saveDB();
  renderAdmin();
}

async function adminRemoveRule(i){
  db.rules.splice(i,1);
  await saveDB();
  renderAdmin();
}

function escapeHTML(value){
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

window.showPage = showPage;
window.doLogin = doLogin;
window.doRegister = doRegister;
window.doLogout = doLogout;
window.markAttendance = markAttendance;
window.adminTab = adminTab;
window.adminAddMember = adminAddMember;
window.adminApprove = adminApprove;
window.adminReject = adminReject;
window.adminKick = adminKick;
window.adminRestore = adminRestore;
window.adminEditPass = adminEditPass;
window.adminAddRule = adminAddRule;
window.adminRemoveRule = adminRemoveRule;

loadDB();
