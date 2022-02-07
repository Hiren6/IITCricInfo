const express = require('express');
const router = express.Router();
const client = require('../models/db').client

router.get('/pointstable/:yr', async (req, res) => {
    const {yr} = req.params;

    const hb = `select P.team_name,P.mat,P.won,P.loss,P.tied,(1.0*Q.a1/Q.b1 - 1.0*Q.a2/Q.b2) as nrr, 2*P.won as pts
    from (select team_id,
    sum(case when (team_id=team1 or team_id=team2) and ((team_id=toss_winner and toss_name='bat' and innings_no=1)or(team_id<>toss_winner and toss_name='field' and innings_no=1)or(team_id=toss_winner and toss_name='field' and innings_no=2)or(team_id<>toss_winner and toss_name='bat' and innings_no=2)) then run else 0 end) as a1,
    sum(case when (team_id=team1 or team_id=team2) and ((team_id=toss_winner and toss_name='bat' and innings_no=1)or(team_id<>toss_winner and toss_name='field' and innings_no=1)or(team_id=toss_winner and toss_name='field' and innings_no=2)or(team_id<>toss_winner and toss_name='bat' and innings_no=2)) then over else 0 end) as b1,
    sum(case when (team_id=team1 or team_id=team2) and ((team_id=toss_winner and toss_name='bat' and innings_no=2)or(team_id<>toss_winner and toss_name='field' and innings_no=2)or(team_id=toss_winner and toss_name='field' and innings_no=1)or(team_id<>toss_winner and toss_name='bat' and innings_no=1)) then run else 0 end) as a2,
    sum(case when (team_id=team1 or team_id=team2) and ((team_id=toss_winner and toss_name='bat' and innings_no=2)or(team_id<>toss_winner and toss_name='field' and innings_no=2)or(team_id=toss_winner and toss_name='field' and innings_no=1)or(team_id<>toss_winner and toss_name='bat' and innings_no=1)) then over else 0 end) as b2
    from (select innings_no,count(distinct over_id) as over,sum(runs_scored + extra_runs) as run,toss_winner,toss_name,team1,team2
    from ball_by_ball,match
    where match.match_id=ball_by_ball.match_id and season_year=$1
    group by match.match_id,innings_no) as T,team
    group by team.team_id) as Q,(select team_id,team_name,
    sum(case when team_id=team1 or team_id=team2 then 1 else 0 end) as mat,
    sum(case when team_id=match_winner then 1 else 0 end) as won,
    sum(case when team_id<>match_winner and win_type in ('runs','wickets') and (team_id=team1 or team_id=team2) then 1 else 0 end) as loss,
    sum(case when win_type not in ('runs','wickets') then 1 else 0 end) as tied
    from match,team
    where match.season_year=$1
    group by team_id) as P
    where P.team_id=Q.team_id and P.mat<>0
    order by pts DESC,nrr DESC`;

    try {
        const table = await client.query(hb,[yr]);
        console.table(table.rows)

        res.render('table', {
            pointstable : table.rows
        });
    }
    catch (e) { console.error(e.message); }
});

module.exports = router;
