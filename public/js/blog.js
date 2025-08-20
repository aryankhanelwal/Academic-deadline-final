/**
 * MIDVEY FRONTEND - BLOG MANAGEMENT JAVASCRIPT
 * 
 * This file handles all frontend blog functionality including:
 * - Authentication status checking
 * - Blog viewing (public for everyone)
 * - Blog creation (authenticated users only)
 * - Blog editing/deleting (owners only)
 * - Form management and UI updates
 * 
 * WORKFLOW OVERVIEW:
 * 1. Check if user is logged in → Show/hide appropriate buttons
 * 2. Load all blogs → Display with author names and dates
 * 3. Handle form submissions → Create/update blogs
 * 4. Manage ownership → Only show edit/delete for owned blogs
 */

// ===== GLOBAL VARIABLES =====
let editingBlogId = null;    // Stores ID of blog being edited (null = creating new)
let currentUserId = null;    // Stores current logged-in user ID for ownership checks

/**
 * AUTHENTICATION STATUS CHECKER
 * Purpose: Check if user is currently logged in and get their info
 * Returns: User data if authenticated, null if not
 * 
 * WORKFLOW:
 * 1. Call backend /api/check-auth endpoint
 * 2. If authenticated, store user ID for blog ownership checks
 * 3. Return user data or null
 * 
 * USED BY:
 * - Page initialization to show/hide edit buttons
 * - Blog rendering to determine which blogs user owns
 */
function checkAuthStatus() {
  return fetch('/api/check-auth', {
    method: 'GET',
    credentials: 'include'  // Include session cookies
  })
    .then(res => res.json())
    .then(data => {
      if (data.authenticated) {
        currentUserId = data.userId; // Store user ID for blog ownership comparison
        return data;
      }
      return null;
    })
    .catch(() => null);  // Return null if any error occurs
}

// Fetch and render blogs
function renderBlogs() {
  fetch('/api/blogs', {
    method: 'GET',
    credentials: 'include'
  })
    .then(res => {
      if (!res.ok) {
        throw new Error('Failed to fetch blogs');
      }
      return res.json();
    })
    .then(blogs => {
      const blogPosts = document.getElementById("blogPosts");
      blogPosts.innerHTML = "";
      
      if (blogs.length === 0) {
        blogPosts.innerHTML = '<div class="no-blogs">No blogs found. Be the first to create a blog post!</div>';
        return;
      }
      
      // Update category counts with real data
      updateCategoryCounts(blogs);
      
      blogs.forEach(blog => {
        const postDiv = document.createElement("div");
        postDiv.className = "post";
        postDiv.dataset.blogId = blog._id;
        
        let imgTag = blog.image ? `<img src="${blog.image}" alt="Blog Image" class="blog-image" />` : "";
        
        const createdDate = new Date(blog.createdAt).toLocaleDateString();
        const updatedDate = new Date(blog.updatedAt).toLocaleDateString();
        const dateInfo = blog.createdAt !== blog.updatedAt ? 
          `<small>Created: ${createdDate} | Updated: ${updatedDate}</small>` : 
          `<small>Created: ${createdDate}</small>`;
        
        // Show author name
        const authorName = blog.userId && blog.userId.name ? blog.userId.name : 'Anonymous';
        const authorInfo = `<small><strong>By: ${escapeHtml(authorName)}</strong></small>`;
        
        // Only show edit/delete buttons if user is authenticated and owns the blog
        let actionsHtml = '';
        if (currentUserId && blog.userId && blog.userId._id && currentUserId === blog.userId._id) {
          actionsHtml = `
            <div class="blog-actions">
              <button class="edit-btn" onclick="editBlog('${blog._id}')">✏️ Edit</button>
              <button class="delete-btn" onclick="deleteBlog('${blog._id}')">🗑️ Delete</button>
            </div>
          `;
        }
        
        postDiv.innerHTML = `
          ${imgTag}
          <h3>${escapeHtml(blog.title)}</h3>
          <p>${escapeHtml(blog.content)}</p>
          ${authorInfo}
          ${dateInfo}
          ${actionsHtml}
        `;
        blogPosts.appendChild(postDiv);
      });
    })
    .catch(err => {
      console.error('Error fetching blogs:', err);
      showMessage('Unable to load blogs at the moment', 'error');
    });
}

// Handle blog form submission
document.getElementById("blogForm").addEventListener("submit", function (e) {
  e.preventDefault();
  const title = document.getElementById("blogTitle").value.trim();
  const content = document.getElementById("blogContent").value.trim();
  const category = document.getElementById("blogCategory").value;
  const imageInput = document.getElementById("blogImage");
  
  if (!title || !content || !category) {
    showMessage('Title, content and category are required', 'error');
    return;
  }
  
  // Show loading state
  setFormSubmitting(true);
  
  if (imageInput.files && imageInput.files[0]) {
    const reader = new FileReader();
    reader.onload = function (event) {
      if (editingBlogId) {
        updateBlog(editingBlogId, { title, content, category, image: event.target.result });
      } else {
        saveBlog({ title, content, category, image: event.target.result });
      }
    };
    reader.readAsDataURL(imageInput.files[0]);
  } else {
    if (editingBlogId) {
      updateBlog(editingBlogId, { title, content, category });
    } else {
      saveBlog({ title, content, category, image: null });
    }
  }
});

// Set form submitting state
function setFormSubmitting(isSubmitting) {
  const form = document.getElementById('blogForm');
  const submitBtn = document.querySelector('#blogForm button[type="submit"]');
  
  if (isSubmitting) {
    form.classList.add('submitting');
    submitBtn.disabled = true;
    submitBtn.classList.add('loading');
    const originalText = submitBtn.textContent;
    submitBtn.dataset.originalText = originalText;
    submitBtn.textContent = 'Submitting...';
  } else {
    form.classList.remove('submitting');
    submitBtn.disabled = false;
    submitBtn.classList.remove('loading');
    const originalText = submitBtn.dataset.originalText || 'Create Blog';
    submitBtn.textContent = originalText;
    
    // Reset form after successful submission
    if (!editingBlogId) {
      document.getElementById('blogForm').reset();
    }
    resetForm();
  }
}

// Save new blog
function saveBlog(blog) {
  fetch('/api/blogs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(blog)
  })
    .then(res => {
      if (!res.ok) {
        if (res.status === 401) {
          showMessage('Please log in to create blogs', 'error');
          return;
        }
        throw new Error('Failed to create blog');
      }
      return res.json();
    })
    .then(data => {
      if (data) {
        showMessage('Blog created successfully!', 'success');
        renderBlogs();
      }
    })
    .catch(err => {
      console.error('Error creating blog:', err);
      showMessage('Error creating blog', 'error');
    })
    .finally(() => {
      setFormSubmitting(false);
    });
}

// Update existing blog
function updateBlog(blogId, blogData) {
  fetch(`/api/blogs/${blogId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(blogData)
  })
    .then(res => {
      if (!res.ok) {
        if (res.status === 401) {
          showMessage('Please log in to update blogs', 'error');
          return;
        }
        throw new Error('Failed to update blog');
      }
      return res.json();
    })
    .then(data => {
      if (data) {
        showMessage('Blog updated successfully!', 'success');
        renderBlogs();
      }
    })
    .catch(err => {
      console.error('Error updating blog:', err);
      showMessage('Error updating blog', 'error');
    })
    .finally(() => {
      setFormSubmitting(false);
    });
}

// Edit blog - populate form with existing data
function editBlog(blogId) {
  fetch(`/api/blogs/${blogId}`, {
    method: 'GET',
    credentials: 'include'
  })
    .then(res => {
      if (!res.ok) {
        throw new Error('Failed to fetch blog');
      }
      return res.json();
    })
    .then(blog => {
      document.getElementById("blogTitle").value = blog.title;
      document.getElementById("blogContent").value = blog.content;
      document.getElementById("blogCategory").value = blog.category || 'General';
      editingBlogId = blogId;
      
      // Update form UI to show edit mode
      const submitBtn = document.querySelector('#blogForm button[type="submit"]');
      submitBtn.textContent = '✏️ Update Blog';
      
      // Add cancel button
      if (!document.getElementById('cancelEdit')) {
        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.id = 'cancelEdit';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.className = 'cancel-btn';
        cancelBtn.onclick = resetForm;
        submitBtn.parentNode.insertBefore(cancelBtn, submitBtn.nextSibling);
      }
      
      // Scroll to form
      document.getElementById('blogForm').scrollIntoView({ behavior: 'smooth' });
      showMessage('Editing blog post', 'info');
    })
    .catch(err => {
      console.error('Error fetching blog for edit:', err);
      showMessage('Error loading blog for editing', 'error');
    });
}

// Delete blog
function deleteBlog(blogId) {
  if (!confirm('Are you sure you want to delete this blog post?')) {
    return;
  }
  
  fetch(`/api/blogs/${blogId}`, {
    method: 'DELETE',
    credentials: 'include'
  })
    .then(res => {
      if (!res.ok) {
        if (res.status === 401) {
          showMessage('Please log in to delete blogs', 'error');
          return;
        }
        throw new Error('Failed to delete blog');
      }
      return res.json();
    })
    .then(data => {
      if (data) {
        showMessage('Blog deleted successfully!', 'success');
        renderBlogs();
      }
    })
    .catch(err => {
      console.error('Error deleting blog:', err);
      showMessage('Error deleting blog', 'error');
    });
}

// Reset form to create mode
function resetForm() {
  editingBlogId = null;
  document.getElementById('blogForm').reset();
  
  const submitBtn = document.querySelector('#blogForm button[type="submit"]');
  submitBtn.textContent = '🚀 Create Blog';
  
  const cancelBtn = document.getElementById('cancelEdit');
  if (cancelBtn) {
    cancelBtn.remove();
  }
}

// Clear form function (called by Clear Form button)
function clearForm() {
  if (editingBlogId) {
    // If in edit mode, ask for confirmation
    if (confirm('Are you sure you want to clear the form? This will cancel editing.')) {
      resetForm();
      showMessage('Form cleared', 'info');
    }
  } else {
    // Just clear the form in create mode
    document.getElementById('blogForm').reset();
    showMessage('Form cleared', 'info');
  }
}

// Utility function to escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Show messages to user
function showMessage(message, type) {
  // Remove existing message
  const existingMessage = document.getElementById('message');
  if (existingMessage) {
    existingMessage.remove();
  }
  
  const messageDiv = document.createElement('div');
  messageDiv.id = 'message';
  messageDiv.className = `message ${type}`;
  messageDiv.textContent = message;
  
  // Insert at top of page
  document.body.insertBefore(messageDiv, document.body.firstChild);
  
  // Auto-remove after 3 seconds
  setTimeout(() => {
    if (messageDiv.parentNode) {
      messageDiv.remove();
    }
  }, 3000);
}

// Update category counts in sidebar based on actual blog categories
function updateCategoryCounts(blogs) {
  // Initialize counters for all categories
  const categoryCounts = {
    'Study Tips': 0,
    'Academic Life': 0,
    'Resources': 0,
    'General': 0
  };
  
  // Count actual categories from blogs
  blogs.forEach(blog => {
    const category = blog.category || 'General'; // Default to General if no category
    if (categoryCounts.hasOwnProperty(category)) {
      categoryCounts[category]++;
    } else {
      // If it's a category we don't have a counter for, add to General
      categoryCounts['General']++;
    }
  });
  
  // Update the DOM elements with real counts
  const studyTipsEl = document.getElementById('studyTipsCount');
  const academicLifeEl = document.getElementById('academicLifeCount');
  const resourcesEl = document.getElementById('resourcesCount');
  const generalEl = document.getElementById('generalCount');
  
  if (studyTipsEl) studyTipsEl.textContent = categoryCounts['Study Tips'];
  if (academicLifeEl) academicLifeEl.textContent = categoryCounts['Academic Life'];
  if (resourcesEl) resourcesEl.textContent = categoryCounts['Resources'];
  if (generalEl) generalEl.textContent = categoryCounts['General'];
}

// Update user info in sidebar
function updateUserInfo(authData) {
  const userInfoContent = document.getElementById('userInfoContent');
  if (!userInfoContent) return;
  
  if (authData && authData.authenticated) {
    userInfoContent.innerHTML = `
      <p class="user-welcome">Welcome back, <strong>${escapeHtml(authData.name)}</strong>!</p>
      <p class="user-status">You can create, edit, and delete your blog posts.</p>
      <a href="#" class="logout-link" onclick="logoutUser(event)">Logout</a>
    `;
  } else {
    userInfoContent.innerHTML = `
      <p class="login-prompt">Please log in to create and manage your blog posts.</p>
      <a href="login.html" class="login-link">Login</a>
    `;
  }
}

// Logout user function
function logoutUser(event) {
  event.preventDefault();
  fetch('/api/logout', {
    method: 'POST',
    credentials: 'include'
  })
    .then(() => {
      window.location.reload();
    })
    .catch(() => {
      showMessage('Logout failed', 'error');
    });
}

// Scroll to All Posts section (for quick link)
function scrollToAllPosts() {
  const allPostsSection = document.querySelector('.recent-section');
  if (allPostsSection) {
    allPostsSection.scrollIntoView({ behavior: 'smooth' });
  }
}

// Initial load
document.addEventListener("DOMContentLoaded", async () => {
  // Check authentication status first
  const authData = await checkAuthStatus();
  if (authData && authData.authenticated) {
    currentUserId = authData.userId;
  }
  
  // Update user info in sidebar
  updateUserInfo(authData);
  
  // Then render blogs
  renderBlogs();
});
