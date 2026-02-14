import express from 'express';
import cors from 'cors';
import router from './routes/routes';

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());
app.use('/api', router);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
