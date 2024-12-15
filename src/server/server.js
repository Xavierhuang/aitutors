import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
// Comment out or remove Twilio import
// import twilio from './services/twilio.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Remove or comment out Twilio-related routes
// Keep only the essential routes

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 