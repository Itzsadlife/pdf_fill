const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
const port = 3001;

app.use(bodyParser.json());

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.post('/save-pdf', upload.single('file'), (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).send('No file uploaded.');
  }

  const savePath = path.join(__dirname, 'uploads', file.originalname);

  fs.writeFile(savePath, file.buffer, (err) => {
    if (err) {
      console.error('Error saving file:', err);
      return res.status(500).send('Failed to save file.');
    }
    res.status(200).send('File saved successfully.');
  });
});

app.get('/get-pdf-url', (req, res) => {
  const pdfFiles = [
    'Acknowlegement Receipt IBPO.pdf',
    'Authorisation Letter - AFFIN & LIBBWEI.pdf'
  ];
  
  let pdfUrls = {};

  pdfFiles.forEach(file => {
    const modifiedPdfPath = path.join(__dirname, 'uploads', file.replace('.pdf', '-modified.pdf'));
    const originalPdfPath = path.join(__dirname, 'assets', file);

    if (fs.existsSync(modifiedPdfPath)) {
      pdfUrls[file] = `http://localhost:3001/uploads/${file.replace('.pdf', '-modified.pdf')}`;
    } else {
      pdfUrls[file] = `http://localhost:3001/assets/${file}`;
    }
  });

  res.json({ pdfUrls });
  console.log(pdfUrls);
});

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
