window.addEventListener('DOMContentLoaded', async () => {
  // Check authentication status with the server
  let isLoggedIn = false;
  let username = '';
  
  try {
    const response = await fetch('/api/check-auth', {
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
          userNameElem.textContent = username;
        }
      }
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
