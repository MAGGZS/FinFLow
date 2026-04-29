import express from 'express';
import cors from 'cors';
import usuarioRoutes from './routes/usuarioRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(express.json());

app.use('/auth', usuarioRoutes);
app.use('/admin', adminRoutes);

app.get('/health', (_, res) => res.json({ status: 'ok' }));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Erro interno do servidor.' });
});

app.listen(process.env.PORT, () =>
  console.log(`Servidor rodando em http://localhost:${process.env.PORT}`)
);
