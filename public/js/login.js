document.getElementById("login-form").addEventListener("submit", async e => {
  e.preventDefault(); // Prevent default form submission (page reload)

  // Get user input values from the form
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  // Send login request to the backend API
  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // Important: Include cookies for session
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (response.ok && data.message === "Login successful") {
      localStorage.setItem("isLoggedIn", "true");
      sessionStorage.setItem("userName", data.name); // Store username in sessionStorage
      
      // Show success message
      alert("Login successful! Redirecting...");
      
      // Redirect to home page
      window.location.href = "home.html";
    } else {
      alert(data.message || "Login failed.");
    }
  } catch (error) {
    console.error("Login error:", error);
    alert("An error occurred during login. Please try again.");
  }
});
