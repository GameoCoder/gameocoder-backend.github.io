const express = require('express');
const cors = require('cors');
const mainRouter = require('./routes');

const app = express();

app.use(cors({
  origin: '*', // Or specify your frontend origin for better security, e.g., 'https://your-frontend-domain.com'
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.options('*', cors()); // Enable pre-flight for all routes

app.use(express.json());
app.use('/', mainRouter);

module.exports = app;