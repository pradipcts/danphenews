import mongoose from 'mongoose';

// ⚠️ Replace this with your actual MongoDB URI
const mongoURI = 'mongodb://pradipbhatt:pradip@ac-lbf0avp-shard-00-00.zi62tma.mongodb.net:27017,ac-lbf0avp-shard-00-01.zi62tma.mongodb.net:27017,ac-lbf0avp-shard-00-02.zi62tma.mongodb.net:27017/news-portal?ssl=true&replicaSet=atlas-3k5ach-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0';

const connectDB = async () => {
    if (!mongoURI) {
        console.error('MongoDB URI is missing');
        process.exit(1);
    }

    mongoose.set('strictQuery', true); // For Mongoose 7+

    mongoose.connection.on('connecting', () => {
        console.log('Connecting to MongoDB...');
    });

    mongoose.connection.on('connected', () => {
        console.log(`MongoDB connected to: ${mongoose.connection.host}/${mongoose.connection.name}`);
    });

    mongoose.connection.on('disconnected', () => {
        console.warn('MongoDB disconnected!');
    });

    mongoose.connection.on('reconnected', () => {
        console.log('MongoDB reconnected');
    });

    mongoose.connection.on('error', (error) => {
        console.error(`MongoDB connection error: ${error.message}`);
    });

    const options = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
        maxPoolSize: 10,
    };

    try {
        const conn = await mongoose.connect(mongoURI, options);
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        console.log(`📂 Database Name: ${conn.connection.name}`);
        return conn;
    } catch (error) {
        console.error(`❌ MongoDB Connection Error: ${error.message}`);
        process.exit(1);
    }
};

// Graceful shutdown
process.on('SIGINT', async () => {
    try {
        await mongoose.connection.close();
        console.log('🛑 MongoDB connection closed due to app termination');
        process.exit(0);
    } catch (err) {
        console.error('Error closing MongoDB connection:', err);
        process.exit(1);
    }
});

export default connectDB;
