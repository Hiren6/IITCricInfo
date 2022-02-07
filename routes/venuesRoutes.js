const express = require('express');
const router = express.Router();
const client = require('../models/db').client

router.get('/venues', async (req, res) => {
    const q = `select * from venue`;
    
    try {
        const all_venues = await client.query(q);
        res.render('venues', {venues: all_venues.rows});
    }
    catch (e) { console.error(e.message); }
});

router.get('/venues/add', function(req, res, next) { 
    res.render('form'); 
});

router.get('/venues/:v_id', async (req, res) => {
    const {v_id} = req.params;

    //info
    const q = `select * from venue
    where venue_id = $1`;

    //highest and lowest total, total_matches played at this venue
    const q1 = `with foo as (
    select venue.venue_id, venue.venue_name, sum(runs_scored + extra_runs) as total_runs
    from ball_by_ball bb
    join match on match.match_id = bb.match_id
    join venue on match.venue_id = venue.venue_id
    where venue.venue_id = $1
    group by bb.match_id, bb.innings_no, venue.venue_id, venue.venue_name
    )
    select count(venue_id) as total_played,  max(total_runs) as highest_total, min(total_runs) as lowest_total
    from foo`
    
    //highest total chased
    const q2 = `with foo as (
        (select match_id, team2 as tid 
        from match
        where (toss_winner = team1 and toss_name = 'bat') or (toss_winner = team2 and toss_name = 'field'))
        union
        (select match_id, team1 as tid
        from match
        where (toss_winner = team2 and toss_name = 'bat') or (toss_winner = team1 and toss_name = 'field'))
    ),
    poo as (
        select foo.match_id, foo.tid, team.team_name
        from foo
        join team on foo.tid = team.team_id
    ),
    goo as (
        select match_id, innings_no, sum(runs_scored + extra_runs) as total_runs 
        from ball_by_ball bb 
        where innings_no = 1 
        group by match_id, innings_no 
        order by match_id
    )   
    select max(total_runs) as highest_chased
    from goo
    join match on match.match_id = goo.match_id
    join poo on match.match_winner = poo.tid and match.match_id = poo.match_id
    join venue on venue.venue_id = match.venue_id
    where venue.venue_id = $1`;

    const qb1 = `select count(match.match_id) as first_bat_won
	from (select match_id, team1 as t1,team2 as t2 from match where ((toss_winner=team1 and toss_name='bat') or (toss_winner=team2 and toss_name='field'))
    union
    select match_id, team2 as t1,team1 as t2 from match where ((toss_winner=team2 and toss_name='bat') or (toss_winner=team1 and toss_name='field')))foo
	join match on match.match_id = foo.match_id
	join venue on venue.venue_id = match.venue_id
	where match.match_winner = foo.t1 and venue.venue_id = $1`;

    const qb2 = `select count(match.match_id) as second_bat_won
	from (select match_id, team1 as t1,team2 as t2 from match where ((toss_winner=team1 and toss_name='bat') or (toss_winner=team2 and toss_name='field'))
    union
    select match_id, team2 as t1,team1 as t2 from match where ((toss_winner=team2 and toss_name='bat') or (toss_winner=team1 and toss_name='field')))foo
	join match on match.match_id = foo.match_id
	join venue on venue.venue_id = match.venue_id
	where match.match_winner = foo.t2 and venue.venue_id = $1`;

    try {
        const info = await client.query(q, [v_id]);
        const runs = await client.query(q1, [v_id]);
        const highest_chased = await client.query(q2, [v_id]);
        const first_bat_won = await client.query(qb1, [v_id]);
        const second_bat_won = await client.query(qb2, [v_id]);

        res.render('get_venue', {
            info: info.rows, 
            runs: runs.rows, 
            highest_chased: highest_chased.rows
        });
    }
    catch (e) { console.error(e.message); }
});

module.exports = router;