import 'dotenv/config';
import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
// import md5 from "md5";
// import encrypt from "mongoose-encryption";
// import bcrypt from "bcrypt";
import session from 'express-session';
import passport from 'passport';
import passportLocalMongoose from "passport-local-mongoose";
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import findOrCreate from "mongoose-findorcreate";
import path from "node:path";

const app = express();
const __dirname = path.resolve();
// const saltRounds = 10;

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

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB");

const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    googleId: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ["password"]});

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());


passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    const user = User.findById(id)
    done(null, user);
});

passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "http://localhost:3000/auth/google/secrets"
    },
    (accessToken, refreshToken, profile, cb) => {
        User.findOrCreate({googleId: profile.id}, (err, user) => {
            return cb(err, user);
        });
    }
));

app.get("/", asyncMiddleware(async (req, res, next) => {
    res.render("home");
}));

app.get("/auth/google",
    passport.authenticate("google", {scope: ["profile"]})
);

app.get("/auth/google/secrets", 
    passport.authenticate("google", {failureRedirect: "/login"}),
    (req, res) => {
        res.redirect("/secrets");
    }
);

app.get("/login", asyncMiddleware(async (req, res, next) => {
    res.render("login");
}));

app.get("/register", asyncMiddleware(async (req, res, next) => {
    res.render("register");
}));

app.get("/secrets", asyncMiddleware(async (req, res, next) => {
    if (req.isAuthenticated()) {
        res.render("secrets");
    } else {
        res.redirect("login");
    }
}));

app.get("/logout", asyncMiddleware(async (req, res, next) => {
    req.logout((err) => {
        next(err);
    });
    res.redirect("/");
}));

app.post("/register", asyncMiddleware(async (req, res, next) => {
    await User.register({username: req.body.username}, req.body.password, (err, user) => {
        if (err) {
            console.log(err);
            res.redirect("/register");
        } else {
            passport.authenticate("local")(req, res, () => {
                res.redirect("/secrets");
            });
        }
    });
}));

app.post("/login", asyncMiddleware(async (req, res, next) => {
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, (err) => {
        if (err) {
            next(err);
        } else {
            passport.authenticate("local")(req, res, () => {
                res.redirect("/secrets");
            });
        }
    });
}));

app.listen(process.env.PORT || 3000, () => {
    console.log("Server is running on port 3000");
});


// await bcrypt.hash(req.body.password, saltRounds)
//     .then((hash) => {
//         hashedPassword = hash;
//     })
//     .catch((err) => {
//         console.log(err);
//     });

// await bcrypt.compare(req.body.password, foundUser.password, (err, result) => {
//     if (!err) {
//         if (result === true) {
//             res.render("secrets");
//         } else {
//             res.send("Wrong Password");
//         }
//     } else {
//         console.log(err);
//     }
// });