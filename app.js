const express = require('express');
const app = express();
const morgan = require('morgan');
const bodyParser = require('body-parser')
const matchesRoutes = require('./routes/matchesRoutes')
const venuesRoutes = require('./routes/venuesRoutes')
const playerRoutes = require('./routes/playerRoutes')
const pointstableRoutes = require('./routes/pointstableRoutes')
const createRoutes = require('./routes/createRoutes')

const port = 8080;

app.set('view engine', 'ejs');
app.use(express.json());         // access body using req.body
app.use(morgan('dev'));
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
    extended: true
}))

// middleware to use static files
app.use('/assets', express.static('assets'));

// connect to the database
const start_client = require('./models/db').start_client
start_client();

app.listen(port, () => {
    console.log("Server listening on port " + port);
});

// homepage
app.get('/', (req, res) => {
    res.render('home');
});

// matches routes
app.use(matchesRoutes)

//venues routes
app.use(venuesRoutes)

//player routes
app.use(playerRoutes)

//pointstable routes
app.use(pointstableRoutes)

//create routes
app.use(createRoutes)