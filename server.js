const express = require("express");
const app = express();

const FRONTEND_URL = process.env.FRONTEND_URL;

// redirect homepage
app.get("/", (req, res) => {
  return res.redirect(FRONTEND_URL);
});

// redirect everything else too
app.get("*", (req, res) => {
  return res.redirect(FRONTEND_URL);
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("Redirect server running on port", PORT);
});
