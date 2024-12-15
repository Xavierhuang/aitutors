import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import fs from 'fs';
import xlsx from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let chatHistory = new Map();

function loadChatHistory() {
  try {
    const workbook = xlsx.readFile('Combined_QA_Dataset.xlsx');
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(worksheet);
    
    chatHistory.clear();
    data.forEach(row => {
      if (row.question && row.answer) {
        chatHistory.set(row.question.toLowerCase(), {
          question: row.question,
          answer: row.answer,
          timestamp: row.timestamp || new Date().toISOString()
        });
      }
    });
    
    console.log(`Loaded ${chatHistory.size} QA pairs`);
  } catch (error) {
    console.error('Error loading chat history:', error);
  }
}

function scanMaterials() {
  const folderPath = path.join(__dirname, 'MachineLearning6025');
  
  try {
    console.log('Scanning materials from:', folderPath);
    
    if (!fs.existsSync(folderPath)) {
      console.error('Folder not found:', folderPath);
      global.materials = {
        machinelearning: {
          title: "Machine Learning (COMP6025) Materials",
          modules: [],
          error: "Folder not found"
        }
      };
      return;
    }

    // Get all files and process them
    const files = fs.readdirSync(folderPath)
      .filter(file => file.endsWith('.pptx'))
      .map(file => {
        const stats = fs.statSync(path.join(folderPath, file));
        const moduleMatch = file.match(/Mod(?:ule)?(\d+)/i);
        const moduleNum = moduleMatch ? parseInt(moduleMatch[1]) : 0;
        
        return {
          name: file,
          displayName: file.replace(/_/g, ' ').replace('.pptx', ''),
          module: moduleNum,
          type: 'pptx',
          path: `/MachineLearning6025/${file}`,
          size: stats.size,
          lastModified: stats.mtime
        };
      });

    console.log('Processed files:', files.length);

    // Group files by module
    const groupedFiles = files.reduce((acc, file) => {
      const moduleKey = `Module ${file.module}`;
      if (!acc[moduleKey]) {
        acc[moduleKey] = [];
      }
      acc[moduleKey].push(file);
      return acc;
    }, {});

    // Sort files within each module
    Object.keys(groupedFiles).forEach(moduleKey => {
      groupedFiles[moduleKey].sort((a, b) => {
        const numA = parseInt(a.name.match(/lecture(\d+)/i)?.[1] || '0');
        const numB = parseInt(b.name.match(/lecture(\d+)/i)?.[1] || '0');
        return numA - numB;
      });
    });

    global.materials = {
      machinelearning: {
        title: "Machine Learning (COMP6025) Materials",
        modules: Object.keys(groupedFiles).sort().map(moduleKey => ({
          name: moduleKey,
          files: groupedFiles[moduleKey]
        })),
        count: files.length
      }
    };

    console.log('Materials organized into modules:', Object.keys(groupedFiles).length);

  } catch (error) {
    console.error('Error in scanMaterials:', error);
    global.materials = {
      machinelearning: {
        title: "Machine Learning (COMP6025) Materials",
        modules: [],
        error: error.message
      }
    };
  }
}

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: ['https://theaitutors.com', 'http://theaitutors.com'],
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true
}));

// Add preflight handler
app.options('*', cors());

// Handle API routes
app.use(express.json({ limit: '10mb' }));

// Serve static files
// app.use(express.static(path.join(__dirname)));
console.log('Serving static files from:', __dirname);

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Serve your materials directory
app.use('/MachineLearning6025', express.static(path.join(__dirname, 'MachineLearning6025')));

// Scan materials when server starts
scanMaterials();

// Then add your routes
app.get('/api/materials', (req, res) => {
  const folderPath = path.join(__dirname, 'MachineLearning6025');
  
  try {
    if (!fs.existsSync(folderPath)) {
      return res.json({
        title: "Machine Learning (COMP6025) Materials",
        files: [],
        message: `No materials found at ${folderPath}`
      });
    }

    const allFiles = fs.readdirSync(folderPath);
    const files = allFiles
      .filter(file => file.endsWith('.pptx'))
      .map(file => ({
        name: file,
        displayName: file.replace(/_/g, ' ').replace('.pptx', ''),
        type: 'pptx',
        path: `/MachineLearning6025/${file}`,
        size: fs.statSync(path.join(folderPath, file)).size,
        lastModified: fs.statSync(path.join(folderPath, file)).mtime
      }));

    res.json({
      title: "Machine Learning (COMP6025) Materials",
      files: files
    });

  } catch (error) {
    console.error('Error serving materials:', error);
    res.status(500).json({
      error: 'Failed to load materials',
      details: error.message
    });
  }
});

// Test endpoint
app.get('/api/test', (req, res) => {
  const folderPath = path.join(__dirname, 'MachineLearning6025');
  res.json({
    currentDir: __dirname,
    folderPath: folderPath,
    exists: fs.existsSync(folderPath),
    files: fs.existsSync(folderPath) ? fs.readdirSync(folderPath) : []
  });
});

// Add body-parser middleware
app.use(express.json());

// Update the admin login endpoint with proper error handling
app.post('/api/admin/login', (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('Login attempt:', { username }); // Log for debugging

    if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
      console.error('Admin credentials not configured');
      return res.status(500).json({ 
        error: 'Server configuration error' 
      });
    }

    if (username === process.env.ADMIN_USERNAME && 
        password === process.env.ADMIN_PASSWORD) {
      console.log('Login successful');
      return res.json({ 
        success: true 
      });
    }

    console.log('Login failed: Invalid credentials');
    return res.status(401).json({ 
      error: 'Invalid credentials' 
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// Update the corrections endpoint
app.post('/api/admin/corrections', async (req, res) => {
  try {
    const { original, correction } = req.body;
    
    if (!original || !correction) {
      return res.status(400).json({ 
        error: 'Missing required fields' 
      });
    }

    // Log the correction
    console.log('New correction:', {
      timestamp: new Date().toISOString(),
      original,
      correction
    });

    // Here you could:
    // 1. Save to a database
    // 2. Write to a file
    // 3. Send to a training service
    
    res.json({ 
      success: true,
      message: 'Correction saved successfully'
    });

  } catch (error) {
    console.error('Error saving correction:', error);
    res.status(500).json({
      error: 'Failed to save correction',
      details: error.message
    });
  }
});

// Add route to get database entries
app.get('/api/database/entries', (req, res) => {
  try {
    // Log the current directory and file path
    const filePath = path.join(__dirname, 'Combined_QA_Dataset.xlsx');
    console.log('Looking for Excel file at:', filePath);
    
    if (!fs.existsSync(filePath)) {
      console.error('Excel file not found at:', filePath);
      return res.status(404).json({ 
        error: 'Database file not found',
        path: filePath 
      });
    }

    const workbook = xlsx.readFile(filePath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(worksheet);
    
    console.log('Loaded entries:', data.length);
    
    // Transform data to ensure consistent format
    const formattedData = data.map(row => ({
      question: row.question || row.Question || '',
      answer: row.answer || row.Answer || ''
    }));

    res.json(formattedData);
  } catch (error) {
    console.error('Error reading database:', error);
    res.status(500).json({ 
      error: 'Failed to read database',
      details: error.message 
    });
  }
});

// Update the database update endpoint
app.post('/api/database/update', (req, res) => {
  try {
    const { index, entry } = req.body;
    
    // Update Excel file
    const workbook = xlsx.readFile('Combined_QA_Dataset.xlsx');
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(worksheet);
    
    data[index] = entry;
    
    const newWorksheet = xlsx.utils.json_to_sheet(data);
    workbook.Sheets[workbook.SheetNames[0]] = newWorksheet;
    xlsx.writeFile(workbook, 'Combined_QA_Dataset.xlsx');
    
    // Update chat history
    chatHistory.set(entry.question.toLowerCase(), {
      ...entry,
      timestamp: new Date().toISOString()
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating database:', error);
    res.status(500).json({ error: 'Failed to update database' });
  }
});

// Add delete endpoint
app.post('/api/database/delete', (req, res) => {
  try {
    const { index } = req.body;
    
    // Read current data
    const workbook = xlsx.readFile('Combined_QA_Dataset.xlsx');
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(worksheet);
    
    // Remove the entry
    data.splice(index, 1);
    
    // Write back to file
    const newWorksheet = xlsx.utils.json_to_sheet(data);
    workbook.Sheets[workbook.SheetNames[0]] = newWorksheet;
    xlsx.writeFile(workbook, 'Combined_QA_Dataset.xlsx');
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting from database:', error);
    res.status(500).json({ error: 'Failed to delete from database' });
  }
});

// Add insert endpoint
app.post('/api/database/insert', (req, res) => {
  try {
    const newEntry = req.body;
    
    // Read current data
    const workbook = xlsx.readFile('Combined_QA_Dataset.xlsx');
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(worksheet);
    
    // Add new entry
    data.push(newEntry);
    
    // Write back to file
    const newWorksheet = xlsx.utils.json_to_sheet(data);
    workbook.Sheets[workbook.SheetNames[0]] = newWorksheet;
    xlsx.writeFile(workbook, 'Combined_QA_Dataset.xlsx');
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error inserting into database:', error);
    res.status(500).json({ error: 'Failed to insert into database' });
  }
});

// Add endpoint to get chat history
app.get('/api/chat/history', (req, res) => {
  const history = Array.from(chatHistory.values());
  res.json(history);
});

// Catch-all route should be last
app.get('*', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  } else {
    res.sendFile(path.join(__dirname, 'index.html'));
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).send('Something broke!');
});

console.log('Starting server...');
console.log('Current directory:', __dirname);
console.log('Environment:', process.env.NODE_ENV);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log('Environment:', process.env.NODE_ENV);
}); 