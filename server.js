// Import required modules
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const cors = require("cors");
const session = require("express-session");
const routes = require("./routers/route");
const taskRoutes = require("./routers/taskRoutes");
const reminderScheduler = require("./services/reminderScheduler");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0"; // allow external access

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log("✅ Connected to MongoDB");
  reminderScheduler.init();
})
.catch(err => {
  console.error("❌ MongoDB connection failed:", err);
});

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || "midvey-task-secret-key",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // change to true when using HTTPS
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Enable CORS
app.use(cors({
  origin: true,
  credentials: true
}));

// Body parsers
app.use(bodyParser.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: false, limit: "50mb" }));

// Routes
app.use("/", routes);
app.use("/tasks", taskRoutes);

// Static files
app.use(express.static(path.join(__dirname, "public")));

// Start server
app.listen(PORT,'0.0.0.0' ,() => {
  console.log(`🚀 Server running at http://13.232.189.221:${PORT}`);
});
