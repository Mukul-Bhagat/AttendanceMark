import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import connectDB from './config/db';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import sessionRoutes from './routes/sessionRoutes';
import attendanceRoutes from './routes/attendanceRoutes';
import classBatchRoutes from './routes/classBatchRoutes';
import dashboardRoutes from './routes/dashboardRoutes';

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Middleware
// CORS configuration - explicitly allow frontend origin
// This ensures the frontend at attendmark.onrender.com can access the backend
const allowedOrigins = [
  'https://attendmark.onrender.com',
  'http://localhost:5173',
  'http://localhost:3000'
];

const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // In development, allow all localhost origins
    if (process.env.NODE_ENV !== 'production' && origin.includes('localhost')) {
      return callback(null, true);
    }
    
    // For production, only allow specific origins
    if (process.env.NODE_ENV === 'production') {
      console.log(`CORS blocked origin: ${origin}`);
      return callback(new Error('Not allowed by CORS'));
    }
    
    // In development, allow all origins
    return callback(null, true);
  },
  credentials: true, // Allow cookies/auth headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.use(express.json());
// Serve static files from public/uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Define Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/classes', classBatchRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.get('/', (req, res) => res.send('API Running'));

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));

