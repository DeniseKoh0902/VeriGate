const API_BASE = "http://localhost:8001/api/v1";

const loggedOutView = document.getElementById("loggedOutView");
const loggedInView = document.getElementById("loggedInView");
const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const userEmailEl = document.getElementById("userEmail");
const logoutButton = document.getElementById("logoutButton");

init();

async function init() {
  const { verigateToken, verigateUser } = await chrome.storage.local.get([
    "verigateToken",
    "verigateUser",
  ]);
  render(Boolean(verigateToken), verigateUser);
}

function render(isLoggedIn, user) {
  loggedOutView.hidden = isLoggedIn;
  loggedInView.hidden = !isLoggedIn;
  if (isLoggedIn && user) {
    userEmailEl.textContent = user.email;
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginError.hidden = true;

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.detail || "Sign-in failed.");
    }

    const data = await response.json();
    await chrome.storage.local.set({
      verigateToken: data.accessToken,
      verigateUser: { email: data.user.email, name: data.user.name },
    });

    loginForm.reset();
    render(true, { email: data.user.email });
  } catch (error) {
    loginError.textContent = error.message || "Could not reach VeriGate.";
    loginError.hidden = false;
  }
});

logoutButton.addEventListener("click", async () => {
  await chrome.storage.local.remove(["verigateToken", "verigateUser"]);
  render(false);
});
