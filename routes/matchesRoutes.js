const express = require('express');
const router = express.Router();
const client = require('../models/db').client

router.get('/matches', async (req, res) => {
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

router.get('/matches/:m_id', async (req, res) => {
    const {m_id} = req.params;
    const q_bat = `select bb.innings_no, player.player_id, player.player_name, sum(runs_scored) as runs , sum(case when (runs_scored=4) then 1 else 0 end) as fours, sum(case when (runs_scored=6) then 1 else 0 end) as sixes, count(ball_id) as balls_faced
	from ball_by_ball bb
	join match on match.match_id = bb.match_id
	join player on bb.striker = player.player_id
    where bb.match_id = $1
	group by bb.match_id, bb.innings_no, player.player_name, player.player_id
	order by bb.match_id, bb.innings_no `;

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

    const q_teams = `select tt1.team_name as firstTeam,tt2.team_name as secondTeam from
    (select team1 as t1,team2 as t2 from match where match.match_id = $1 and ((toss_winner=team1 and toss_name='bat') or (toss_winner=team2 and toss_name='field'))
    union
    select team2 as t1,team1 as t2 from match where match.match_id = $1 and ((toss_winner=team2 and toss_name='bat') or (toss_winner=team1 and toss_name='field')))foo
    join team tt1 on foo.t1=tt1.team_id
    join team tt2 on foo.t2=tt2.team_id`;
    
    try {
        const batting = await client.query(q_bat, [m_id]);
        console.table(batting.rows);
        const bowling = await client.query(q_bowl, [m_id]);
        console.table(bowling.rows);
        const extras = await client.query(q_extras, [m_id]);
        console.table(extras.rows);
        const total = await client.query(q_total, [m_id]);
        console.table(total.rows);
        const teams = await client.query(q_teams, [m_id]);
        console.table(teams.rows)
        res.render('get_match', {batting: batting.rows, extras: extras.rows, total: total.rows, bowling: bowling.rows, teams: teams.rows});
    }
    catch (e) { console.error(e.message); }
});

module.exports = router;