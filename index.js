import connection from "./database-config.js";
import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.API_PORT;
const app = express();
app.use(express.json());

app.listen(PORT, () => { console.log(`Server started on port ${PORT}`) });

async function createUser(name, email, password) {
  try {
    await connection.query(`INSERT INTO User(name, email, password) VALUES (?, ?, ?)`, [name, email, password]);
  } catch (error) {
    console.log(error);
  }
}

app.get("/", (req, res) => { res.send("Welcome to my team chat !"); });

app.post("/register", async (req, res) => {
  const {name, email, password} = req.query;

  if (!name || !email || !password) {
    return res.status(400).send("Invalid credentials");
  }

  // TODO Check if mail already exists or not before creating account !

  try {
    await createUser(name, email, password);
    res.status(201).send(`User ${name} successfully registered !`);
  } catch (error) {
    console.log(error);
  }
});
