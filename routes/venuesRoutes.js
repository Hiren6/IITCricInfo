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

router.get('/venues/:v_id', async (req, res) => {
    const {v_id} = req.params;

    //info
    const q = `select * from venue
    where venue_id = $1`;

    //highest and lowest total at this venue
    const q1 = `with foo as (
    select venue.venue_id, venue_name, sum(runs_scored + extra_runs) as total_runs
    from ball_by_ball bb
    join match on match.match_id = bb.match_id
    join venue on match.venue_id = venue.venue_id
    where venue.venue_id = 1
    group by bb.match_id, bb.innings_no, venue.venue_id, venue.venue_name)
    select max(total_runs) as highest_total, min(total_runs) as lowest_total from foo`

    try {
        const info = await client.query(q, [v_id]);
        const runs = await client.query(q1, [v_id]);
        res.render('get_venue', {info: info.rows, runs: runs.rows});
    }
    catch (e) { console.error(e.message); }
});

module.exports = router;