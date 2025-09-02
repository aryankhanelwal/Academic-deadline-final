window.addEventListener('DOMContentLoaded', async () => {
  // Check authentication status with the server
  let isLoggedIn = false;
  let username = '';
  
  try {
    const response = await fetch('http://a13340b744ef94290a249d366d1430c3-1703614283.ap-south-1.elb.amazonaws.com/api/check-auth', {
      method: 'GET',
      credentials: 'include' // Include session cookies
    });
    
    if (response.ok) {
      const data = await response.json();
      isLoggedIn = data.authenticated;
      username = data.name || '';
      
      // Update localStorage to match server state
      if (isLoggedIn) {
        localStorage.setItem('isLoggedIn', 'true');
        sessionStorage.setItem('userName', username);
      } else {
        localStorage.removeItem('isLoggedIn');
        sessionStorage.removeItem('userName');
      }
    } else {
      // Server says not authenticated, clear local storage
      localStorage.removeItem('isLoggedIn');
      sessionStorage.removeItem('userName');
    }
  } catch (error) {
    console.error('Auth check failed:', error);
    // Fallback to localStorage check
    isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    username = sessionStorage.getItem('userName') || '';
  }

  // Use absolute paths for consistency
  const navbarPath = isLoggedIn ? '/html/navbarAfterLogin.html' : '/html/navbar.html';

  fetch(navbarPath)
    .then(response => response.text())
    .then(html => {
      document.getElementById('navbar-placeholder').innerHTML = html;
      if (isLoggedIn) {
        const userNameElem = document.getElementById('user-name');
        if (userNameElem) {
          userNameElem.textContent = `👤 ${username}`;
          // Set the href to the current page
          userNameElem.href = window.location.pathname;
        }
      }
      
      // Initialize mobile navigation functionality
      initializeMobileNavigation();
    })
    .catch(error => {
      console.error('Failed to load navbar:', error);
    });
});

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
