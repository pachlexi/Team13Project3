document.getElementById("loginForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    console.log('Login request data:', { email, password });
    const res = await fetch("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    console.log('Login response:', data);

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

document.getElementById("registerForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  console.log('Register request data:', { username, email, password });
  const res = await fetch("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ username, email, password })
  });

  const data = await res.json();
  console.log('Register response:', data);

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

  const res = await fetch("http://localhost:3000/api/photos/upload", {
    method: "POST",
    body: formData
  });

  if (res.ok) {
    document.getElementById("uploadMessage").innerText = "Uploaded!";
  } else {
    document.getElementById("uploadMessage").innerText = "Upload failed";
  }
});

async function loadGallery() {
  const gallery = document.getElementById("gallery");
  if (!gallery) return;

  const userId = localStorage.getItem("userId");

  const res = await fetch(`http://localhost:3000/api/photos/my/${userId}`);
  const photos = await res.json();

  gallery.innerHTML = "";

  photos.forEach(photo => {
    const div = document.createElement("div");
    div.innerHTML = `<p>${photo.photo_name}</p>`;
    gallery.appendChild(div);
  });
}

loadGallery();

async function search() {
  const keyword = document.getElementById("keyword").value;

  const res = await fetch(`http://localhost:3000/api/photos/search?keyword=${keyword}`);
  const photos = await res.json();

  const results = document.getElementById("results");
  results.innerHTML = "";

  photos.forEach(photo => {
    results.innerHTML += `<p>${photo.photo_name}</p>`;
  });
}

function downloadPhoto(photoId) {
  window.location.href = `http://localhost:3000/api/photos/download/${photoId}`;
}