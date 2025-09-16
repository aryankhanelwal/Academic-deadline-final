// Global state management
let currentAuthState = {
  isLoggedIn: false,
  username: '',
  isLoading: true
};

// Load navbar with improved state management
async function loadNavbar() {
  const navbarContainer = document.getElementById('navbar-placeholder');
  if (!navbarContainer) {
    console.error('Navbar placeholder not found');
    return;
  }

  // Show loading state briefly to prevent flicker
  navbarContainer.innerHTML = '<nav class="navbar"><div class="logo">🎓 Midvey Tracker</div></nav>';
  
  try {
    // Check authentication status with the server
    const response = await fetch('/api/check-auth', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-cache' // Ensure we get fresh auth state
    });
    
    if (response.ok) {
      const data = await response.json();
      currentAuthState.isLoggedIn = data.authenticated;
      currentAuthState.username = data.name || '';
      
      // Sync localStorage with server state
      if (currentAuthState.isLoggedIn) {
        localStorage.setItem('isLoggedIn', 'true');
        sessionStorage.setItem('userName', currentAuthState.username);
      } else {
        localStorage.removeItem('isLoggedIn');
        sessionStorage.removeItem('userName');
      }
    } else {
      // Server says not authenticated
      currentAuthState.isLoggedIn = false;
      currentAuthState.username = '';
      localStorage.removeItem('isLoggedIn');
      sessionStorage.removeItem('userName');
    }
  } catch (error) {
    console.error('Auth check failed, using localStorage fallback:', error);
    // Fallback to localStorage only if server is unreachable
    currentAuthState.isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    currentAuthState.username = sessionStorage.getItem('userName') || '';
  }

  currentAuthState.isLoading = false;
  
  // Load appropriate navbar
  const navbarPath = currentAuthState.isLoggedIn ? '/html/navbarAfterLogin.html' : '/html/navbar.html';
  
  try {
    const navResponse = await fetch(navbarPath);
    if (!navResponse.ok) {
      throw new Error(`Failed to load navbar: ${navResponse.status}`);
    }
    
    const html = await navResponse.text();
    navbarContainer.innerHTML = html;
    
    // Update username display if logged in
    if (currentAuthState.isLoggedIn) {
      const userNameElem = document.getElementById('user-name');
      if (userNameElem && currentAuthState.username) {
        userNameElem.textContent = `👤 ${currentAuthState.username}`;
        userNameElem.href = window.location.pathname;
      }
    }
    
    // Initialize mobile navigation
    initializeMobileNavigation();
    
    console.log('Navbar loaded successfully:', {
      isLoggedIn: currentAuthState.isLoggedIn,
      username: currentAuthState.username,
      navbarPath
    });
    
  } catch (error) {
    console.error('Failed to load navbar HTML:', error);
    // Fallback navbar
    navbarContainer.innerHTML = `
      <nav class="navbar">
        <div class="logo">🎓 Midvey Tracker</div>
        <ul class="nav-links">
          <li><a href="/html/home.html">Home</a></li>
          <li><a href="/html/login.html">Login</a></li>
        </ul>
      </nav>
    `;
  }
}

// Function to force reload navbar (useful after login/logout)
window.reloadNavbar = function() {
  console.log('Forcing navbar reload...');
  return loadNavbar();
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadNavbar);
} else {
  // DOM is already ready
  loadNavbar();
}

document.addEventListener('click', async function(e) {
  if (e.target && e.target.id === 'logout-link') {
    e.preventDefault();
    
    try {
      // Call server logout endpoint
      await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    // Clear local storage regardless of server response
    localStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('userName');
    
    // Redirect to login page
    window.location.href = 'login.html';
  }
});

// Mobile Navigation Functionality
function initializeMobileNavigation() {
  // Create mobile menu toggle button if it doesn't exist
  const navbar = document.querySelector('.navbar');
  const navLinks = document.querySelector('.nav-links');
  
  if (!navbar || !navLinks) {
    return; // Exit if navbar elements don't exist
  }
  
  // Check if mobile toggle button already exists
  let mobileToggle = navbar.querySelector('.mobile-menu-toggle');
  
  if (!mobileToggle) {
    // Create mobile menu toggle button
    mobileToggle = document.createElement('button');
    mobileToggle.className = 'mobile-menu-toggle';
    mobileToggle.innerHTML = '☰'; // Hamburger icon
    mobileToggle.setAttribute('aria-label', 'Toggle navigation menu');
    mobileToggle.setAttribute('aria-expanded', 'false');
    
    // Insert the button as the last child of navbar
    navbar.appendChild(mobileToggle);
  }
  
  // Toggle mobile menu functionality
  mobileToggle.addEventListener('click', function(e) {
    e.preventDefault();
    
    const isOpen = navLinks.classList.contains('mobile-open');
    
    if (isOpen) {
      // Close menu
      navLinks.classList.remove('mobile-open');
      mobileToggle.innerHTML = '☰';
      mobileToggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = ''; // Restore body scroll
    } else {
      // Open menu
      navLinks.classList.add('mobile-open');
      mobileToggle.innerHTML = '✕';
      mobileToggle.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden'; // Prevent body scroll when menu is open
    }
  });
  
  // Close mobile menu when clicking on nav links
  const navLinksItems = navLinks.querySelectorAll('a');
  navLinksItems.forEach(link => {
    link.addEventListener('click', function() {
      navLinks.classList.remove('mobile-open');
      mobileToggle.innerHTML = '☰';
      mobileToggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = ''; // Restore body scroll
    });
  });
  
  // Close mobile menu when clicking outside
  document.addEventListener('click', function(e) {
    if (!navbar.contains(e.target) && navLinks.classList.contains('mobile-open')) {
      navLinks.classList.remove('mobile-open');
      mobileToggle.innerHTML = '☰';
      mobileToggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = ''; // Restore body scroll
    }
  });
  
  // Close mobile menu on window resize if screen becomes large
  window.addEventListener('resize', function() {
    if (window.innerWidth > 767 && navLinks.classList.contains('mobile-open')) {
      navLinks.classList.remove('mobile-open');
      mobileToggle.innerHTML = '☰';
      mobileToggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = ''; // Restore body scroll
    }
  });
}
