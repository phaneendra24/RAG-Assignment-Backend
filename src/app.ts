import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import router from './routes/routes';
import { initDB } from './db';
import { initVectorStore } from './services/vectorStore';

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.use('/api', router);
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const startServer = async () => {
  try {
    initDB();
    await initVectorStore();

    app.listen(PORT, () => {
      console.log(`Server started on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
