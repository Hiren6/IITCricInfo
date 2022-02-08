const express = require('express');
const router = express.Router();
const client = require('../models/db').client

router.get('/players/:p_id', async (req, res) => {
    const {p_id} = req.params;
    const player_basic_skills = `select player_name,country_name,batting_hand,bowling_skill
    from player
    where player_id=$1`;
    
    const no_of_fours = `select count(*)
    from ball_by_ball
    where ball_by_ball.striker=$1 and ball_by_ball.runs_scored=4`;

    const no_of_sixes = `select count(*)
    from ball_by_ball
    where ball_by_ball.striker=$1 and ball_by_ball.runs_scored=6`;

    const runs_vs_match = `select match_id,sum(runs_scored)
    from ball_by_ball
    where ball_by_ball.striker=$1 and ball_by_ball.extra_runs=0
    group by match_id`;

    const total_runs = `select sum(runs_scored)
    from ball_by_ball
    where ball_by_ball.striker=$1 and ball_by_ball.extra_runs=0`; 

    const highest_score = `select max(sum) from (select sum(runs_scored)
    from ball_by_ball
    where ball_by_ball.striker=$1 and ball_by_ball.extra_runs=0
    group by match_id) as run`; 

    const no_of_fifties = `select match_id,sum(runs_scored)
    from ball_by_ball
    where ball_by_ball.striker=$1 and ball_by_ball.extra_runs=0
    group by match_id
    having sum(runs_scored) >= 50`; 

    const total_wickets = `select count(*)
    from ball_by_ball
    where ball_by_ball.striker=$1 and ball_by_ball.out_type not in('NULL')`;

    const total_balls_played =`select count(*)
    from ball_by_ball
    where ball_by_ball.striker=$1`;

    const tot_match_bowled = `select count(distinct match_id)
    from ball_by_ball
    where ball_by_ball.bowler=$1`; 

    const tot_balls_bowled = `select count(*)
    from ball_by_ball
    where ball_by_ball.bowler=$1`;

    const total_over = `select count(*)
    from ( select distinct match_id,over_id from ball_by_ball where ball_by_ball.bowler=$1) as over`;

    const tot_wickets_bowl = `select count(*)
    from ball_by_ball
    where ball_by_ball.bowler=$1 and ball_by_ball.out_type not in('NULL')`;

    const tot_runs_bowled = `select sum(runs_scored)
    from ball_by_ball
    where ball_by_ball.bowler=$1`;

    const bowl_vs_match = `select match_id,sum(runs_scored) as run,sum(case when out_type IS NOT NULL then 1 else 0 end) as wicket
    from ball_by_ball
    where ball_by_ball.bowler=$1
    group by match_id`;

    const tot_five_wick = `select count(out_type),match_id
    from ball_by_ball
    where bowler=$1 and out_type not in('NULL')
    group by match_id
    having count(out_type) >= 5`;

    try {
        const player_info = await client.query(player_basic_skills,[p_id]);

        const fours = await client.query(no_of_fours,[p_id]);
        const sixes = await client.query(no_of_sixes,[p_id]);
        const fifties = await client.query(no_of_fifties,[p_id]);
        const tot_runs = await client.query(total_runs,[p_id]);
        const hs = await client.query(highest_score,[p_id]);
        const tot_wick = await client.query(total_wickets,[p_id]);
        const tot_balls = await client.query(total_balls_played,[p_id]);
        const runs = await client.query(runs_vs_match,[p_id]);

        const tot_match_bowl = await client.query(tot_match_bowled,[p_id]);
        const tot_wick_bowl = await client.query(tot_wickets_bowl,[p_id]);
        const tot_balls_bowl = await client.query(tot_balls_bowled,[p_id]);
        const tot_runs_bowl = await client.query(tot_runs_bowled,[p_id]);
        const tot_over = await client.query(total_over,[p_id]);
        const five_wick = await client.query(tot_five_wick,[p_id]);
        const bowl = await client.query(bowl_vs_match,[p_id]);


        res.render('player', {
            player_info : player_info.rows[0],
            fours: fours.rows[0].count,
            sixes:sixes.rows[0].count,
            fifties:fifties.rowCount,
            tot_match: runs.rowCount,
            tot_runs : tot_runs.rows[0].sum,
            tot_wick : tot_wick.rows[0].count,
            tot_balls : tot_balls.rows[0].count,
            hs:hs.rows[0].max,
            tot_match_bowl : tot_match_bowl.rows[0].count,
            tot_balls_bowl : tot_balls_bowl.rows[0].count,
            tot_over : tot_over.rows[0].count,
            tot_wick_bowl : tot_wick_bowl.rows[0].count,
            tot_runs_bowl : tot_runs_bowl.rows[0].sum,
            five_wick : five_wick.rowCount,
            runs : runs.rows,
            bowls : bowl.rows
        });
    }
    catch (e) { console.error(e.message); }
});

module.exports = router;