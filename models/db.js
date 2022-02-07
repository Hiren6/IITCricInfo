const dotenv = require('dotenv');
dotenv.config();

const {Client} = require('pg');
const client = new Client({     // connnection with database
    user: process.env.user,
    password: process.env.password,
    host: process.env.host,
    port: process.env.port,
    database: process.env.database
});

async function start_client() {
    try {
        await client.connect();
        console.log("Connected to database successfully");
    }
    catch (e) { console.error(e.message); }
}

module.exports.client = client
module.exports.start_client = start_client