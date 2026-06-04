
require("dotenv").config();
const express = require("express");
const session = require("express-session");
const passport = require("passport");
const DiscordStrategy = require("passport-discord").Strategy;
const SteamStrategy = require("passport-steam").Strategy;

const app = express();

// Sesiones
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

// Serialización
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));


// ----------------------
// DISCORD STRATEGY
// ----------------------
passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: process.env.DISCORD_REDIRECT,
    scope: ["identify"]
}, (accessToken, refreshToken, profile, done) => {
    return done(null, profile);
}));


// ----------------------
// STEAM STRATEGY
// ----------------------
passport.use(new SteamStrategy({
    returnURL: process.env.STEAM_RETURN_URL,
    realm: process.env.STEAM_RETURN_URL.replace("/auth/steam/callback", ""),
    apiKey: process.env.STEAM_API_KEY
}, (identifier, profile, done) => {
    return done(null, profile);
}));


// ----------------------
// MIDDLEWARE: comprobar doble login
// ----------------------
function checkBoth(req, res, next) {
    if (!req.session.discordLogged || !req.session.steamLogged) {
        return res.redirect("https://modLAMod.github.io/AcademiaAstraelisWeb/");
    }
    next();
}


// ----------------------
// RUTAS DE LOGIN
// ----------------------

// Discord
app.get("/auth/discord", passport.authenticate("discord"));

app.get("/auth/discord/callback",
    passport.authenticate("discord", { failureRedirect: "/" }),
    (req, res) => {
        req.session.discordLogged = true;

        if (req.session.steamLogged) {
            return res.redirect("https://modLAMod.github.io/AcademiaAstraelisWeb/dashboard.html");
        }

        res.redirect("https://modLAMod.github.io/AcademiaAstraelisWeb/");
    }
);


// Steam
app.get("/auth/steam", passport.authenticate("steam"));

app.get("/auth/steam/callback",
    passport.authenticate("steam", { failureRedirect: "/" }),
    (req, res) => {
        req.session.steamLogged = true;

        if (req.session.discordLogged) {
            return res.redirect("https://modLAMod.github.io/AcademiaAstraelisWeb/dashboard.html");
        }

        res.redirect("https://modLAMod.github.io/AcademiaAstraelisWeb/");
    }
);


// ----------------------
// RUTA PROTEGIDA
// ----------------------
app.get("/dashboard", checkBoth, (req, res) => {
    res.send("Bienvenido a Astraelis");
});


// ----------------------
app.listen(3000, () => console.log("Servidor OAuth en puerto 3000"));
