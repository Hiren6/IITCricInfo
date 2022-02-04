const dotenv = require('dotenv');
const express = require('express');
const app = express();
const morgan = require('morgan');
const bodyParser = require('body-parser')
const port = 8080;
dotenv.config();

app.set('view engine', 'ejs');
app.use(express.json());         // access body using req.body
app.use(morgan('dev'));
app.use(bodyParser.json())

// middleware to use static files
app.use('/assets', express.static('assets'));

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
start_client();

app.listen(port, () => {
    console.log("Server listening on port " + port);
});

app.get('/', (req, res) => {
    res.render('home');
});

app.get('/matches', async (req, res) => {
    const q = `select match_id, match.season_year, t1.team_name as Team1, t2.team_name as Team2, venue_name, city_name, team.team_name as result, match.win_margin, match.win_type
    from match
    join team t1 on t1.team_id = match.team1
    join team t2 on t2.team_id = match.team2
    join venue on match.venue_id = venue.venue_id 
    join team on match.match_winner = team.team_id
    order by match.season_year desc, match.match_id desc`;
    
    try {
        const all_matches = await client.query(q);
        res.render('matches', {matches: all_matches.rows});
    }
    catch (e) { console.error(e.message); }
});

app.get('/matches/:m_id', async (req, res) => {
    const {m_id} = req.params;
    const q_bat = `select bb.innings_no, player.player_name, sum(runs_scored) as runs , sum(case when (runs_scored=4) then 1 else 0 end) as fours, sum(case when (runs_scored=6) then 1 else 0 end) as sixes, count(ball_id) as balls_faced
	from ball_by_ball bb
	join match on match.match_id = bb.match_id
	join player on bb.striker = player.player_id
    where bb.match_id = $1
	group by bb.match_id, bb.innings_no, player.player_name
	order by bb.match_id, bb.innings_no, runs desc, player.player_name`;

    const q_extras = `select bb.innings_no, sum(extra_runs) as extras
    from ball_by_ball bb
    join match on match.match_id = bb.match_id
    where bb.match_id = $1
    group by match.match_id, bb.innings_no
    order by match.match_id, bb.innings_no`;

    const q_total = `select bb.innings_no, sum(runs_scored + extra_runs) as total_runs, sum(case when (out_type not in('NULL')) then 1 else 0 end) as wickets
    from ball_by_ball bb
    join match on match.match_id = bb.match_id
    where bb.match_id = $1
    group by match.match_id, bb.innings_no
    order by match.match_id, bb.innings_no`;

    const q_bowl = `select bb.innings_no, player.player_name, count(ball_id) as balls_bowled, sum(runs_scored) as runs_given, sum(case when (out_type not in('NULL')) then 1 else 0 end) as wickets
	from ball_by_ball bb
	join match on match.match_id = bb.match_id
	join player on bb.bowler = player.player_id
    where bb.match_id = $1
	group by bb.match_id, bb.innings_no, player.player_name
	order by bb.match_id, bb.innings_no, wickets desc, player.player_name`;
    
    try {
        const batting = await client.query(q_bat, [m_id]);
        console.table(batting.rows);
        const bowling = await client.query(q_bowl, [m_id]);
        console.table(bowling.rows);
        const extras = await client.query(q_extras, [m_id]);
        console.table(extras.rows);
        const total = await client.query(q_total, [m_id]);
        console.table(total.rows);
        res.json({batting: batting.rows, extras: extras.rows, total: total.rows, bowling: bowling.rows});
    }
    catch (e) { console.error(e.message); }
});




