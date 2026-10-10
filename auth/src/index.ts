import express from 'express';
import passport from 'passport';
import session from 'express-session';
import { Strategy as OAuth2Strategy } from 'passport-oauth2';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(session({
  secret: 'secret-key',
  resave: false,
  saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(new OAuth2Strategy({
    authorizationURL: 'https://example-oauth-provider.com/auth',
    tokenURL: 'https://example-oauth-provider.com/token',
    clientID: process.env.CLIENT_ID || 'client-id',
    clientSecret: process.env.CLIENT_SECRET || 'client-secret',
    callbackURL: 'http://localhost/auth/callback'
  },
  (accessToken, refreshToken, profile, done) => {
    return done(null, profile);
  }
));

app.get('/', (req, res) => {
  res.send('<h1>Sign In</h1><a href="/auth/login">Login with OAuth2</a>');
});

app.get('/auth/login', passport.authenticate('oauth2'));

app.get('/auth/callback', 
  passport.authenticate('oauth2', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect('/');
  }
);

app.get('/auth/verify', (req, res) => {
  if (req.isAuthenticated()) {
    res.status(200).send('OK');
  } else {
    res.status(401).send('Unauthorized');
  }
});

app.get('/dashboard', (req, res) => {
  if (req.isAuthenticated()) {
    res.send('<h1>Welcome to the Dashboard</h1><a href="/logout">Logout</a>');
  } else {
    res.redirect('/');
  }
});

app.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.redirect('/');
  });
});

app.listen(PORT, () => {
  console.log(`Auth server running on http://localhost:${PORT}`);
});
