const express = require('express');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const multer = require('multer');
const cors = require('cors'); // لتفعيل CORS
const WebSocket = require('ws');

// إعداد Multer لتخزين الملفات المرفوعة في المجلد data مع أسماء فريدة
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', 'data')); // تخزين الملفات في data
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
    },
});

const upload = multer({ storage });
const app = express();
const PORT = process.env.PORT || 3000;

// تفعيل CORS للسماح بالطلبات من الفرونت إند
app.use(cors());

// تقديم ملفات الفرونت إند
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

// استخدام راوت observations.js
const observationsRoutes = require('../routes/observations');
app.use('/observations', observationsRoutes);

// إعداد WebSocket
const wss = new WebSocket.Server({ noServer: true });

wss.on('connection', (ws) => {
    console.log('Client connected to WebSocket');

    const jsonFilePath = path.join(__dirname, '..', 'output', 'fhir_observations.json');
    let data;

    try {
        const fileContent = fs.readFileSync(jsonFilePath, 'utf8');
        data = JSON.parse(fileContent);
        console.log('Loaded data:', data);
    } catch (err) {
        console.error('Error reading JSON file:', err);
        ws.close();
        return;
    }

    let index = 0;
    const intervalId = setInterval(() => {
        if (index < data.length) {
            ws.send(JSON.stringify(data[index]));
            index++;
        } else {
            clearInterval(intervalId);
            ws.close();
        }
    }, 1000);

    ws.on('close', () => {
        console.log('Client disconnected');
        clearInterval(intervalId);
    });
});

// API لرفع الملفات ومعالجتها
app.post('/upload', upload.single('file'), (req, res) => {
    const filePath = req.file.path; // مسار الملف المرفوع

    // مسار سكريبت Python
    const scriptPath = path.join(__dirname, '..', 'scripts', 'process_ecg.py');

    // إعداد الأمر لتشغيل السكريبت مع تغليف المسارات
    const command = `python "${scriptPath}" "${filePath}"`;

    exec(command, { cwd: path.join(__dirname, '..') }, (error, stdout, stderr) => {
        if (error) {
            console.error('Error processing file:', stderr);
            return res.status(500).json({ error: 'Failed to process file' });
        }

        console.log('Python script output:', stdout);

        // مسار ملف JSON الناتج
        const outputFilePath = path.join(__dirname, '..', 'output', 'fhir_observations.json');
        fs.readFile(outputFilePath, 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading JSON file:', err);
                return res.status(500).json({ error: 'Failed to read processed data' });
            }
            res.json(JSON.parse(data));
        });
    });
});

// تشغيل الخادم
const server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

// إعداد WebSocket عند ترقية الطلبات
server.on('upgrade', (req, socket, head) => {
    wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
    });
});
