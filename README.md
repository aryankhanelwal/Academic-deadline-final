# Academic Deadline - Backend API

A comprehensive backend API for managing academic deadlines, tasks, and blog content. This Node.js application provides authentication, task management, and blogging capabilities for students.

## 🚀 Features

- **User Authentication**: Secure user registration and login
- **Task Management**: Create, read, update, and delete academic tasks
- **Deadline Tracking**: Monitor important academic deadlines
- **Blog System**: Share study tips and academic resources
- **Priority Tasks**: Mark important tasks for better organization
- **Recurring Tasks**: Set up repeating tasks and deadlines
- **Email Integration**: Email notifications and communication
- **Session Management**: Secure user sessions

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JSON Web Tokens (JWT)
- **Email**: Nodemailer
- **Session Management**: Express-Session
- **Development**: Nodemon for hot reloading

## 📋 Prerequisites

Before running this application, make sure you have the following installed:

- [Node.js](https://nodejs.org/) (v14 or higher)
- [MongoDB](https://www.mongodb.com/) (local installation or MongoDB Atlas)
- [Git](https://git-scm.com/)

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/aryankhanelwal/Academic_Deadline.git
   cd Academic_Deadline
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   - Copy the `.env` file and configure your environment variables:
   ```bash
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_email_password
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   ```

4. **Database Setup**
   - Make sure MongoDB is running on your local machine
   - The application connects to `mongodb://localhost:27017` by default
   - Update the connection string in `server.js` if using MongoDB Atlas

## 🚀 Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:3000`

## 📁 Project Structure

```
Academic_Deadline/
├── models/
│   ├── User.js          # User schema and model
│   ├── Task.js          # Task schema and model
│   └── Blog.js          # Blog schema and model
├── routers/
│   ├── route.js         # Main application routes
│   └── taskRoutes.js    # Task-specific routes
├── middleware/
│   └── auth.js          # Authentication middleware
├── public/              # Static files
├── server.js            # Main application entry point
├── package.json         # Project dependencies
└── .env                 # Environment variables
```

## 📊 Data Models

### User Model
```javascript
{
  name: String,
  StudentId: String,
  CollegeName: String,
  email: String (unique),
  password: String,
  phone: String
}
```

### Task Model
```javascript
{
  taskid: String (unique),
  userId: ObjectId (ref: User),
  title: String (required),
  category: String,
  date: Date,
  notes: String,
  isPriority: Boolean,
  isRecurring: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Blog Model
```javascript
{
  title: String (required),
  content: String (required),
  category: String (enum: ['Study Tips', 'Academic Life', 'Resources', 'General']),
  image: String,
  userId: ObjectId (ref: User),
  createdAt: Date,
  updatedAt: Date
}
```

## 🔌 API Endpoints

### Authentication Routes
- `POST /register` - User registration
- `POST /login` - User login
- `POST /logout` - User logout

### Task Routes
- `GET /tasks` - Get all tasks for authenticated user
- `POST /tasks` - Create a new task
- `PUT /tasks/:id` - Update a task
- `DELETE /tasks/:id` - Delete a task

### Blog Routes
- `GET /blogs` - Get all blog posts
- `POST /blogs` - Create a new blog post
- `PUT /blogs/:id` - Update a blog post
- `DELETE /blogs/:id` - Delete a blog post

## ⚙️ Configuration

### MongoDB Configuration
Update the MongoDB connection string in `server.js`:
```javascript
const mongoURI = "your_mongodb_connection_string";
```

### Email Configuration
Configure email settings in `.env`:
- `EMAIL_USER`: Your email address
- `EMAIL_PASS`: Your email password (use app password for Gmail)
- `EMAIL_HOST`: SMTP host
- `EMAIL_PORT`: SMTP port

### Session Configuration
Session settings can be modified in `server.js`:
```javascript
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // Set to true for HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));
```

## 🔒 Security Features

- Password encryption (implement bcrypt for production)
- JWT token authentication
- Session management
- CORS enabled with credentials
- Input validation and sanitization
- Secure cookie configuration

## 📝 Development

### Adding New Routes
1. Create route handlers in the appropriate router file
2. Import and use the router in `server.js`
3. Add authentication middleware where needed

### Database Operations
- Use Mongoose models for database operations
- Implement proper error handling
- Use async/await for database queries

## 🧪 Testing

To test the API endpoints, you can use:
- [Postman](https://www.postman.com/)
- [Thunder Client](https://www.thunderclient.com/) (VS Code extension)
- [curl](https://curl.se/) commands

Example curl command:
```bash
curl -X POST http://localhost:3000/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","password":"password123"}'
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Create a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 👨‍💻 Author

**Aryan Khanelwal**
- GitHub: [@aryankhanelwal](https://github.com/aryankhanelwal)
- Email: 2002ak2002@gmail.com

## 🐛 Issues

If you find any bugs or have feature requests, please create an issue on the [GitHub repository](https://github.com/aryankhanelwal/Academic_Deadline/issues).

## 📚 Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [Mongoose Documentation](https://mongoosejs.com/)
- [Node.js Documentation](https://nodejs.org/docs/)
- [MongoDB Documentation](https://docs.mongodb.com/)

---

⭐ If you find this project useful, please give it a star on GitHub!
