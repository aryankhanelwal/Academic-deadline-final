/**
 * MIDVEY BACKEND - MAIN ROUTES FILE
 * 
 * This file contains all the API routes for the Midvey application.
 * It handles user authentication, blog management, and serves static files.
 * 
 * WORKFLOW OVERVIEW:
 * 1. User Registration/Login → Creates session
 * 2. Blog Creation → Only authenticated users can create
 * 3. Blog Viewing → Public (anyone can view all blogs)
 * 4. Blog Management → Only blog owners can edit/delete their posts
 */

// Import required modules
const express = require("express");          // Web framework for Node.js
const router = express.Router();             // Express router for handling routes
const fs = require("fs");                   // File system operations (legacy)
const path = require("path");               // Path utilities for file paths
const nodemailer = require("nodemailer");   // Email sending (if needed)
const User = require("../models/User");      // User database model (MongoDB/Mongoose)
const Task = require('../models/Task');      // Task database model
const Blog = require('../models/Blog');      // Blog database model
const emailOtpService = require('../services/emailOtpService'); // Email OTP service

// Custom email OTP sending function
async function sendCustomOTPEmail(email, otpCode, expiresAt) {
  try {
    // Check if transporter is available from emailOtpService
    if (!emailOtpService.transporter) {
      console.log(`🔐 EMAIL OTP for ${email}: ${otpCode} (expires at ${expiresAt})`);
      return {
        success: true,
        message: `Email delivery failed, using simulation mode. Your OTP code is: ${otpCode}`,
        expiresAt: expiresAt,
        simulationMode: true
      };
    }

    // Send email via Nodemailer with our specific OTP
    const mailOptions = {
      from: {
        name: 'Academic Deadline Tracker',
        address: process.env.EMAIL_USER
      },
      to: email,
      subject: 'Your Verification Code - Academic Deadline Tracker',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center;">
            <h1 style="color: #2563eb; margin-bottom: 20px;">Academic Deadline Tracker</h1>
            <h2 style="color: #374151; margin-bottom: 20px;">Verify Your Email</h2>
            
            <div style="background-color: #ffffff; padding: 25px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
              <h1 style="color: #2563eb; font-size: 36px; margin: 0; font-weight: bold; letter-spacing: 5px;">
                ${otpCode}
              </h1>
            </div>
            
            <p style="color: #6b7280; font-size: 16px; margin: 20px 0;">
              Enter this verification code to complete your registration.
            </p>
            
            <p style="color: #ef4444; font-size: 14px; margin: 20px 0;">
              ⚠️ This code will expire in 10 minutes.
            </p>
            
            <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
              If you didn't request this verification code, please ignore this email.<br>
              Do not share this code with anyone.
            </p>
          </div>
        </div>
      `,
      text: `
        Academic Deadline Tracker - Email Verification
        
        Your verification code is: ${otpCode}
        
        Enter this code to complete your registration.
        This code will expire in 10 minutes.
        
        If you didn't request this verification code, please ignore this email.
        Do not share this code with anyone.
      `
    };

    // Create transporter if needed
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const info = await transporter.sendMail(mailOptions);
    
    console.log(`📧 OTP sent to ${email}. Message ID: ${info.messageId}`);
    
    return {
      success: true,
      message: 'OTP sent to your email address successfully',
      expiresAt: expiresAt,
      messageId: info.messageId
    };

  } catch (error) {
    console.error('❌ Failed to send email OTP:', error.message);
    console.warn('🔄 Falling back to simulation mode due to email error');
    
    // Fall back to simulation mode when email fails
    console.log(`🔐 EMAIL OTP for ${email}: ${otpCode} (expires at ${expiresAt})`);
    
    return {
      success: true,
      message: `Email delivery failed, using simulation mode. Your OTP code is: ${otpCode}`,
      expiresAt: expiresAt,
      simulationMode: true,
      emailError: {
        code: error.code,
        message: error.message
      }
    };
  }
}
/**
 * HOME ROUTE
 * Purpose: Serves the main landing page when users visit the root URL
 * Access: Public (no authentication required)
 */
router.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/html/home.html"));
});

/**
 * BLOG PAGE ROUTE
 * Purpose: Serves the blog page when users visit /blog or /blog.html
 * Access: Public (no authentication required)
 */
router.get("/blog", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/html/blog.html"));
});

router.get("/blog.html", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/html/blog.html"));
});

/**
 * NAVBAR ROUTES
 * Purpose: Serve navbar HTML files for dynamic loading
 * Access: Public
 */
router.get("/html/navbar.html", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/html/navbar.html"));
});

router.get("/html/navbarAfterLogin.html", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/html/navbarAfterLogin.html"));
});

/**
 * USER REGISTRATION ENDPOINT WITH EMAIL OTP
 * Purpose: Creates a new user account with email verification
 * Method: POST
 * Access: Public (no authentication required)
 * 
 * WORKFLOW:
 * 1. Extract user data from request body
 * 2. Validate required fields and check duplicates  
 * 3. Store user data temporarily in session
 * 4. Send OTP to email address
 * 5. User must verify OTP to complete registration
 * 6. NO USER IS SAVED TO DATABASE UNTIL OTP IS VERIFIED
 */
router.post("/api/signup", async (req, res) => {
  try {
    console.log('📝 Signup request received:', {
      hasName: !!req.body.name,
      hasEmail: !!req.body.email,
      hasPassword: !!req.body.password,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
    
    const { name, StudentId, CollegeName, email, password, phone } = req.body;

    // Validate required fields (email is now required instead of phone)
    if (!name || !email || !password) {
      console.warn('❌ Signup validation failed - missing required fields:', {
        hasName: !!name,
        hasEmail: !!email,
        hasPassword: !!password
      });
      return res.status(400).json({ 
        message: "Name, email, and password are required" 
      });
    }

    // Validate email format
    if (!emailOtpService.isValidEmail(email)) {
      return res.status(400).json({ 
        message: "Invalid email address format" 
      });
    }

    // Check if user already exists with this email
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ 
        message: "User with this email already exists" 
      });
    }

    // Store user data temporarily in session (NOT in database)
    req.session.pendingRegistration = {
      name,
      StudentId: StudentId || '',
      CollegeName: CollegeName || '',
      email: email,
      password: password,
      phone: phone || null,
      timestamp: Date.now()
    };

    // Generate OTP first, then send it
    const otpCode = emailOtpService.generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    // Store OTP in session for verification
    req.session.emailOtpData = {
      code: otpCode,
      email: email,
      expiresAt: expiresAt,
      attempts: 0,
      lastSentAt: new Date()
    };
    
    console.log(`💾 Session Debug - OTP stored:`, {
      sessionID: req.sessionID,
      otpCode: otpCode,
      email: email,
      expiresAt: expiresAt
    });
    
    // Create a custom email sending with our specific OTP code
    const result = await sendCustomOTPEmail(email, otpCode, expiresAt);
    
    if (result.success) {
      console.log(`✅ OTP sent to email: ${email}`);
      
      res.status(200).json({ 
        message: result.message,
        requireOTP: true,
        email: email,
        expiresAt: result.expiresAt,
        simulationMode: result.simulationMode || false
      });
    } else {
      console.error('❌ Failed to send email OTP:', result.message);
      
      // Clear session data on failure
      delete req.session.pendingRegistration;
      delete req.session.emailOtpData;
      
      res.status(400).json({ 
        message: result.message || "Failed to send verification email. Please try again."
      });
    }

  } catch (err) {
    console.error('Registration error:', err);
    
    // Clear session data on error
    delete req.session.pendingRegistration;
    delete req.session.emailOtpData;
    
    res.status(500).json({ 
      message: "Registration failed. Please try again." 
    });
  }
});

/**
 * VERIFY EMAIL OTP FOR REGISTRATION ENDPOINT
 * Purpose: Verify email OTP and complete user registration
 * Method: POST
 * Access: Public (no authentication required)
 * 
 * WORKFLOW:
 * 1. Check if pending registration exists in session
 * 2. Verify the OTP code against session data
 * 3. If valid, create user in database with email verified
 * 4. Log user in and clear session data
 * 5. Return success message
 */
router.post("/api/verify-otp", async (req, res) => {
  try {
    console.log('📧 OTP verification request received:', {
      hasOtp: !!req.body.otp,
      hasEmail: !!req.body.email,
      sessionHasPendingReg: !!req.session.pendingRegistration,
      sessionHasOtpData: !!req.session.emailOtpData,
      sessionID: req.sessionID,
      providedOtp: req.body.otp,
      providedEmail: req.body.email
    });
    
    const { otp, email } = req.body;

    if (!otp || !email) {
      return res.status(400).json({ 
        message: "OTP and email address are required" 
      });
    }

    // Check if there's a pending registration
    if (!req.session.pendingRegistration || !req.session.emailOtpData) {
      return res.status(400).json({ 
        message: "No pending registration found. Please start registration again." 
      });
    }

    const pendingReg = req.session.pendingRegistration;
    const otpData = req.session.emailOtpData;

    // Verify email matches
    if (pendingReg.email !== email || otpData.email !== email) {
      return res.status(400).json({ 
        message: "Email address mismatch" 
      });
    }

    // Check if OTP has expired
    if (new Date() > new Date(otpData.expiresAt)) {
      // Clear expired session data
      delete req.session.pendingRegistration;
      delete req.session.emailOtpData;
      return res.status(400).json({ 
        message: "OTP has expired. Please register again." 
      });
    }

    // Check if too many attempts
    if (otpData.attempts >= 5) {
      // Clear session data after max attempts
      delete req.session.pendingRegistration;
      delete req.session.emailOtpData;
      return res.status(400).json({ 
        message: "Too many OTP attempts. Please register again." 
      });
    }

    // Increment attempts
    req.session.emailOtpData.attempts = (otpData.attempts || 0) + 1;

    // Verify OTP code
    console.log(`🔍 OTP Verification Debug:`, {
      storedOTP: otpData.code,
      providedOTP: otp,
      storedOTPType: typeof otpData.code,
      providedOTPType: typeof otp,
      match: otpData.code === otp.toString()
    });
    
    if (otpData.code !== otp.toString()) {
      const remainingAttempts = 5 - req.session.emailOtpData.attempts;
      console.warn(`❌ OTP mismatch: stored=${otpData.code}, provided=${otp}`);
      return res.status(400).json({ 
        message: `Invalid OTP. ${remainingAttempts} attempts remaining.` 
      });
    }

    // OTP verified successfully - create user in database
    const newUser = new User({
      name: pendingReg.name,
      StudentId: pendingReg.StudentId,
      CollegeName: pendingReg.CollegeName,
      email: pendingReg.email,
      password: pendingReg.password,
      phone: pendingReg.phone,
      emailVerified: true // Mark email as verified
    });

    await newUser.save();
    
    // Create session for the new user
    req.session.userId = newUser._id;
    
    // Clear registration and OTP data from session
    delete req.session.pendingRegistration;
    delete req.session.emailOtpData;
    
    console.log(`✅ Registration completed for: ${newUser.name} (${newUser.email})`);
    
    res.status(200).json({ 
      message: "Registration successful! You are now logged in.",
      name: newUser.name,
      email: newUser.email
    });

  } catch (err) {
    console.error('❌ OTP verification error:', err);
    
    // Clear session data on error
    delete req.session.pendingRegistration;
    delete req.session.emailOtpData;
    
    // Handle duplicate key error
    if (err.code === 11000) {
      return res.status(400).json({ 
        message: "User with this email already exists" 
      });
    }
    
    res.status(500).json({ 
      message: "Verification failed. Please try again." 
    });
  }
});


/**
 * USER LOGIN ENDPOINT
 * Purpose: Authenticates user and creates a session
 * Method: POST
 * Access: Public (no authentication required)
 * 
 * WORKFLOW:
 * 1. Extract email and password from request
 * 2. Find user in database with matching credentials
 * 3. If found, create session with user ID
 * 4. Return success message with user name
 */
router.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  console.log("Login request body:", req.body);

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password required" });
  }

  try {
    const user = await User.findOne({ email, password });
    console.log("User found:", user);

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    req.session.userId = user._id;
    console.log("Session created for:", user._id);

    res.status(200).json({ message: "Login successful", name: user.name });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error during login" });
  }
});

/**
 * USER LOGOUT ENDPOINT
 * Purpose: Destroys the user session and logs them out
 * Method: POST
 * Access: Public (but usually called by authenticated users)
 * 
 * WORKFLOW:
 * 1. Destroy the current session
 * 2. Clear all session data
 * 3. Return success message
 */
router.post("/api/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ message: "Could not log out" });
    }
    res.status(200).json({ message: "Logout successful" });
  });
});

/**
 * AUTHENTICATION MIDDLEWARE
 * Purpose: Protects routes that require user authentication
 * Usage: Add as middleware to any route that needs authentication
 * 
 * HOW IT WORKS:
 * - Checks if user has a valid session (userId exists)
 * - If authenticated, allows request to continue (calls next())
 * - If not authenticated, returns 401 error
 */
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next(); // Continue to the actual route handler
};

/**
 * CHECK AUTHENTICATION STATUS ENDPOINT
 * Purpose: Frontend uses this to check if user is currently logged in
 * Method: GET
 * Access: Public (anyone can check, but only returns data if authenticated)
 * 
 * WORKFLOW:
 * 1. Check if session contains user ID
 * 2. If yes, fetch user details from database
 * 3. Return authentication status with user info (including userId for blog ownership)
 * 4. Frontend uses this info to show/hide edit/delete buttons
 */
router.get("/api/check-auth", async (req, res) => {
  if (req.session.userId) {
    try {
      // Fetch user details from database
      const user = await User.findById(req.session.userId);
      if (user) {
        res.status(200).json({ 
          authenticated: true, 
          name: user.name,
          userId: user._id.toString() // Frontend uses this to check blog ownership
        });
      } else {
        res.status(401).json({ authenticated: false });
      }
    } catch (err) {
      res.status(500).json({ message: "Server error" });
    }
  } else {
    res.status(401).json({ authenticated: false });
  }
});

/**
 * ===============================================
 * OTP AUTHENTICATION ROUTES
 * ===============================================
 * 
 * These routes handle phone number-based authentication using OTP (One-Time Password)
 * sent via Twilio SMS. This provides an alternative login method to email/password.
 */

/**
 * SEND OTP ENDPOINT
 * Purpose: Send OTP to user's phone number for verification
 * Method: POST
 * Access: Public (no authentication required)
 * 
 * WORKFLOW:
 * 1. Validate phone number format
 * 2. Find or create user by phone number
 * 3. Generate and send OTP via Twilio SMS
 * 4. Return success/error response
 */
router.post("/api/auth/send-otp", async (req, res) => {
  try {
    const { phoneNumber, name, StudentId, CollegeName, email } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ 
        success: false, 
        message: "Phone number is required" 
      });
    }

    // Find or create user by phone number
    const { user, isNewUser } = await otpService.findOrCreateUserByPhone(
      phoneNumber, 
      { name, StudentId, CollegeName, email }
    );

    // Send OTP
    const result = await otpService.sendOTP(phoneNumber, user);

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        isNewUser: isNewUser,
        expiresAt: result.expiresAt,
        phoneNumber: user.phone
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }

  } catch (error) {
    console.error('Error in send-otp:', error);
    res.status(500).json({
      success: false,
      message: "Server error. Please try again."
    });
  }
});

/**
 * VERIFY OTP ENDPOINT
 * Purpose: Verify OTP and authenticate user
 * Method: POST
 * Access: Public (no authentication required)
 * 
 * WORKFLOW:
 * 1. Find user by phone number
 * 2. Verify the provided OTP
 * 3. If valid, create session and log user in
 * 4. Return authentication status
 */
router.post("/api/auth/verify-otp", async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;

    if (!phoneNumber || !otp) {
      return res.status(400).json({ 
        success: false, 
        message: "Phone number and OTP are required" 
      });
    }

    // Find user by phone number
    const formattedPhone = otpService.formatPhoneNumber(phoneNumber);
    const user = await User.findOne({ phone: formattedPhone });

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found. Please request a new OTP." 
      });
    }

    // Verify OTP
    const verificationResult = await otpService.verifyOTP(user, otp);

    if (verificationResult.success) {
      // Check if this is a registration completion (tempUserData exists in session)
      if (req.session.tempUserData && req.session.tempUserData.phone === formattedPhone) {
        // Complete registration with full user data
        const tempData = req.session.tempUserData;
        
        // Update user with complete registration data
        user.name = tempData.name;
        user.StudentId = tempData.StudentId;
        user.CollegeName = tempData.CollegeName;
        user.email = tempData.email;
        user.password = tempData.password;
        user.phoneVerified = true;
        
        await user.save();
        
        // Clear temp data from session
        delete req.session.tempUserData;
        
        console.log(`Registration completed for: ${user.name} (${user.phone})`);
      }
      
      // Create session for authenticated user
      req.session.userId = user._id;
      
      console.log(`User authenticated via OTP: ${user.name} (${user.phone})`);
      
      res.json({
        success: true,
        message: verificationResult.message,
        registrationCompleted: !!req.session.tempUserData,
        user: {
          id: user._id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          phoneVerified: user.phoneVerified
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: verificationResult.message,
        remainingAttempts: verificationResult.remainingAttempts,
        expired: verificationResult.expired,
        maxAttemptsExceeded: verificationResult.maxAttemptsExceeded
      });
    }

  } catch (error) {
    console.error('Error in verify-otp:', error);
    res.status(500).json({
      success: false,
      message: "Server error. Please try again."
    });
  }
});

/**
 * PHONE LOGIN ENDPOINT
 * Purpose: Alternative login using phone number (sends OTP)
 * Method: POST
 * Access: Public (no authentication required)
 * 
 * WORKFLOW:
 * 1. Check if user exists with phone number
 * 2. Send OTP for verification
 * 3. Return response indicating OTP sent
 */
router.post("/api/auth/phone-login", async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ 
        success: false, 
        message: "Phone number is required" 
      });
    }

    // Check if user exists
    const formattedPhone = otpService.formatPhoneNumber(phoneNumber);
    const user = await User.findOne({ phone: formattedPhone });

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "No account found with this phone number. Please sign up first." 
      });
    }

    // Send OTP for login
    const result = await otpService.sendOTP(phoneNumber, user);

    if (result.success) {
      res.json({
        success: true,
        message: "OTP sent for login verification",
        expiresAt: result.expiresAt,
        userExists: true
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }

  } catch (error) {
    console.error('Error in phone-login:', error);
    res.status(500).json({
      success: false,
      message: "Server error. Please try again."
    });
  }
});

/**
 * RESEND OTP ENDPOINT
 * Purpose: Resend OTP to user's phone number
 * Method: POST
 * Access: Public (no authentication required)
 * 
 * WORKFLOW:
 * 1. Find user by phone number
 * 2. Check rate limiting
 * 3. Generate and send new OTP
 * 4. Return success/error response
 */
router.post("/api/auth/resend-otp", async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ 
        success: false, 
        message: "Phone number is required" 
      });
    }

    // Find user by phone number
    const formattedPhone = otpService.formatPhoneNumber(phoneNumber);
    const user = await User.findOne({ phone: formattedPhone });

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    // Resend OTP
    const result = await otpService.sendOTP(phoneNumber, user);

    if (result.success) {
      res.json({
        success: true,
        message: "OTP resent successfully",
        expiresAt: result.expiresAt
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }

  } catch (error) {
    console.error('Error in resend-otp:', error);
    res.status(500).json({
      success: false,
      message: "Server error. Please try again."
    });
  }
});

/**
 * GET EMAIL OTP SERVICE STATUS ENDPOINT
 * Purpose: Check email OTP service configuration and status
 * Method: GET
 * Access: Public (for debugging/monitoring)
 */
router.get("/api/auth/email-otp-status", (req, res) => {
  const status = emailOtpService.getStatus();
  res.json(status);
});

/**
 * ===============================================
 * BLOG MANAGEMENT ROUTES
 * ===============================================
 * 
 * KEY FEATURES:
 * - Public viewing: Anyone can see all blogs
 * - Authenticated creation: Only logged-in users can create blogs
 * - Owner-only editing: Users can only edit/delete their own blogs
 * - Author attribution: All blogs show who wrote them
 */

/**
 * GET ALL BLOGS ENDPOINT
 * Purpose: Fetch and display all blog posts from all users
 * Method: GET
 * Access: PUBLIC (no authentication required)
 * 
 * WORKFLOW:
 * 1. Fetch all blogs from database
 * 2. Populate author information (userId -> name)
 * 3. Sort by creation date (newest first)
 * 4. Return all blogs to frontend
 * 
 * FRONTEND BEHAVIOR:
 * - Everyone sees all blogs
 * - Edit/Delete buttons only appear for blog owners
 */
router.get("/api/blogs", async (req, res) => {

  try {
    // Fetch all blogs and populate author names
    const blogs = await Blog.find({})                    // Find all blogs
      .populate('userId', 'name')                        // Replace userId with user's name
      .sort({ createdAt: -1 });                         // Sort by newest first
    
    res.json(blogs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching blogs" });
  }
});

/**
 * GET SINGLE BLOG ENDPOINT
 * Purpose: Fetch a specific blog post by its ID
 * Method: GET
 * Access: PUBLIC (no authentication required)
 * 
 * WORKFLOW:
 * 1. Extract blog ID from URL parameters
 * 2. Find blog in database by ID
 * 3. Populate author information
 * 4. Return blog data or 404 if not found
 * 
 * USED FOR:
 * - Detailed blog view pages
 * - Edit form population (when editing)
 */
router.get("/api/blogs/:id", async (req, res) => {
  try {
    // Find specific blog by ID and populate author name
    const blog = await Blog.findById(req.params.id).populate('userId', 'name');
    
    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }
    
    res.json(blog);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching blog" });
  }
});

/**
 * CREATE NEW BLOG ENDPOINT
 * Purpose: Allow authenticated users to create new blog posts
 * Method: POST
 * Access: AUTHENTICATED ONLY (requireAuth middleware)
 * 
 * WORKFLOW:
 * 1. Check user authentication (requireAuth middleware)
 * 2. Validate required fields (title, content)
 * 3. Create new blog with user ID from session
 * 4. Save to database
 * 5. Return success with blog data
 * 
 * SECURITY:
 * - Must be logged in to create blogs
 * - User ID automatically set from session
 * - No user can create blogs for other users
 */
router.post("/api/blogs", requireAuth, async (req, res) => {
  try {
    const { title, content, category, image } = req.body;
    
    // Validate required fields
    if (!title || !content) {
      return res.status(400).json({ message: "Title and content are required" });
    }
    
    // Create new blog object
    const newBlog = new Blog({
      title,
      content,
      category: category || 'General',                   // Category with default
      image: image || null,                              // Optional image
      userId: req.session.userId                         // Author ID from session
    });
    
    // Save to database
    await newBlog.save();
    
    // Populate author name for response
    await newBlog.populate('userId', 'name');
    
    res.status(201).json({ 
      message: "Blog created successfully", 
      blog: newBlog 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error creating blog" });
  }
});

/**
 * UPDATE BLOG ENDPOINT
 * Purpose: Allow users to edit their own blog posts
 * Method: PUT
 * Access: AUTHENTICATED ONLY (requireAuth middleware)
 * 
 * WORKFLOW:
 * 1. Check user authentication (requireAuth middleware)
 * 2. Validate required fields (title, content)
 * 3. Find blog by ID AND verify ownership (userId matches session)
 * 4. Update blog fields
 * 5. Save changes and return updated blog
 * 
 * SECURITY:
 * - Must be logged in to edit blogs
 * - Can only edit own blogs (userId verification)
 * - Returns 404 if blog not found or not owned by user
 */
router.put("/api/blogs/:id", requireAuth, async (req, res) => {
  try {
    const { title, content, category, image } = req.body;
    
    // Validate required fields
    if (!title || !content) {
      return res.status(400).json({ message: "Title and content are required" });
    }
    
    // Find blog by ID AND verify ownership (security check)
    const blog = await Blog.findOne({ 
      _id: req.params.id,                                // Blog ID from URL
      userId: req.session.userId                         // Must be owned by current user
    });
    
    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }
    
    // Update blog fields
    blog.title = title;
    blog.content = content;
    if (category) {
      blog.category = category;
    }
    if (image !== undefined) {
      blog.image = image;
    }
    blog.updatedAt = Date.now();                         // Update timestamp
    
    // Save changes and populate author info
    await blog.save();
    await blog.populate('userId', 'name');
    
    res.json({ 
      message: "Blog updated successfully", 
      blog 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error updating blog" });
  }
});

/**
 * DELETE BLOG ENDPOINT
 * Purpose: Allow users to delete their own blog posts
 * Method: DELETE
 * Access: AUTHENTICATED ONLY (requireAuth middleware)
 * 
 * WORKFLOW:
 * 1. Check user authentication (requireAuth middleware)
 * 2. Find and delete blog by ID AND verify ownership
 * 3. Return success message or 404 if not found/owned
 * 
 * SECURITY:
 * - Must be logged in to delete blogs
 * - Can only delete own blogs (userId verification)
 * - Permanent deletion (no recovery)
 */
router.delete("/api/blogs/:id", requireAuth, async (req, res) => {
  try {
    // Find and delete blog in one operation, with ownership verification
    const blog = await Blog.findOneAndDelete({ 
      _id: req.params.id,                                // Blog ID from URL
      userId: req.session.userId                         // Must be owned by current user
    });
    
    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }
    
    res.json({ message: "Blog deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error deleting blog" });
  }
});


/**
 * ===============================================
 * EMAIL REMINDER MANAGEMENT ROUTES
 * ===============================================
 */

/**
 * GET USER REMINDER PREFERENCES
 * Purpose: Fetch current user's email reminder settings
 * Method: GET
 * Access: AUTHENTICATED ONLY
 */
router.get("/api/reminder-preferences", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.json({
      emailReminders: user.emailReminders || {
        enabled: true,
        reminderDays: [1, 3, 7],
        dailyDigest: false,
        reminderTime: '17:30'
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching reminder preferences" });
  }
});

/**
 * UPDATE USER REMINDER PREFERENCES
 * Purpose: Update current user's email reminder settings
 * Method: PUT
 * Access: AUTHENTICATED ONLY
 */
router.put("/api/reminder-preferences", requireAuth, async (req, res) => {
  try {
    const { enabled, reminderDays, dailyDigest, reminderTime } = req.body;
    
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Update reminder preferences
    user.emailReminders = {
      enabled: enabled !== undefined ? enabled : user.emailReminders?.enabled || true,
      reminderDays: reminderDays || user.emailReminders?.reminderDays || [1, 3, 7],
      dailyDigest: dailyDigest !== undefined ? dailyDigest : user.emailReminders?.dailyDigest || false,
      reminderTime: reminderTime || user.emailReminders?.reminderTime || '17:30'
    };
    
    await user.save();
    
    res.json({ 
      message: "Reminder preferences updated successfully", 
      emailReminders: user.emailReminders 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error updating reminder preferences" });
  }
});

/**
 * MANUAL REMINDER TEST ENDPOINT
 * Purpose: Allow users to test their email reminder functionality
 * Method: POST
 * Access: AUTHENTICATED ONLY
 */
router.post("/api/test-reminder", requireAuth, async (req, res) => {
  try {
    const reminderScheduler = require('../services/reminderScheduler');
    const user = await User.findById(req.session.userId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    if (!user.emailReminders?.enabled) {
      return res.status(400).json({ message: "Email reminders are disabled. Enable them first." });
    }
    
    // Test sending reminders for this user
    const remindersSent = await reminderScheduler.processUserDeadlineReminders(user);
    
    res.json({ 
      message: "Test reminder completed",
      remindersSent: remindersSent,
      note: "If you have tasks due in 1, 3, or 7 days, you should receive reminder emails."
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error testing reminders" });
  }
});

// Export the router to be used in server.js
require('dotenv').config();

router.post("/contact", async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    // Setup transporter using Gmail
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
    port: 587,
    secure: false,
    tls: {
    rejectUnauthorized: false
  }
      
    });

    // Email options
    const mailOptions = {
      from: email,
      to: process.env.EMAIL_USER, // Send to your own email
      subject: `New Contact Message from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`
    };

    // Send mail
    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "Message sent successfully" });
  } catch (err) {
    console.error("Email error:", err);
    res.status(500).json({ message: "Failed to send message" });
  }
});



// Export the router to be used in server.js
module.exports = router;