import {
  firebaseDB,
  ref,
  set,
  onValue
} from "./firebase.js";

/* =========================
   ADMIN LOGIN
========================= */

const ADMINS = [
  { username: "sd sahil", password: "saheen" },
  { username: "taskeen", password: "saheen" }
];

/* =========================
   APP CONFIG
========================= */

const TODAY = new Date().toLocaleDateString("en-IN");
const ROOT_PATH = "shadowWorld";

/* =========================
   MAIN DATABASE OBJECT
========================= */

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
let appLoaded = false;

/* =========================
   HELPERS
========================= */

function getInitials(n){
  return String(n || "")
    .split(" ")
    .filter(Boolean)
    .map(w => w[0])
    .join("")
    .toUpperCase()
    .slice(0,2);
}

function escapeHTML(value){
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeDB(data){
  return {
    members: Array.isArray(data?.members) ? data.members : [],
    pending: Array.isArray(data?.pending) ? data.pending : [],
    attendance: data?.attendance || {},
    rules: Array.isArray(data?.rules) && data.rules.length ? data.rules : db.rules
  };
}

/* =========================
   FIREBASE SAVE + LIVE LOAD
========================= */

async function saveDB(){
  try{
    await set(ref(firebaseDB, ROOT_PATH), db);
  }catch(e){
    console.error("Save error:", e);
    alert("Data save nahi hua. Firebase rules ya internet check karo.");
  }
}

function loadDB(){
  onValue(
    ref(firebaseDB, ROOT_PATH),
    async (snapshot) => {

      if(snapshot.exists()){
        db = normalizeDB(snapshot.val());
      }else{
        if(!db.attendance[TODAY]) db.attendance[TODAY] = {};
        await saveDB();
      }

      if(!db.attendance) db.attendance = {};
      if(!db.attendance[TODAY]) db.attendance[TODAY] = {};

      if(!appLoaded){
        appLoaded = true;
        showPage("pg-login");
      }

      refreshCurrentScreen();
    },
    (error) => {
      console.error("Firebase live sync error:", error);
      showPage("pg-login");
      showErr("login-err", "Firebase connection error. Rules check karo.");
    }
  );
}

function refreshCurrentScreen(){
  if(currentRole === "admin"){
    renderAdmin();
    return;
  }

  if(currentRole === "member"){
    const mem = db.members.find(m => m.username === currentUser && !m.removed);

    if(mem){
      renderMemberPage(mem);
    }else{
      doLogout();
    }
  }
}

/* =========================
   PAGE + MESSAGE FUNCTIONS
========================= */

function showPage(id){
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));

  const page = document.getElementById(id);
  if(page) page.classList.add("active");

  const logoutBtn = document.getElementById("logout-btn");

  if(logoutBtn){
    logoutBtn.style.display =
      (id === "pg-login" || id === "pg-register" || id === "pg-loading")
      ? "none"
      : "block";
  }
}

function showErr(id,msg){
  const e = document.getElementById(id);
  if(!e) return;

  e.textContent = msg;
  e.style.display = "block";

  setTimeout(() => {
    e.style.display = "none";
  }, 3000);
}

function showOk(id,msg){
  const e = document.getElementById(id);
  if(!e) return;

  e.textContent = msg;
  e.style.display = "block";

  setTimeout(() => {
    e.style.display = "none";
  }, 3000);
}

/* =========================
   LOGIN / REGISTER / LOGOUT
========================= */

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

  const loginUser = document.getElementById("login-user");
  const loginPass = document.getElementById("login-pass");

  if(loginUser) loginUser.value = "";
  if(loginPass) loginPass.value = "";

  showPage("pg-login");
}

/* =========================
   MEMBER PAGE
========================= */

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

    btnWrap.innerHTML =
      '<div style="font-size:0.8rem;color:#00cc66;margin-top:0.5rem;">Aaj ki attendance lag gayi</div>';
  }else{
    statusEl.textContent = "NOT MARKED";
    statusEl.className = "att-big-status att-absent";

    btnWrap.innerHTML =
      '<button class="btn-red" style="width:auto;padding:0.65rem 2rem;" onclick="markAttendance()">MARK PRESENT</button>';
  }
}

async function markAttendance(){
  const mem = db.members.find(m => m.username === currentUser);

  if(!mem) return;

  db.attendance[TODAY] = db.attendance[TODAY] || {};

  if(db.attendance[TODAY][mem.id]) return;

  db.attendance[TODAY][mem.id] = true;

  await saveDB();
}

/* =========================
   ADMIN
========================= */

function adminTab(name,el){
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("on"));
  document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("on"));

  el.classList.add("on");

  const tab = document.getElementById("atab-" + name);
  if(tab) tab.classList.add("on");
}

function renderAdmin(){
  const active = db.members.filter(m => !m.removed);
  const presentToday = Object.values(db.attendance[TODAY] || {}).filter(v => v).length;

  document.getElementById("a-total").textContent = active.length;
  document.getElementById("a-present").textContent = presentToday;
  document.getElementById("a-pending").textContent = db.pending.length;
}

async function adminAddMember(){
  const name = document.getElementById("a-add-name").value.trim();
  const user = document.getElementById("a-add-user").value.trim();
  const pass = document.getElementById("a-add-pass").value.trim();
  const role = document.getElementById("a-add-role").value.trim() || "Member";

  if(!name || !user || !pass){
    alert("Name, username aur password chahiye");
    return;
  }

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

  await saveDB();
}

/* =========================
   GLOBAL FUNCTIONS
========================= */

window.showPage = showPage;
window.doLogin = doLogin;
window.doRegister = doRegister;
window.doLogout = doLogout;
window.markAttendance = markAttendance;
window.adminTab = adminTab;
window.adminAddMember = adminAddMember;

/* =========================
   START APP
========================= */

loadDB();
