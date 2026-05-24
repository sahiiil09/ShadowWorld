import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getDatabase,
  ref,
  set,
  onValue
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBNTnScEta2Xda_S7mUfw3IXoI7A-0IxsI",
  authDomain: "shadow-world-7c3d1.firebaseapp.com",
  databaseURL: "https://shadow-world-7c3d1-default-rtdb.firebaseio.com",
  projectId: "shadow-world-7c3d1",
  storageBucket: "shadow-world-7c3d1.firebasestorage.app",
  messagingSenderId: "1045120071491",
  appId: "1:1045120071491:web:5d7b649724fd39ff8d61f6",
  measurementId: "G-V1EP13TV5N"
};

const app = initializeApp(firebaseConfig);
const firebaseDB = getDatabase(app);

export {
  firebaseDB,
  ref,
  set,
  onValue
};
