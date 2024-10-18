import connection from "./database-config.js";
import express from 'express';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
const app = express();
app.use(express.json());

app.listen(process.env.API_PORT, () => { console.log(`Server started on port ${process.env.API_PORT}`) });

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

async function createLobby (name, user) {
  try {
    const [result] = await connection.query(`INSERT INTO Lobby (name, admin_id) VALUES (?, ?)`, [name, user.id]);
    const lobbyId = result.insertId;
    await connection.query(`INSERT INTO User_Lobby (user_id, lobby_id) VALUES (?, ?)`, [user.id, lobbyId ]);
  } catch (error) {
    console.log(error.message)
  }
}

async function addUserToLobby(lobbyName, userMail, user) {
  const [result] = await connection.query(`SELECT * FROM User WHERE email = ?`, [userMail]);
  const newMemberId = result[0].id;

  const [lobby] = await connection.query(`SELECT * FROM Lobby WHERE name = ? AND admin_id = ?`, [lobbyName, user.id]);
  const lobbyId = lobby[0].id;

  try {
    await connection.query(`INSERT INTO User_Lobby (user_id, lobby_id) VALUES (?, ?)`, [newMemberId, lobbyId]);
  } catch (error) {
    console.log(error.message);
  }
}

async function checkIfUserIsInLobby(user, lobbyId) {
  try {
    const [result] = await connection.query(`SELECT * FROM User_Lobby WHERE user_id = ? AND lobby_id = ?`, [user.id, lobbyId]);
    return result.length !== 0;

  } catch (error) {
    console.log(error.message);
  }
}

async function createMessage(content, user, lobbyId) {
  try {
    await connection.query(`INSERT INTO Message (content, user_id, lobby_id) VALUES (?, ?, ?)`, [content, user.id, lobbyId]);
  } catch (error) {
    console.log(error.message);
  }
}

async function updateMessage(lobbyId, messageId, newContent) {
  try {
    await connection.query(`UPDATE Message SET content = ? WHERE id = ? AND lobby_id = ?`, [newContent, messageId, lobbyId]);
  } catch (error) {
    console.log(error.message);
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

  const user = await login(email, password);
  if (!user) {
    return res.status(400).send("Invalid email or password.");
  }

  try {
    const token = jwt.sign({ id: user.id, name: user.name }, JWT_SECRET, { expiresIn: '7h' });
    res.status(200).json({ token });
  } catch (error) {
    console.log(error);
    res.status(500).send("An error occurred during login.");
  }
})

app.post('/createLobby', authentication, async (req, res) => {
  const { name } = req.body;
  await createLobby(name, req.user);
  res.send(`Lobby ${name} successfully created !`);
})

app.post('/addUserToLobby', authentication, async (req, res) => {
  const { lobbyName, userMail } = req.body;
  const userExists = await checkIfUserAlreadyExists(userMail);

  if (!userExists) {
    return res.status(400).send("User does not not exists");
  }

  await addUserToLobby(lobbyName, userMail, req.user);
  res.send(`User successfully added to ${lobbyName} !`);
})

app.post('/createMessage', authentication, async (req, res) => {
  const { content, lobbyId } = req.body;
  const userIsInLobby = await checkIfUserIsInLobby(req.user, lobbyId);

  if (!userIsInLobby) {
    res.status(400).send("Cannot send a message to a lobby where your not invited yet.");
    return;
  }

  if (!content || !lobbyId) {
    res.send("Missing mandatory fields.");
  }

  const [lobby] = await connection.query(`SELECT * FROM Lobby WHERE id = ?`, [lobbyId]);

  await createMessage(content, req.user, lobby[0].id);
  res.send(`Message: '${content}' successfully sent to ${lobby[0].name} !`);
})

app.put('/updateMessage', authentication, async (req, res) => {
  const { messageId, newContent, lobbyId } = req.body;

  if (!messageId || !newContent || !lobbyId) {
    return res.status(400).send("Missing mandatory fields.");
  }

  const [result] = await connection.query(`SELECT * FROM Message WHERE id = ? AND user_id = ? AND lobby_id = ?`, [messageId, req.user.id, lobbyId]);

  if (result.length === 0) {
    return res.status(403).send("You are not authorized to edit this message or the message does not exist.");
  }

  try {
    await updateMessage(lobbyId, messageId, newContent);
    res.status(200).send("Message successfully updated.")
  } catch (error) {
    res.status(400).send(error.message);
  }
})
