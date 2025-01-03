// Elements for login
const mobileInput = document.getElementById("mobile");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const loginError = document.getElementById("loginError");

// Elements for lecture
const lectureIdInput = document.getElementById("lectureId");
const joinLectureBtn = document.getElementById("joinLectureBtn");
const lectureError = document.getElementById("lectureError");

// Elements for chat
const chatMessageInput = document.getElementById("chatMessage");
const sendMessageBtn = document.getElementById("sendMessageBtn");
const messagesContainer = document.getElementById("messages");

// User details and token
let token = null;
let currentUser = null;

loginBtn.addEventListener("click", async () => {
  const mobile = mobileInput.value;
  const password = passwordInput.value;

  if (!mobile || !password) {
    loginError.textContent = "Mobile and Password are required";
    return;
  }

  try {
    const response = await fetch("/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ mobile, password }),
    });
    const data = await response.json();

    if (data.status === "success") {
      token = data.data.accesstoken;
      currentUser = data.data.user;
      localStorage.setItem("token", token);

      loginError.textContent = "";
      document.getElementById("loginSection").style.display = "none";
      document.getElementById("lectureSection").style.display = "block";

      // Connect socket after successful login
      const socket = io("http://localhost:5000", {
        auth: {
          token: token,
        },
      });

      socket.on("connect", () => {
        console.log("Connected to server");
      });

      // Handle join lecture
      joinLectureBtn.addEventListener("click", () => {
        const lectureId = lectureIdInput.value;
        if (!lectureId) {
          lectureError.textContent = "Lecture ID is required.";
          return;
        }

        socket.emit("joinLecture", lectureId);

        socket.on("joinSuccess", (data) => {
          lectureError.textContent = "";
          document.getElementById("lectureSection").style.display = "none";
          document.getElementById("chatSection").style.display = "block";
        });

        socket.on("error", (data) => {
          lectureError.textContent = data.message;
        });
      });

      // Handle chat messages
      sendMessageBtn.addEventListener("click", () => {
        const message = chatMessageInput.value;
        if (!message) {
          return;
        }

        const lectureId = lectureIdInput.value;
        socket.emit("chat message", { lectureId, message });

        chatMessageInput.value = "";
      });

      // Display incoming chat messages
      socket.on("chat message", (data) => {
        const messageElement = document.createElement("div");
        messageElement.innerHTML = `<strong>${data.data.username}:</strong> ${data.data.message}`;
        messagesContainer.appendChild(messageElement);
      });
    } else {
      loginError.textContent = data.error.details;
    }
  } catch (error) {
    loginError.textContent = "Login failed, please try again.";
  }
});
