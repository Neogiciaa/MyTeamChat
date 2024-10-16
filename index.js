import connection from "./database-config.js";
import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.API_PORT;
const app = express();

app.listen(PORT, () => { console.log(`Server started on port ${PORT}`) });
