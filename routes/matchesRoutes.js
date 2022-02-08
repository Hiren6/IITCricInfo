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
    
    //batting
    const q_bat = `select bb.innings_no, player.player_id, player.player_name, sum(runs_scored) as runs , sum(case when (runs_scored=4) then 1 else 0 end) as fours, sum(case when (runs_scored=6) then 1 else 0 end) as sixes, count(ball_id) as balls_faced
	from ball_by_ball bb
	join match on match.match_id = bb.match_id
	join player on bb.striker = player.player_id
    where bb.match_id = $1
	group by bb.match_id, bb.innings_no, player.player_name, player.player_id
	order by bb.match_id, bb.innings_no, runs desc `;

    //extras
    const q_extras = `select bb.innings_no, sum(extra_runs) as extras
    from ball_by_ball bb
    join match on match.match_id = bb.match_id
    where bb.match_id = $1
    group by match.match_id, bb.innings_no
    order by match.match_id, bb.innings_no`;

    //total
    const q_total = `select bb.innings_no, sum(runs_scored + extra_runs) as total_runs, sum(case when (out_type not in('NULL')) then 1 else 0 end) as wickets
    from ball_by_ball bb
    join match on match.match_id = bb.match_id
    where bb.match_id = $1
    group by match.match_id, bb.innings_no
    order by match.match_id, bb.innings_no`;

    //bowling
    const q_bowl = `select bb.innings_no, player.player_id, player.player_name, count(ball_id) as balls_bowled, sum(runs_scored) as runs_given, sum(case when (out_type not in('NULL')) then 1 else 0 end) as wickets
	from ball_by_ball bb
	join match on match.match_id = bb.match_id
	join player on bb.bowler = player.player_id
    where bb.match_id = $1
	group by bb.match_id, bb.innings_no, player.player_name, player.player_id
	order by bb.match_id, bb.innings_no, wickets desc, player.player_name`;

    //team names by innings
    const q_teams = `select tt1.team_name as firstTeam,tt2.team_name as secondTeam from
    (select team1 as t1,team2 as t2 from match where match.match_id = $1 and ((toss_winner=team1 and toss_name='bat') or (toss_winner=team2 and toss_name='field'))
    union
    select team2 as t1,team1 as t2 from match where match.match_id = $1 and ((toss_winner=team2 and toss_name='bat') or (toss_winner=team1 and toss_name='field')))foo
    join team tt1 on foo.t1=tt1.team_id
    join team tt2 on foo.t2=tt2.team_id`;

    const q_info = [//match info:-team1 and 2 name & id,toss_winner,match_id,year,venue name,match winner
    `select tt1.team_id as id1, tt1.team_name as team1,tt2.team_id as id2, tt2.team_name as team2,tt3.team_name as toss, match_id, season_year, venue_name, tt4.team_name as winner 
    from match
    join team tt1 on match.team1 = tt1.team_id
    join team tt2 on match.team2 = tt2.team_id
    join team tt3 on match.toss_winner=tt3.team_id
    join team tt4 on match.match_winner=tt4.team_id
    join venue on match.venue_id=venue.venue_id
    where match.match_id = $1
    `,
    //umpires
    `select match_id,umpire_name,role_desc 
    from umpire_match join umpire on umpire.umpire_id=umpire_match.umpire_id
    where match_id=$1
    `,
    //playing XI
    `select team_id, player.player_name, player_match.role_desc 
    from player_match join player
    on player_match.player_id=player.player_id 
    where match_id=$1`
    ];
    
    try {
        const batting = await client.query(q_bat, [m_id]);
        const bowling = await client.query(q_bowl, [m_id]);
        const extras = await client.query(q_extras, [m_id]);
        const total = await client.query(q_total, [m_id]);
        const teams = await client.query(q_teams, [m_id]);
        const info = await client.query(q_info[0], [m_id]);
        const umpires = await client.query(q_info[1], [m_id]);
        const playingXI = await client.query(q_info[2], [m_id]);
        

        res.render('get_match', {
            match_id : m_id,
            batting: batting.rows, 
            extras: extras.rows, 
            total: total.rows, 
            bowling: bowling.rows, 
            teams: teams.rows, 
            info: info.rows, 
            umpires: umpires.rows, 
            playingXI: playingXI.rows
        });
    }
    catch (e) { console.error(e.message); }
});

router.get('/matches/:m_id/score_comparision', async (req, res) => {
    const {m_id} = req.params;
    //team names by innings
    const q_teams = `select tt1.team_name as firstTeam,tt2.team_name as secondTeam from
    (select team1 as t1,team2 as t2 from match where match.match_id = $1 and ((toss_winner=team1 and toss_name='bat') or (toss_winner=team2 and toss_name='field'))
    union
    select team2 as t1,team1 as t2 from match where match.match_id = $1 and ((toss_winner=team2 and toss_name='bat') or (toss_winner=team1 and toss_name='field')))foo
    join team tt1 on foo.t1=tt1.team_id
    join team tt2 on foo.t2=tt2.team_id`;

    const q_first_innings_runs = `
    select match_id, innings_no, over_id, sum(runs_scored + extra_runs) as rpo
    from ball_by_ball
    where match_id = $1 and innings_no = 1
    group by match_id, innings_no, over_id
    order by match_id, innings_no, over_id
    `;

    const q_second_innings_runs = `
    select match_id, innings_no, over_id, sum(runs_scored + extra_runs) as rpo
    from ball_by_ball
    where match_id = $1 and innings_no = 2
    group by match_id, innings_no, over_id
    order by match_id, innings_no, over_id
    `;

    const qr = `select team.team_name as winner, match.win_margin, match.win_type
    from match
    join team on match.match_winner = team.team_id
    where match.match_id = $1`;

    try {
        const teams = await client.query(q_teams, [m_id]);
        const first_innings_runs = await client.query(q_first_innings_runs, [m_id]);
        const second_innings_runs = await client.query(q_second_innings_runs, [m_id]);
        const result = await client.query(qr, [m_id]);

        res.render('partials/score_comparision', {
            teams: teams.rows,
            first_innings_runs: first_innings_runs.rows,
            second_innings_runs: second_innings_runs.rows,
            result : result.rows,
        })
    }

    catch (e) { console.error(e.message); }
});

router.get('/matches/:m_id/runs_percentage', async (req, res) => {
    const {m_id} = req.params;

    const q_teams = `select tt1.team_name as firstTeam,tt2.team_name as secondTeam from
    (select team1 as t1,team2 as t2 from match where match.match_id = $1 and ((toss_winner=team1 and toss_name='bat') or (toss_winner=team2 and toss_name='field'))
    union
    select team2 as t1,team1 as t2 from match where match.match_id = $1 and ((toss_winner=team2 and toss_name='bat') or (toss_winner=team1 and toss_name='field')))foo
    join team tt1 on foo.t1=tt1.team_id
    join team tt2 on foo.t2=tt2.team_id`;

    const q2 = `select 
    sum(case when (runs_scored=1) then 1 else 0 end) as ones,
    sum(case when (runs_scored=2) then 2 else 0 end) as twos,
    sum(case when (runs_scored=3) then 3 else 0 end) as threes,
    sum(case when (runs_scored=4) then 4 else 0 end) as fours,
    sum(case when (runs_scored=6) then 6 else 0 end) as sixes,
    sum(extra_runs) as extras,
    sum(runs_scored + extra_runs) as total_runs
    from ball_by_ball
    where match_id = $1 
    group by innings_no`;

    const q3 = [
    `select innings_no, over_id, sum(case when(out_type not in ('NULL')) then 1 else 0 end) as wickets_perover
    from ball_by_ball
    where match_id = $1 and innings_no=1
    group by match_id, innings_no, over_id
    order by innings_no, over_id
    `,
    `select innings_no, over_id, sum(case when(out_type not in ('NULL')) then 1 else 0 end) as wickets_perover
    from ball_by_ball
    where match_id = $1 and innings_no=2
    group by match_id, innings_no, over_id
    order by innings_no, over_id
    `
    ]
    try {
        const teams = await client.query(q_teams, [m_id]);
        const pies = await client.query(q2, [m_id]);
        const wickets1 = await client.query(q3[0], [m_id]);
        const wickets2 = await client.query(q3[1], [m_id]);

        res.render('partials/runs_percentage', {
            teams : teams.rows,
            pies : pies.rows,
            wickets1 : wickets1.rows,
            wickets2 : wickets2.rows
        })
    }

    catch (e) { console.error(e.message); }
});

router.get('/matches/:m_id/match_summary', async (req, res) => {
    const {m_id} = req.params;

    const q_info = //match info:-team1 and 2 name & id,toss_winner,match_id,year,venue name,match winner
    `select tt1.team_id as id1, tt1.team_name as team1,tt2.team_id as id2, tt2.team_name as team2,tt3.team_name as toss, match_id, season_year, venue_name, tt4.team_name as winner, match.win_type, match.win_margin
    from match
    join team tt1 on match.team1 = tt1.team_id
    join team tt2 on match.team2 = tt2.team_id
    join team tt3 on match.toss_winner=tt3.team_id
    join team tt4 on match.match_winner=tt4.team_id
    join venue on match.venue_id=venue.venue_id
    where match.match_id = $1`;

    //batting
    const q_bat = `select bb.innings_no, player.player_id as id, player.player_name as name, sum(runs_scored) as runs , sum(case when (runs_scored=4) then 1 else 0 end) as fours, sum(case when (runs_scored=6) then 1 else 0 end) as sixes, count(ball_id) as balls_faced
	from ball_by_ball bb
	join match on match.match_id = bb.match_id
	join player on bb.striker = player.player_id
    where bb.match_id = $1
	group by bb.match_id, bb.innings_no, player.player_name, player.player_id
	order by bb.match_id, bb.innings_no, runs desc `;

    //bowling
    const q_bowl = `select bb.innings_no, player.player_id as id, player.player_name as name, count(ball_id) as balls_bowled, sum(runs_scored) as runs_given, sum(case when (out_type not in('NULL')) then 1 else 0 end) as wickets
	from ball_by_ball bb
	join match on match.match_id = bb.match_id
	join player on bb.bowler = player.player_id
    where bb.match_id = $1
	group by bb.match_id, bb.innings_no, player.player_name, player.player_id
	order by bb.match_id, bb.innings_no, wickets desc, player.player_name`;

    //total
    const q_total = `select bb.innings_no, sum(runs_scored + extra_runs) as total_runs, sum(case when (out_type not in('NULL')) then 1 else 0 end) as wickets,sum(case when (ball_id<7) then 1 else 0 end ) as balls
    from ball_by_ball bb
    join match on match.match_id = bb.match_id
    where bb.match_id = $1
    group by bb.innings_no
    order by bb.innings_no`;

    //team names by innings
    const q_teams = `select tt1.team_id as id1, tt1.team_name as first,tt2.team_id as id2, tt2.team_name as second  from
    (select team1 as t1,team2 as t2 from match where match.match_id=$1 and ((toss_winner=team1 and toss_name='bat') or (toss_winner=team2 and toss_name='field'))
    union
    select team2 as t1,team1 as t2 from match where match.match_id=$1 and ((toss_winner=team2 and toss_name='bat') or (toss_winner=team1 and toss_name='field')))foo
    join team tt1 on foo.t1=tt1.team_id
    join team tt2 on foo.t2=tt2.team_id`;
    
    try {
        const info = await client.query(q_info, [m_id]);
        const batting = await client.query(q_bat, [m_id]);
        const bowling = await client.query(q_bowl, [m_id]);
        const total = await client.query(q_total, [m_id]);
        const inn = await client.query(q_teams, [m_id]);

        res.render('partials/match_summary', {
            info: info.rows,
            bat: batting.rows,
            bowler: bowling.rows,
            total: total.rows,
            inn: inn.rows
        })
    }

    catch (e) { console.error(e.message); }
});

module.exports = router;