const {S3Client , PutObjectCommand ,GetObjectCommand ,DeleteObjectCommand } = require('@aws-sdk/client-s3')
const dotenv = require('dotenv')
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const app = express();


const port = process.env.PORT || 3000;
dotenv.config();
app.use(cors());

// * Set up Multer with the storage
const storage = multer.memoryStorage();

// *! CloudFlare Credentials

const S3 = new S3Client({
    region: 'auto',
    endpoint: process.env.ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
  
  
  //* For Uploading the File on Cloudflare Storage

  const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'text/csv') {
      cb(null, true); // Accept the file
    } else {
      cb(new Error('Invalid file type. Only CSV files are allowed.'), false); // Reject the file
    }
  };
  
  const upload = multer({ storage, fileFilter });
  
  app.post('/upload', upload.single('file'), async (req, res) => {
    try {
      if (req.file) {
        await S3.send(
          new PutObjectCommand({
            Body: req.file.buffer,
            Bucket: 'cli-storage',
            Key: req.file.originalname,
            ContentType: req.file.mimetype,
          })
        );
        res.status(200).send('File Upload: File should be CSV.');
      } else {
        res.status(400).send('No file uploaded.');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      res.status(500).send('Internal server error');
    }
  });
  
  
  
  //* For Accessing the file with {filename} param from the Cloudflare Storage
  
  app.get('/draw-chart/:filename', async (req, res) => {
    const { filename } = req.params; // Get the filename from the route parameters
  
    console.log(filename)
    try {
      const data = await S3.send(
        new GetObjectCommand({
          Bucket: 'cli-storage', // Replace with your S3 bucket name
          Key: filename, // Use the filename from the route params as the key
        })
      );
  
      console.log(typeof(data))
    
      
      // Set the appropriate response headers based on the file's metadata
      res.set('Content-Type', 'text/csv');
      res.set('Content-Disposition', `attachment; filename="${filename}"`);
  
      // Send the file data as the response
    
      data.Body.pipe(res);
    } catch (error) {
      console.error('Error retrieving file from S3:', error);
  
     
      res.status(500).json({ message: 'Internal server error.' });
    }
  });
  
  
  
  //* For Delete file with {filename} param on the Cloudflare Storage
  
  app.delete('/delete-file/:filename', async (req, res) => {
    const { filename } = req.params; // Get the filename from the route parameters
  
    try {
      const deleteParams = {
        Bucket: 'cli-storage', // Replace with your S3 bucket name
        Key: filename, // Use the filename from the route params as the key
      };
  
      await S3.send(new DeleteObjectCommand(deleteParams));
      
      await res.status(200).json({ message: `File "${filename}" deleted successfully.` });
  
    
    } catch (error) {
      console.error('Error deleting file from S3:', error);
      res.status(500).json({ message: 'Internal server error.' });
    }
  });
  

  // * Basic Server Check
  app.get('/', (req, res) => {
    res.send('CLI backend Server is Ready.....');
  });

  
  // * Basic Server Port Check on Console
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
  
  