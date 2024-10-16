import connection from "./database-config.js";
import express from 'express';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';

dotenv.config();

const PORT = process.env.API_PORT;
const app = express();
app.use(express.json());

app.listen(PORT, () => { console.log(`Server started on port ${PORT}`) });

let connectedUser = {
  id: 0,
  name: ""
}

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

async function login(email, password) {
  try {
    let [result] = await connection.query(`SELECT * FROM User WHERE email = ?`, [email]);

    if (result.length === 0) {
      return null;
    }

    const user = result[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (isMatch) {
      connectedUser.id = user.id;
      connectedUser.name = user.name;
      console.log(connectedUser);
    } else {
      console.log("Invalid credentials");
      return null;
    }
  } catch (error) {
    console.log(error);
  }
}

app.get("/", (req, res) => { res.send("Welcome to my team chat !"); })

app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).send("Missing mandatory fields.");
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
})

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).send("Missing mandatory fields.");
  }
  const userExists = await checkIfUserAlreadyExists(email);

  if (!userExists) {
    return res.status(400).send("Account not found.");
  }

  try {
    await login(email, password);
    res.status(201).send(`Successfully logged in !`);
  } catch (error) {
    console.log(error);
  }
})
