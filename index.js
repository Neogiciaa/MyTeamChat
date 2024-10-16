import connection from "./database-config.js";
import express from 'express';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

dotenv.config();

const PORT = process.env.API_PORT;
const JWT_SECRET = process.env.JWT_SECRET;
const app = express();
app.use(express.json());

let connectedUser = {
  id: 0,
  name: ""
}

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
      return user;
    } else {
      console.log("Invalid credentials");
      return null;
    }
  } catch (error) {
    console.log(error);
  }
}

function authentication(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(403).send('Not authorized');
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (error) {
    return res.status(403).send(`${error.message}`);
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
    const token = jwt.sign({ id: connectedUser.id, name: connectedUser.name }, JWT_SECRET, { expiresIn: '7h' });
    res.status(200).json({ token });
  } catch (error) {
    console.log(error);
  }
})

// Test route !
app.get('/testjwt', authentication, (req, res) => {
  res.send(`Hello, ${req.user.name}. This is a test protected route.`);
})
