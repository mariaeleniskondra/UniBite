require('dotenv').config();
const express = require('express');
const app = express();

require('./models/db'); 

app.use(express.json());
app.use(express.static('Public'));

// Routes (θα τα προσθέτουμε σταδιακά)
// app.use('/api/auth', require('./routes/auth'));

app.listen(process.env.PORT, () => {
  console.log(`Server τρέχει στο http://localhost:${process.env.PORT}`);
});