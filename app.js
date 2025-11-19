// Show poem on button
function showPoem() {
  const today = new Date();
  const index = today.getDate() % poems.length;
  document.getElementById("poemBox").innerText = poems[index];
}

function openCamera() { alert("Camera feature coming soon!"); }
function openGallery() { alert("Gallery coming soon!"); }
function openSongs() { alert("Songs section coming soon!"); }
function openChat() { alert("Chat coming soon!"); }
function openGames() { alert("Games coming soon!"); }

// Notification request
if ("Notification" in window) {
  Notification.requestPermission();
}

// Daily poem notification
function sendDailyPoem() {
  const today = new Date();
  const index = today.getDate() % poems.length;

  if (Notification.permission === "granted") {
    new Notification("💜 Your Poem of the Day", {
      body: poems[index],
      icon: "./icons/icon-192.png"
    });
  }
}

// Trigger notification every time app opens
window.onload = sendDailyPoem;

// Register service worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}
