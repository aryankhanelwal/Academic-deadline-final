# 📱 OTP Authentication API Documentation

## Overview
The Midvey backend now supports OTP-based authentication using phone numbers. This provides a secure, user-friendly alternative to traditional email/password authentication.

## 🔄 New Registration Flow

### Step 1: Send OTP for Registration
**Endpoint:** `POST /api/signup`

**Request Body:**
```json
{
  "name": "John Doe",
  "phone": "9876543210",
  "StudentId": "STU123", // optional
  "CollegeName": "ABC College", // optional
  "email": "john@example.com", // optional
  "password": "mypassword" // optional for backup login
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "OTP sent to your phone number. Please verify to complete registration.",
  "phoneNumber": "+919876543210",
  "expiresAt": "2025-08-15T13:15:00.000Z",
  "nextStep": "verify-otp"
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "User with this phone number already exists"
}
```

### Step 2: Verify OTP to Complete Registration
**Endpoint:** `POST /api/auth/verify-otp`

**Request Body:**
```json
{
  "phoneNumber": "9876543210",
  "otp": "123456"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "registrationCompleted": true,
  "user": {
    "id": "user_id_here",
    "name": "John Doe",
    "phone": "+919876543210",
    "email": "john@example.com",
    "phoneVerified": true
  }
}
```

## 🔑 Login Flow

### Phone-based Login
**Endpoint:** `POST /api/auth/phone-login`

**Request Body:**
```json
{
  "phoneNumber": "9876543210"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "OTP sent for login verification",
  "expiresAt": "2025-08-15T13:15:00.000Z",
  "userExists": true
}
```

### Verify OTP for Login
Use the same `/api/auth/verify-otp` endpoint as above.

## 🔄 Additional OTP Endpoints

### Resend OTP
**Endpoint:** `POST /api/auth/resend-otp`

**Request Body:**
```json
{
  "phoneNumber": "9876543210"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "OTP resent successfully",
  "expiresAt": "2025-08-15T13:15:00.000Z"
}
```

**Rate Limited Response (400):**
```json
{
  "success": false,
  "message": "Please wait 45 seconds before requesting another OTP"
}
```

### Check OTP Service Status
**Endpoint:** `GET /api/auth/otp-status`

**Response:**
```json
{
  "initialized": true,
  "configuration": {
    "otpLength": 6,
    "expiryMinutes": 10,
    "maxAttempts": 5,
    "rateLimitMinutes": 2,
    "twilioConfigured": true
  }
}
```

## 🚨 Error Responses

### Invalid OTP
```json
{
  "success": false,
  "message": "Invalid OTP. 3 attempts remaining.",
  "remainingAttempts": 3
}
```

### Expired OTP
```json
{
  "success": false,
  "message": "OTP has expired. Please request a new one.",
  "expired": true
}
```

### Max Attempts Exceeded
```json
{
  "success": false,
  "message": "Maximum verification attempts exceeded. Please request a new OTP.",
  "maxAttemptsExceeded": true
}
```

## 📱 Frontend Integration Guide

### Registration Flow
```javascript
// Step 1: Send OTP
async function registerUser(userData) {
  const response = await fetch('/api/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });
  
  const result = await response.json();
  
  if (result.success) {
    // Show OTP input screen
    showOTPScreen(result.phoneNumber, result.expiresAt);
  } else {
    // Show error message
    showError(result.message);
  }
}

// Step 2: Verify OTP
async function verifyOTP(phoneNumber, otp) {
  const response = await fetch('/api/auth/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber, otp })
  });
  
  const result = await response.json();
  
  if (result.success) {
    // Registration completed, user is logged in
    redirectToDashboard(result.user);
  } else {
    // Show error and remaining attempts
    showOTPError(result.message, result.remainingAttempts);
  }
}
```

### Login Flow
```javascript
// Phone login
async function loginWithPhone(phoneNumber) {
  const response = await fetch('/api/auth/phone-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber })
  });
  
  const result = await response.json();
  
  if (result.success) {
    // Show OTP input screen
    showOTPScreen(phoneNumber, result.expiresAt);
  } else {
    showError(result.message);
  }
}

// Use the same verifyOTP function as registration
```

### Resend OTP
```javascript
async function resendOTP(phoneNumber) {
  const response = await fetch('/api/auth/resend-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber })
  });
  
  const result = await response.json();
  
  if (result.success) {
    showMessage('OTP sent successfully');
    startOTPTimer(result.expiresAt);
  } else {
    showError(result.message);
  }
}
```

## 🔐 Security Features

- **Rate Limiting**: 2-minute cooldown between OTP requests
- **Attempt Limiting**: Maximum 5 verification attempts per OTP
- **Expiration**: OTPs expire after 10 minutes
- **Phone Verification**: Tracks verified phone numbers
- **Session Management**: Creates secure sessions after verification
- **Data Validation**: Comprehensive input validation and sanitization

## 🌍 Phone Number Formatting

The system automatically formats phone numbers to international format:
- `9876543210` → `+919876543210`
- `09876543210` → `+919876543210`
- `+919876543210` → `+919876543210`
- `919876543210` → `+919876543210`

Currently configured for Indian numbers (+91), but can be easily adapted for other countries.

## 🚀 Testing Without Twilio

The system works in simulation mode when Twilio credentials are not configured:
- OTPs are generated but not sent via SMS
- Check console logs for generated OTP codes during development
- All other functionality works normally

## 📊 Session Management

After successful OTP verification:
- User session is created automatically
- Use existing `/api/check-auth` endpoint to verify authentication status
- Use existing `/api/logout` endpoint to logout

## 💡 Best Practices

1. **User Experience**: Show clear countdown timers for OTP expiry
2. **Error Handling**: Display specific error messages to users
3. **Retry Logic**: Implement exponential backoff for failed attempts
4. **Loading States**: Show loading indicators during API calls
5. **Validation**: Validate phone numbers on the frontend before sending
6. **Accessibility**: Ensure OTP inputs are accessible (auto-focus, paste support)

## 🛠️ Development Setup

1. Configure Twilio credentials in `.env` file
2. Restart the server
3. Test with real phone numbers
4. Check server console for detailed logs

Your OTP authentication system is now fully functional and ready for production use! 🎉
