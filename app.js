const con = require('./db');
const express = require('express');
const bcrypt = require('bcrypt');
const app = express();
const saltRounds = 10; // Strength of the password hashing

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// password generator
app.get('/password/:pass', (req, res) => {
  const password = req.params.pass;
  bcrypt.hash(password, saltRounds, function(err, hash) {
    if (err) {
      return res.status(500).send('Hashing error');
    }
    res.send(hash);
  });
});

// login
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const sql = "SELECT id, password FROM users WHERE username = ?";
  con.query(sql, [username], function(err, results) {
    if (err) {
      return res.status(500).send("Database server error");
    }
    if (results.length != 1) {
      return res.status(401).send("Wrong username");
    }
    // compare passwords
    bcrypt.compare(password, results[0].password, function(err, same) {
      if (err) {
        return res.status(500).send("Hashing error");
      }
      if (same) {
        return res.json({ message: "Login OK", userId: results[0].id });
      }
      return res.status(401).send("Wrong password");
    });
  });
});

// Show all expenses for a given user
app.get('/expenses/:userId', (req, res) => {
  const userId = req.params.userId;
  const sql = "SELECT * FROM expense WHERE user_id = ?";
  con.query(sql, [userId], function(err, results) {
    if (err) {
      return res.status(500).send("Database server error");
    }
    res.json(results);
  });
});

// Show today's expenses for a given user
app.get('/expenses/:userId/today', (req, res) => {
  const userId = req.params.userId;
  const sql = "SELECT * FROM expense WHERE user_id = ? AND DATE(`date`) = CURDATE()";
  con.query(sql, [userId], function(err, results) {
    if (err) {
      return res.status(500).send("Database server error");
    }
    res.json(results);
  });
});





// Delete expense by id (with userId check) - using request body
app.delete('/expenses/:id', (req, res) => {
  const id = req.params.id;
  const sql = "DELETE FROM expense WHERE id = ?";
  con.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json({ message: "DB error" });
    if (result.affectedRows === 0) return res.status(404).json({ message: "Not found" });
    res.status(200).json({ message: `Deleted expense ${id}` });
  });
});

// Search expenses by keyword (e.g., item name)
app.get('/expenses/:userId/search', (req, res) => {
  const userId = req.params.userId;
  const keyword = req.query.query;

  if (!keyword) {
    return res.status(400).send("Missing search keyword");
  }

  const sql = "SELECT * FROM expense WHERE user_id = ? AND item LIKE ?";
  const likeQuery = '%' + keyword + '%';

  con.query(sql, [userId, likeQuery], function (err, results) {
    if (err) {
      return res.status(500).send("Database server error");
    }
    res.json(results);
  });
});







// Add a new expense
app.post("/expenses/add/:userId", (req, res) => {
  const userIdParam = req.params.userId;
  const { item, paid } = req.body ?? {};

  if (!userIdParam || !item || paid === undefined) {
    return res.status(400).json({ message: "Missing required fields: userId(param), item, paid" });
  }

  const amount = Number(paid);
  if (!Number.isFinite(amount)) {
    return res.status(400).json({ message: "paid must be a number" });
  }

  // ใช้เวลาปัจจุบันเป็นค่า date
  const sql = "INSERT INTO expense (user_id, item, paid, `date`) VALUES (?, ?, ?, NOW())";
  con.query(sql, [userIdParam, item, amount], (err, result) => {
    if (err) {
      console.error("DB ERROR:", err);
      return res.status(500).json({ message: "Database error", detail: err.message });
    }
    res.status(201).json({ message: "Expense added successfully", id: result.insertId });
  });
});




// ---------- Server starts here ---------
const PORT = 3000;
app.listen(PORT, () => {
  console.log('Server is running at ' + PORT);
});


