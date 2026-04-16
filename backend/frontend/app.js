// Use same-origin on App Engine, localhost during local development.
const BASE_URL = window.location.hostname.includes("appspot.com")
  ? ""
  : "http://localhost:3000";

// --- AUTHENTICATION & NAVIGATION LOGIC ---
function checkAuth() {
  const userId = localStorage.getItem("userId");
  const publicLinks = document.querySelectorAll(".public-link");
  const privateLinks = document.querySelectorAll(".private-link");

  // Get the current page name from the URL
  // If it's empty (just the base domain), default it to index.html
  let currentPage = window.location.pathname.split("/").pop();
  if (currentPage === "") currentPage = "index.html";

  // Define which pages require a login
  const protectedPages = [
    "gallery.html",
    "upload.html",
    "search.html",
    "photodetail.html",
  ];

  // Define pages meant only for logged-out users
  const authPages = ["index.html", "register.html"];

  if (userId) {
    // User IS logged in: hide public links, show private links
    publicLinks.forEach((link) => (link.style.display = "none"));
    privateLinks.forEach((link) => (link.style.display = "inline-block"));

    // Auto-redirect: If logged in but on the login/register page, go to gallery
    if (authPages.includes(currentPage)) {
      window.location.href = "gallery.html";
    }
  } else {
    // User IS NOT logged in: show public links, hide private links
    publicLinks.forEach((link) => (link.style.display = "inline-block"));
    privateLinks.forEach((link) => (link.style.display = "none"));

    // Route Protection: Kick them to the login screen if they try to access a private page
    if (protectedPages.includes(currentPage)) {
      window.location.href = "index.html";
    }
  }
}

// Run the check immediately when any page loads
checkAuth();

// Logout Button Logic
document.getElementById("logoutBtn")?.addEventListener("click", (e) => {
  e.preventDefault();
  // Clear the user ID from storage
  localStorage.removeItem("userId");
  // Send them back to the login screen
  window.location.href = "index.html";
});

document.getElementById("loginForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    console.log("Login request data:", { email, password });
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    console.log("Login response:", data);

    if (!res.ok) {
      document.getElementById("error").innerText = "Invalid login";
      return;
    }

    // save userId
    localStorage.setItem("userId", data.userId);

    window.location.href = "gallery.html";
  } catch (err) {
    document.getElementById("error").innerText = "Server error";
  }
});

document
  .getElementById("registerForm")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    console.log("Register request data:", { username, email, password });
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, email, password }),
    });

    const data = await res.json();
    console.log("Register response:", data);

    if (res.ok) {
      document.getElementById("message").innerText = "User created!";
    } else {
      document.getElementById("message").innerText = "Error registering";
    }
  });

document.getElementById("uploadForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData();
  formData.append("photo", document.getElementById("photo").files[0]);
  formData.append("user_id", localStorage.getItem("userId"));
  formData.append("photo_name", document.getElementById("photo_name").value);
  formData.append("description", document.getElementById("description").value);

  const res = await fetch(`${BASE_URL}/api/photos/upload`, {
    method: "POST",
    body: formData,
  });

  if (res.ok) {
    document.getElementById("uploadMessage").innerText = "Uploaded!";
  } else {
    document.getElementById("uploadMessage").innerText = "Upload failed";
  }
});

// Function for gallery.html to load the user's photos
async function loadGallery() {
  const gallery = document.getElementById("gallery");
  if (!gallery) return; // Only run on gallery.html

  // 1. Get the current user's ID
  const userId = localStorage.getItem("userId");

  // 2. Fetch the current user's photos using BASE_URL
  const res = await fetch(`${BASE_URL}/api/photos/my/${userId}`);
  const photos = await res.json();

  gallery.innerHTML = ""; // Clear existing

  // 3. Generate the HTML structure and wrap in a link to the detail page
  photos.forEach((photo) => {
    // Check if it's a cloud URL or a local path
    const imgSrc = photo.file_path.startsWith("http")
      ? photo.file_path
      : `${BASE_URL}/${photo.file_path}`;

    gallery.innerHTML += `
      <a href="photodetail.html?id=${photo.photo_id}" style="text-decoration: none; color: inherit;">
        <div class="gallery-item">
          <img src="${imgSrc}" alt="${photo.photo_name}" />
          <p class="gallery-title">${photo.photo_name}</p>
        </div>
      </a>
    `;
  });
}

loadGallery();

// Function for search.html to find photos
async function search() {
  const keyword = document.getElementById("keyword").value;
  const results = document.getElementById("results");
  if (!results) return;

  // Grab the logged-in user's ID
  const userId = localStorage.getItem("userId");

  // Send BOTH the keyword and the user_id to the backend
  const res = await fetch(
    `${BASE_URL}/api/photos/search?keyword=${keyword}&user_id=${userId}`,
  );
  const photos = await res.json();

  results.innerHTML = ""; // Clear existing

  // Generate the HTML structure and wrap in a link to the detail page
  photos.forEach((photo) => {
    // Check if it's a cloud URL or a local path
    const imgSrc = photo.file_path.startsWith("http")
      ? photo.file_path
      : `${BASE_URL}/${photo.file_path}`;

    results.innerHTML += `
      <a href="photodetail.html?id=${photo.photo_id}" style="text-decoration: none; color: inherit;">
        <div class="gallery-item">
          <img src="${imgSrc}" alt="${photo.photo_name}" />
          <p class="gallery-title">${photo.photo_name}</p>
        </div>
      </a>
    `;
  });
}

function downloadPhoto(photoId) {
  window.location.href = `${BASE_URL}/api/photos/download/${photoId}`;
}

async function loadPhotoDetail() {
  // Read the ID from the web address
  const urlParams = new URLSearchParams(window.location.search);
  const photoId = urlParams.get("id");
  if (!photoId) return;

  const userId = localStorage.getItem("userId");

  // First check the user's own photos
  const res = await fetch(`${BASE_URL}/api/photos/my/${userId}`);
  const photos = await res.json();

  // Find the exact photo data
  let photo = photos.find((p) => p.photo_id == photoId);

  // If it's not their photo (e.g. from global search), fetch from the search endpoint
  if (!photo) {
    const searchRes = await fetch(`${BASE_URL}/api/photos/search?keyword=`);
    const allPhotos = await searchRes.json();
    photo = allPhotos.find((p) => p.photo_id == photoId);
  }

  if (photo) {
    document.getElementById("detail-name").innerText = photo.photo_name;

    // Check if it's a cloud URL or a local path
    const imgSrc = photo.file_path.startsWith("http")
      ? photo.file_path
      : `${BASE_URL}/${photo.file_path}`;
    document.getElementById("detail-image").src = imgSrc;

    document.getElementById("detail-desc").innerText =
      photo.description || "No description provided.";
    document.getElementById("download-btn").onclick = () =>
      downloadPhoto(photo.photo_id);
  } else {
    document.getElementById("detail-name").innerText = "Photo not found";
  }
}
