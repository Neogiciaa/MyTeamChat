import connection from "./database-config.js";
import express from 'express';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';

dotenv.config();

const PORT = process.env.API_PORT;
const app = express();
app.use(express.json());

app.listen(PORT, () => { console.log(`Server started on port ${PORT}`) });

async function createUser(name, email, password) {
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await connection.query(`INSERT INTO User(name, email, password) VALUES (?, ?, ?)`, [name, email, hashedPassword]);
  } catch (error) {
    console.log(error);
  }
}

async function checkIfUserAlreadyExists(email) {
  const [result] = await connection.query(`SELECT * FROM User WHERE email = ?`, [email]);
  return result.length > 0;

}

app.get("/", (req, res) => { res.send("Welcome to my team chat !"); });

app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).send("Invalid credentials");
  }

  const userExists = await checkIfUserAlreadyExists(email);

  if (userExists) {
    return res.status(400).send("User already exists");
  }

  try {
    await createUser(name, email, password);
    res.status(201).send(`User ${name} successfully registered !`);
  } catch (error) {
    console.log(error);
  }
});
