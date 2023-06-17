import 'dotenv/config';
import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
// import md5 from "md5";
// import encrypt from "mongoose-encryption";
import bcrypt from "bcrypt";
import path from "node:path";

const app = express();
const __dirname = path.resolve();
const saltRounds = 10;

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
app.set("view engine", "ejs");

const asyncMiddleware = fn => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

const errorMiddleware = (err, req, res, next) => {
    console.log(err);
    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(statusCode).json({error: message});
};

app.use(errorMiddleware);

mongoose.connect("mongodb://localhost:27017/userDB");

const userSchema = new mongoose.Schema({
    email: String,
    password: String
});

// userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ["password"]});

const User = new mongoose.model("User", userSchema);

app.get("/", asyncMiddleware(async (req, res, next) => {
    res.render("home");
}));

app.get("/login", asyncMiddleware(async (req, res, next) => {
    res.render("login");
}));

app.get("/register", asyncMiddleware(async (req, res, next) => {
    res.render("register");
}));

app.post("/register", asyncMiddleware(async (req, res, next) => {
    let hashedPassword = "";
    await bcrypt.hash(req.body.password, saltRounds)
        .then((hash) => {
            hashedPassword = hash;
        })
        .catch((err) => {
            console.log(err);
        });

    const newUser = new User({
        email: req.body.username,
        password: hashedPassword
    });

    await newUser.save();
    res.render("secrets");
}));

app.post("/login", asyncMiddleware(async (req, res, next) => {
    const foundUser = await User.findOne({email: req.body.username});
    if (foundUser) {
        await bcrypt.compare(req.body.password, foundUser.password, (err, result) => {
            if (!err) {
                if (result === true) {
                    res.render("secrets");
                } else {
                    res.send("Wrong Password");
                }
            } else {
                console.log(err);
            }
        });
    } else {
        res.send("User does not exist.");
    }
}));

app.listen(process.env.PORT || 3000, () => {
    console.log("Server is running on port 3000");
});