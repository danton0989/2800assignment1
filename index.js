const express = require('express');
require('dotenv').config();
const bcrypt = require('bcrypt');
const saltRounds = 12;
const session = require('express-session');
const MongoStore = require('connect-mongo');
const Joi = require("joi");

const app = express();
const port = process.env.PORT || 3000;
const expireTime = 60 * 60 * 1000; //expire in 1 hour

/* Secret */
const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_database = process.env.MONGODB_DATABASE;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;
const node_session_secret = process.env.NODE_SESSION_SECRET;
/* End Secret */

var mongoStore = MongoStore.create({
    mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/sessions`,
    crypto: {
        secret: mongodb_session_secret
    }
});


//aiu awgefbuioahbesruigae
const MongoClient = require("mongodb").MongoClient;
const atlasURI = `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/?retryWrites=true`;
var database = new MongoClient(atlasURI, {useNewUrlParser: true, useUnifiedTopology: true});

//var {database} = include('databaseConnection');

const userCollection = database.db(mongodb_database).collection('users');

app.use(express.urlencoded({extended: false}));

app.use(express.static(__dirname + "/public"));

app.use(session ({
    secret: node_session_secret,
    store: mongoStore,
    saveUninitialized: false,
    resave: true
}));

app.get('/', (req,res) => {
    var html;
    if (!req.session.authenticated) {
        html = `
        <form action='/signup' method='get'>
            <button>Sign up</button>
        </form>
        <form action='/login' method='get'>
            <button>Log in</button>
        </form>
        `;
    } else {
        html = `
        Hello, ${req.session.username}!
        <form action='/members' method='get'>
            <button>Go to Members Area</button>
        </form>
        <form action='/logout' method='get'>
            <button>Logout</button>
        </form>
        `;
    }
    
    res.send(html);
});

app.get('/signup', (req,res) => {
    var missingEmail = req.query.missing;
    var html = `
    create user
    <form action='/signupSubmit' method='post'>
        <input name='username' type='text' placeholder='username'>
        <input name='email' type='text' placeholder='email'>
        <input name='password' type='password' placeholder='password'>
        <button>Submit</button>
    </form>
    `;
    res.send(html);
});

app.post('/signupSubmit', async (req,res) => {
    var username = req.body.username;
    var email = req.body.email;
    var password = req.body.password;
    let usernameSchema = Joi.string().alphanum().max(20).required();
    let emailSchema = Joi.string().email().required();
    let passwordSchema = Joi.string().max(20).required();
    let usernameValidation = usernameSchema.validate(username);
    let emailValidation = emailSchema.validate(email);
    let passwordValidation = passwordSchema.validate(password);
    var html = " is required.";
    html += `<a href='/signup'>Try again</a>`;
    if (usernameValidation.error != null) {
        html = "Name" + html;
    } else if (emailValidation.error != null) {
        html = "Email" + html;
    } else if (passwordValidation.error != null) {
        html = "Password" + html;
    } else {
        var hashedPassword = await bcrypt.hash(password, saltRounds);

        await userCollection.insertOne({username: username, email: email, password: hashedPassword});
        console.log("Inserted user");
        req.session.authenticated = true;
        req.session.username = username;
        req.session.cookie.maxAge = expireTime;
        res.redirect('/members');
        return;
    }

    
    res.send(html);
});

app.get('/login', (req,res) => {
    var html = `
    Log In
    <form action='/loggingin' method='post'>
        <input name='email' type='text' placeholder='email'>
        <input name='password' type='password' placeholder'password'>
        <button>Submit</button>
    </form>
    `;
    res.send(html);
});

app.post('/loggingin', async (req,res) => {
    var email = req.body.email;
    var password = req.body.password;
    let emailSchema = Joi.string().email().required();
    let passwordSchema = Joi.string().max(20).required();
    let emailValidation = emailSchema.validate(email);
    let passwordValidation = passwordSchema.validate(password);
    var html = "Invalid email/password combination.";
    if (emailValidation.error == null && passwordValidation.error == null) {
        const result = await userCollection.find({email: email}).project({username: 1, password: 1, _id: 1}).toArray();
        if (result.length != 1) {
            html = "User not found.";
            html += `<a href='/login'>Try again</a>`;
            res.send(html);
            return;
        }
        if (await bcrypt.compare(password, result[0].password)) {
            req.session.authenticated = true;
            req.session.username = result[0].username;
            req.session.cookie.maxAge = expireTime;
            res.redirect('/members');
            return;
        }
    }

    html += `<a href='/login'>Try again</a>`;
    res.send(html);
});

/* app.get('/loggedin', (req,res) => {
    if (!req.session.authenticated) {
        res.redirect('/login');
    }
    var html = `You're logged in!`;
    res.send(html);
}); */

app.get('/members', (req,res) => {
    if (!req.session.authenticated) {
        res.redirect('/');
    }
    const randomGif = Math.floor(Math.random() * 3) + 1;
    var html = `Hello, ${req.session.username}.`;
    html += `
    <br>
    <img src='${randomGif}.gif'>
    <form action='/logout' method='get'>
        <button>Sign out</button>
    </form>
    `;
    res.send(html);
});

app.get('/logout', (req,res) => {
    req.session.destroy();
    res.redirect('/');
});

app.get('*', (req,res) => {
    res.status(404);
    res.send('Page not found - 404');
})

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

//mongodb+srv://danton:0989@cluster0.hq23sad.mongodb.net/