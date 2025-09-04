/**
 * Script to check where your data is being saved
 */

const mongoose = require('mongoose');
const User = require('./models/User');
const Task = require('./models/Task');
const Blog = require('./models/Blog');
require('dotenv').config();

async function checkDataLocation() {
    try {
        console.log('🔍 Checking data storage location...\n');
        
        // Show connection string
        console.log('📡 Database Connection:');
        console.log(`   MongoDB URI: ${process.env.MONGO_URI}`);
        
        // Parse the connection string
        const mongoUri = process.env.MONGO_URI;
        const match = mongoUri.match(/mongodb:\/\/([^\/]+)\/(.+)/);
        
        if (match) {
            const [, host, database] = match;
            console.log(`   Host: ${host}`);
            console.log(`   Database Name: ${database}`);
            
            if (host === 'localhost:27017') {
                console.log('   📍 Location: Local MongoDB instance on your computer');
            } else {
                console.log('   📍 Location: Remote MongoDB server');
            }
        }
        
        console.log('');
        
        // Connect to MongoDB
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        console.log('✅ Connected successfully\n');
        
        // Get database info
        const db = mongoose.connection.db;
        console.log('🗂️ Database Information:');
        console.log(`   Database Name: ${db.databaseName}`);
        
        // List all collections
        const collections = await db.listCollections().toArray();
        console.log(`   Collections Found: ${collections.length}`);
        
        for (const collection of collections) {
            const collectionName = collection.name;
            const stats = await db.collection(collectionName).stats();
            const count = await db.collection(collectionName).countDocuments();
            
            console.log(`   📁 ${collectionName}:`);
            console.log(`      - Documents: ${count}`);
            console.log(`      - Size: ${(stats.size / 1024).toFixed(2)} KB`);
            console.log(`      - Storage Size: ${(stats.storageSize / 1024).toFixed(2)} KB`);
        }
        
        console.log('');
        
        // Check if MongoDB is local
        console.log('💾 Storage Location Details:');
        
        if (process.env.MONGO_URI.includes('localhost') || process.env.MONGO_URI.includes('127.0.0.1')) {
            console.log('   📍 Your data is stored LOCALLY on your computer');
            console.log('   🏠 MongoDB Installation Location (typical paths):');
            console.log('      Windows: C:\\Program Files\\MongoDB\\Server\\[version]\\data\\');
            console.log('      or: C:\\data\\db\\');
            console.log('      or: Custom path you configured during MongoDB installation');
            
            // Try to get MongoDB data directory (if accessible)
            try {
                const adminDb = db.admin();
                const serverStatus = await adminDb.serverStatus();
                if (serverStatus.storageEngine) {
                    console.log(`   🔧 Storage Engine: ${serverStatus.storageEngine.name}`);
                }
            } catch (e) {
                console.log('   ℹ️  (Cannot access MongoDB admin info - this is normal)');
            }
            
        } else {
            console.log('   ☁️  Your data is stored on a REMOTE MongoDB server');
            console.log('   🌐 Data Location: External MongoDB service');
        }
        
        console.log('');
        console.log('🔒 Security Notes:');
        console.log('   • Your data includes: User accounts, tasks, blogs');
        console.log('   • Passwords are stored as plain text (consider hashing!)');
        console.log('   • Email addresses and personal info are stored');
        console.log('   • OTP codes are temporarily stored for verification');
        
        console.log('');
        console.log('📊 Data Summary:');
        
        // Count documents in each model
        const userCount = await User.countDocuments();
        const taskCount = await Task.countDocuments();
        const blogCount = await Blog.countDocuments();
        
        console.log(`   👥 Users: ${userCount}`);
        console.log(`   📋 Tasks: ${taskCount}`);
        console.log(`   📝 Blogs: ${blogCount}`);
        
    } catch (error) {
        console.error('❌ Error checking data location:', error.message);
        
        if (error.message.includes('ECONNREFUSED')) {
            console.log('\n💡 MongoDB is not running. To start it:');
            console.log('   1. Check if MongoDB service is running');
            console.log('   2. Start MongoDB: net start MongoDB (as administrator)');
            console.log('   3. Or start manually: mongod');
        }
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

// Run the check
checkDataLocation().then(() => {
    console.log('✅ Data location check completed');
    process.exit(0);
}).catch((error) => {
    console.error('💥 Check failed:', error);
    process.exit(1);
});
