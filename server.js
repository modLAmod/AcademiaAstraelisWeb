{
  "name": "rp-web",
  "version": "1.0.0",
  "description": "Web de rol con login por Discord, fichas de personaje y panel de staff",
  "main": "server.js",
  "type": "commonjs",
  "scripts": {
    "start": "node server.js",
    "dev": "node server.js"
  },
  "dependencies": {
    "better-sqlite3": "^11.3.0",
    "connect-sqlite3": "^0.9.13",
    "dotenv": "^16.4.5",
    "ejs": "^3.1.10",
    "express": "^4.19.2",
    "express-session": "^1.18.0",
    "passport": "^0.7.0",
    "passport-discord": "^0.1.4"
  }
}
