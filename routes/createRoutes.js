const express = require('express');
const router = express.Router();
const client = require('../models/db').client

router.post('/create', function(req, res, next) {
  
    const venueDetails=req.body;
    console.log(venueDetails);
  
    const q = `select * from venue`; 
    try {
        const table = client.query(q);
        console.table(table.rows)
    
        var sql = 'INSERT INTO users SET ?';
        client.query(sql, venueDetails,function (err, data) { 
            console.log("User data is inserted successfully "); 
        });
        res.redirect('/');
    }
    catch(e) {console.error(e.message);}
});

module.exports = router;
