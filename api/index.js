const express = require("express");
const cors = require("cors");
const { createServer } = require("http");
const { auth } = require("express-oauth2-bearer");
const {
  checkUrl,
  APP_URL, // Public URL for this app
  ISSUER_BASE_URL, // Auth0 Tenant Url
  ALLOWED_AUDIENCES, // Auth0 API Audience List
  PORT,
} = require("./env-config");

const app = express();

// Used to normalize URL in Vercel
app.use(checkUrl());

app.use(cors());

const expenses = [
  {
    date: new Date(),
    description: "Pizza for a Coding Dojo session.",
    value: 102,
  },
  {
    date: new Date(),
    description: "Coffee for a Coding Dojo session.",
    value: 42,
  },
];

/****************************
 * This method is here to allow a
 * successful response on root requests.
 * This stops content security policy
 * from preventing the user to make
 * requests via the browsers console.
 ****************************/
app.get("/", (req, res) => {
  res.status(200).end("OK");
});
/****************************/

app.get("/total", (req, res) => {
  const total = expenses.reduce((accum, expense) => accum + expense.value, 0);
  res.send({ total, count: expenses.length });
});

// 👆 public routes above 👆
app.use(
 auth({
   secret: SESSION_SECRET,
   authRequired: false,
   auth0Logout: true,
   baseURL: APP_URL,
   // 👇 add this 👇
   authorizationParams: {
     response_type: "code id_token",
     audience: "https://expenses-api",
   },
   // 👆 add this 👆
 })
);
// 👇 private routes below 👇

app.get("/reports", (req, res) => {
  res.send(expenses);
});

app.get("/expenses", requiresAuth(), async (req, res, next) => {
 try {
   // 👇 get the token from the request 👇
   const { token_type, access_token } = req.oidc.accessToken;
   // 👇 then send it as an authorization header 👇
   const expenses = await axios.get(`${API_URL}/reports`, {
     headers: {
       Authorization: `${token_type} ${access_token}`,
     },
   });
   // 👆 end of changes 👆
   res.render("expenses", {
     user: req.oidc && req.oidc.user,
     expenses: expenses.data,
   });
 } catch (err) {
   next(err);
 }
});

createServer(app).listen(PORT, () => {
  console.log(`API: ${APP_URL}`);
});
