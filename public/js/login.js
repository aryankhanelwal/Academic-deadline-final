console.log('Login.js loaded successfully');

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded, setting up login form handler');
  
  const loginForm = document.getElementById("login-form");
  if (!loginForm) {
    console.error('Login form not found!');
    return;
  }
  
  loginForm.addEventListener("submit", async e => {
    e.preventDefault(); // Prevent default form submission (page reload)
    
    console.log('Login form submitted via login.js');

    // Get user input values from the form
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;
    
    console.log('Login attempt:', { email, passwordLength: password.length });
    
    if (!email || !password) {
      alert('Please enter both email and password.');
      return;
    }

    // Show loading state
    const submitBtn = document.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Logging in...';
    submitBtn.disabled = true;

    // Send login request to the backend API
    try {
      console.log('Sending login request to /api/login');
      
      const response = await fetch("http://a13340b744ef94290a249d366d1430c3-1703614283.ap-south-1.elb.amazonaws.com/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // Important: Include cookies for session
        body: JSON.stringify({ email, password })
      });
      
      console.log('Response status:', response.status);
      
      const data = await response.json();
      console.log('Response data:', data);
      
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
      alert("An error occurred during login. Please check if the server is running and try again.");
    } finally {
      // Reset button state
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  });
});

// Fallback if DOMContentLoaded has already fired
if (document.readyState === 'loading') {
  // DOMContentLoaded has not fired yet
} else {
  // DOMContentLoaded has already fired
  console.log('DOM already loaded, setting up login form handler immediately');
  
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    console.log('Setting up login form handler');
    // Set up the handler immediately if DOM is already ready
    loginForm.addEventListener("submit", async e => {
      e.preventDefault();
      console.log('Login form submitted (fallback handler)');
      // Same login logic here...
    });
  }
}
