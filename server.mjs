import cookieParser from 'cookie-parser';
import express from 'express';
import morgan from 'morgan';
import mongoose from 'mongoose';
import ViteExpress from 'vite-express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const db_user = encodeURIComponent(process.env.db_user);
const db_password = encodeURIComponent(process.env.db_password);
const db_cluster = process.env.db_cluster;
const DB_URI = `mongodb+srv://${db_user}:${db_password}@${db_cluster}`;

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

mongoose.connect(DB_URI).then(() => 
    console.log('Connected to MongoDB')
).catch((err) => 
    console.log(error));

ViteExpress.listen(app, PORT, () => {
    console.log(`Server running on port ${PORT}`);
});