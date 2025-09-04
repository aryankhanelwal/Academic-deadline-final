// List of allowed email domains for registration
const allowedDomains = [
  "gmail.com", "yahoo.com", "hotmail.com", "aol.com",
  "outlook.com", "icloud.com", "msn.com", "comcast.net", "yandex.ru", "live.com"
];

// Initialize phone input with automatic country detection and formatting
const phoneInput = intlTelInput(document.querySelector("#phone"), {
  initialCountry: "auto",
  geoIpLookup: callback => fetch("https://ipapi.co/json")
    .then(res => res.json()).then(data => callback(data.country_code))
    .catch(() => callback("us")),
  utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js"
}); // Validates, auto-sets user country, and formats the number

// Country selection is handled automatically by intl-tel-input plugin
// No additional country dropdown needed

// Password strength meter logic
const password = document.getElementById("password");
const strength = document.getElementById("password-strength");
let passwordScore = 0; // Track score globally

password.addEventListener("input", () => {
  const v = password.value;
  // Score based on length, uppercase, digit, and special character
  passwordScore =
    (v.length > 7) +
    (/[A-Z]/.test(v)) +
    (/\d/.test(v)) +
    (/[^A-Za-z0-9]/.test(v));
  let text = "", color = "";
  if (passwordScore < 2) { text = "Weak"; color = "#dc2626"; }
  else if (passwordScore === 2) { text = "Fair"; color = "#f59e0b"; }
  else if (passwordScore === 3) { text = "Good"; color = "#10b981"; }
  else { text = "Strong"; color = "#2563eb"; }
  strength.innerText = `Strength: ${text}`;
  strength.style.color = color;
});

// Global variables for OTP flow
let pendingRegistrationData = null;

// Message display function
function showMessage(message, type = 'info') {
  // Create or get message container
  let messageContainer = document.getElementById('message-container');
  if (!messageContainer) {
    messageContainer = document.createElement('div');
    messageContainer.id = 'message-container';
    messageContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 1000;
      padding: 15px 20px;
      border-radius: 8px;
      font-family: Arial, sans-serif;
      font-size: 14px;
      font-weight: 500;
      max-width: 400px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transform: translateX(100%);
      transition: transform 0.3s ease-in-out;
    `;
    document.body.appendChild(messageContainer);
  }
  
  // Set message and styling based on type
  messageContainer.textContent = message;
  
  const styles = {
    success: { bg: '#10b981', color: '#ffffff' },
    error: { bg: '#dc2626', color: '#ffffff' },
    warning: { bg: '#f59e0b', color: '#ffffff' },
    info: { bg: '#3b82f6', color: '#ffffff' }
  };
  
  const style = styles[type] || styles.info;
  messageContainer.style.backgroundColor = style.bg;
  messageContainer.style.color = style.color;
  
  // Show the message
  messageContainer.style.transform = 'translateX(0)';
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    messageContainer.style.transform = 'translateX(100%)';
  }, 5000);
}

// Signup form validation and submission
document.getElementById("signup-form").addEventListener("submit", async e => {
  e.preventDefault();

  // Show specific message for weak/fair passwords
  if (passwordScore < 3) {
    showMessage("Password is too weak. Please use a stronger password (min 8 chars, uppercase, number, special character).", "error");
    return;
  }
  if (passwordScore === 3) {
    showMessage("Password is fair but not strong enough. Please add more complexity.", "warning");
    return;
  }

  // Validate email domain
  const email = document.getElementById("email").value;
  const domain = email.split("@")[1];
  if (!allowedDomains.includes(domain)) {
    showMessage("Email must be from a common provider like Gmail, Outlook, etc.", "error");
    return;
  }

  // Validate password match
  if (password.value !== document.getElementById("confirm-password").value) {
    showMessage("Passwords do not match.", "error");
    return;
  }

  // Validate phone number using intl-tel-input
  // Phone number is no longer required for email OTP flow

  // Gather user data from form fields
  const user = {
    name: document.getElementById("fullname").value,
    StudentId: document.getElementById("StudentId").value,
    CollegeName: document.getElementById("CollegeName").value,
    email,
    phone: '',
    password: password.value
  };

  // Store user data for later use in OTP verification
  pendingRegistrationData = user;

  // Show loading state
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = "Sending OTP...";
  submitBtn.disabled = true;

  try {
    // Send signup request to backend API
    const res = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Include cookies for session management
      body: JSON.stringify(user)
    });

    const data = await res.json();

    if (res.ok) {
      // Check if OTP verification is required
      if (data.requireOTP === true) {
        console.log('✅ Registration initiated, showing OTP verification screen');
        showOTPVerificationScreen(data);
      } else {
        // This shouldn't happen with the new flow, but handle just in case
        showMessage("Registration successful! Redirecting to login...", "success");
        setTimeout(() => {
          window.location.href = "login.html";
        }, 2000);
      }
    } else {
      showMessage(data.message || "Registration failed. Please try again.", "error");
    }
  } catch (error) {
    console.error('Registration error:', error);
    showMessage("Network error. Please check your connection and try again.", "error");
  } finally {
    // Reset button state
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
});

// Show OTP verification screen
function showOTPVerificationScreen(responseData) {
  // Hide registration form
  document.getElementById('registration-form').style.display = 'none';
  
  // Show OTP verification form
  document.getElementById('otp-verification-form').style.display = 'block';
  
  // Reuse the existing UI fields to display email instead of phone
  const emailToShow = responseData.email || document.getElementById("email").value;
  document.getElementById('otp-phone').textContent = emailToShow; // label may still say phone in HTML
  document.getElementById('otp-phone-number').value = emailToShow; // store email in this hidden/input field
  
  // Update message
  document.getElementById('otp-message').textContent = responseData.message;
  
  // Focus on OTP input
  document.getElementById('otp-code').focus();
  
  showMessage("OTP sent to your email. Please check your inbox.", "success");
}

// OTP form submission
document.getElementById("otp-form").addEventListener("submit", async e => {
  e.preventDefault();
  
  const otpCode = document.getElementById('otp-code').value.trim();
  const emailAddress = document.getElementById('otp-phone-number').value; // reused field now holds email
  
  if (!otpCode || otpCode.length !== 6) {
    showMessage("Please enter a valid 6-digit OTP code.", "error");
    return;
  }
  
  // Show loading state
  const verifyBtn = document.getElementById('verify-otp-btn');
  const originalText = verifyBtn.textContent;
  verifyBtn.textContent = "Verifying...";
  verifyBtn.disabled = true;
  
  try {
    const res = await fetch('/api/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Include cookies for session management
      body: JSON.stringify({
        otp: otpCode,
        email: emailAddress
      })
    });
    
    const data = await res.json();
    
    if (res.ok) {
      console.log('✅ OTP verification successful, registration complete');
      showSuccessScreen();
    } else {
      showMessage(data.message || "OTP verification failed. Please try again.", "error");
      // Clear OTP input for retry
      document.getElementById('otp-code').value = '';
      document.getElementById('otp-code').focus();
    }
  } catch (error) {
    console.error('OTP verification error:', error);
    showMessage("Network error. Please check your connection and try again.", "error");
  } finally {
    // Reset button state
    verifyBtn.textContent = originalText;
    verifyBtn.disabled = false;
  }
});

// Resend OTP functionality
document.getElementById("resend-otp-btn").addEventListener("click", async () => {
  if (!pendingRegistrationData) {
    showMessage("Please start registration again.", "error");
    return;
  }
  
  const resendBtn = document.getElementById('resend-otp-btn');
  const originalText = resendBtn.textContent;
  resendBtn.textContent = "Resending...";
  resendBtn.disabled = true;
  
  try {
    const res = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Include cookies for session management
      body: JSON.stringify(pendingRegistrationData)
    });
    
    const data = await res.json();
    
    if (res.ok) {
      showMessage("OTP resent successfully. Please check your email.", "success");
      // Clear previous OTP input
      document.getElementById('otp-code').value = '';
      document.getElementById('otp-code').focus();
    } else {
      showMessage(data.message || "Failed to resend OTP. Please try again.", "error");
    }
  } catch (error) {
    console.error('Resend OTP error:', error);
    showMessage("Network error. Please try again.", "error");
  } finally {
    resendBtn.textContent = originalText;
    resendBtn.disabled = false;
  }
});

// Back to signup functionality
document.getElementById("back-to-signup-btn").addEventListener("click", () => {
  // Hide OTP form
  document.getElementById('otp-verification-form').style.display = 'none';
  
  // Show registration form
  document.getElementById('registration-form').style.display = 'block';
  
  // Clear OTP data
  document.getElementById('otp-code').value = '';
  pendingRegistrationData = null;
  
  showMessage("Registration cancelled. Please fill the form again.", "info");
});

// Show success screen and redirect
function showSuccessScreen() {
  // Hide OTP form
  document.getElementById('otp-verification-form').style.display = 'none';
  
  // Show success message
  document.getElementById('success-message').style.display = 'block';
  
  // Auto redirect after 3 seconds
  setTimeout(() => {
    window.location.href = "/";
  }, 3000);
}

// Go to dashboard button
document.getElementById("go-to-dashboard-btn").addEventListener("click", () => {
  window.location.href = "/";
});


