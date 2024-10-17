### **My Team Chat**

## Installation

First step will be to install project dependencies with:
```bash
npm install
```

After this, you will need to create a MariaDB or Mysql database in local(you can use Docker to externalize it if wanted) first.

```bash
CREATE database myteamchat;
GRANT ALL PRIVILEGES ON myteamchat* TO "your_user"@localhost:3306;
Connect myteamchat;
```

I recommend you to use a database manager like Datagrip from JetBrains suit for an easier configuration !
Once your database and user ready to use, clone this project and go ahead in .env.example file.
Rename this file to .env and put your credentials in it to be able to use My Team Chat.

## Start project

To start the project, run:

```bash
npm start
```

## Features

# Available
In My team Chat, you will be able to:
- Create a user and log with it
- Create a lobby
- Join a lobby or more
- Send messages

# Coming soon
- Get lobby messages
- Get lobby's members
- Remove lobby member
- Search messages from one lobby member
- Invite someone that is not registered in My Team Chat yet

## Author
Stéphen Chevalier - Passionated Web developer that code with ♥ 
