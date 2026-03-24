const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://vaohzyyphdcdzavzpyns.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper function to format date
function todayStr() {
    return new Date().toLocaleDateString('en-CA');
}

// Extract session ID from request header
function getSessionId(req) {
    return (req.headers['x-session-id'] || '').trim() || null;
}

// Health check
app.get('/health', async (req, res) => {
    try {
        const { data, error } = await supabase.from('jobs').select('id').limit(1);
        if (error) throw error;
        res.json({ status: 'ok', db: 'connected' });
    } catch (e) {
        res.status(500).json({
            status: 'error',
            db: e.message,
            url: supabaseUrl,
            hasKey: !!supabaseKey
        });
    }
});

// ═════════════════════════════════════════════════════════════
// PAGE ROUTES
// ═════════════════════════════════════════════════════════════

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/job_form.php', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'job_form.html'));
});

app.get('/job_view.php', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'job_view.html'));
});

// ═════════════════════════════════════════════════════════════
// JOBS API
// ═════════════════════════════════════════════════════════════

// GET /api/jobs.php?date=YYYY-MM-DD or ?id=123
app.get('/api/jobs.php', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    const sessionId = getSessionId(req);
    try {
        if (req.query.id) {
            const id = parseInt(req.query.id);
            let query = supabase.from('jobs').select('*').eq('id', id);
            if (sessionId) query = query.eq('session_id', sessionId);
            const { data, error } = await query.single();
            if (error) throw error;
            if (!data) return res.status(404).json({ error: 'Job not found' });
            data.job_data = typeof data.job_data === 'string'
                ? (JSON.parse(data.job_data) || {})
                : (data.job_data || {});
            res.json(data);
        } else {
            const date = req.query.date || todayStr();

            // Auto-delete jobs from before today
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toLocaleDateString('en-CA');
            await supabase.from('jobs').delete().lt('job_date', yesterdayStr);

            let query = supabase
                .from('jobs')
                .select('*')
                .eq('job_date', date)
                .order('sort_order', { ascending: true })
                .order('id', { ascending: true });
            if (sessionId) query = query.eq('session_id', sessionId);
            const { data, error } = await query;
            if (error) throw error;
            const jobs = (data || []).map(row => {
                row.job_data = typeof row.job_data === 'string'
                    ? (JSON.parse(row.job_data) || {})
                    : (row.job_data || {});
                return row;
            });
            res.json(jobs);
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST /api/jobs.php (create job)
app.post('/api/jobs.php', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
        const input = req.body || {};
        const sessionId = getSessionId(req);
        const row = {
            job_date: input.job_date || todayStr(),
            job_type: input.job_type || '',
            customer_name: input.customer_name || '',
            address_line1: input.address_line1 || '',
            address_line2: input.address_line2 || '',
            phone: input.phone || '',
            system_type: input.system_type || null,
            job_data: input.job_data || {},
            status: input.status || 'pending',
            session_id: sessionId,
        };

        const { data, error } = await supabase
            .from('jobs')
            .insert(row)
            .select('id')
            .single();
        if (error) throw error;
        res.json({ id: data.id, success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// PUT /api/jobs.php (update job)
app.put('/api/jobs.php', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
        const sessionId = getSessionId(req);
        const input = req.body || {};
        const id = parseInt(input.id);
        if (!id) return res.status(400).json({ error: 'Missing id' });

        // Status-only patch
        if (input.status && Object.keys(input).length === 2) {
            let q = supabase.from('jobs').update({ status: input.status }).eq('id', id);
            if (sessionId) q = q.eq('session_id', sessionId);
            const { error } = await q;
            if (error) throw error;
        } else {
            const row = {
                job_date: input.job_date || todayStr(),
                job_type: input.job_type || '',
                customer_name: input.customer_name || '',
                address_line1: input.address_line1 || '',
                address_line2: input.address_line2 || '',
                phone: input.phone || '',
                system_type: input.system_type || null,
                job_data: input.job_data || {},
                status: input.status || 'pending',
            };
            let q = supabase.from('jobs').update(row).eq('id', id);
            if (sessionId) q = q.eq('session_id', sessionId);
            const { error } = await q;
            if (error) throw error;
        }
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// DELETE /api/jobs.php?id=123
app.delete('/api/jobs.php', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
        const sessionId = getSessionId(req);
        const id = parseInt(req.query.id);
        if (!id) return res.status(400).json({ error: 'Missing id' });
        let q = supabase.from('jobs').delete().eq('id', id);
        if (sessionId) q = q.eq('session_id', sessionId);
        const { error } = await q;
        if (error) throw error;
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ═════════════════════════════════════════════════════════════
// COUNTY LOOKUP API
// ═════════════════════════════════════════════════════════════

// GET /api/county.php?address=full+address+here
// Uses US Census Bureau geocoder (free, no API key needed)
app.get('/api/county.php', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
        const address = (req.query.address || '').trim();
        if (!address) return res.status(400).json({ error: 'address required' });

        const url = `https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress?address=${encodeURIComponent(address)}&benchmark=Public_AR_Current&vintage=Current_Current&format=json`;

        const response = await fetch(url);
        const data = await response.json();

        const match = data?.result?.addressMatches?.[0];
        if (!match) return res.json({ county: null, error: 'Address not found' });

        const county = match.geographies?.Counties?.[0]?.BASENAME || null;
        const places = match.geographies?.['Incorporated Places'] || [];
        const place = places.length > 0 ? places[0].BASENAME : null;
        res.json({
            county,
            place,
            inCityLimits: !!place,
            matchedAddress: match.matchedAddress,
            coordinates: match.coordinates,
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ═════════════════════════════════════════════════════════════
// TAX RATES API
// ═════════════════════════════════════════════════════════════

// GET /api/tax_rates.php?county=...&place=...
// Checks for city-specific rate first, falls back to county-wide rate
app.get('/api/tax_rates.php', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
        const county = (req.query.county || '').trim();
        const place = (req.query.place || '').trim() || null;
        if (!county) return res.status(400).json({ error: 'county required' });

        let rate = null;
        let matchType = null;

        // 1. Check for city-specific rate if place is provided
        if (place) {
            const { data, error } = await supabase
                .from('tax_rates')
                .select('rate')
                .eq('county', county)
                .eq('place', place)
                .single();
            if (!error && data) {
                rate = parseFloat(data.rate);
                matchType = 'city';
            }
        }

        // 2. Fall back to county-wide rate
        if (rate === null) {
            const { data, error } = await supabase
                .from('tax_rates')
                .select('rate')
                .eq('county', county)
                .is('place', null)
                .single();
            if (!error && data) {
                rate = parseFloat(data.rate);
                matchType = 'county';
            }
        }

        res.json({ rate, matchType, county, place });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST /api/tax_rates.php
app.post('/api/tax_rates.php', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
        const input = req.body || {};
        const county = (input.county || '').trim();
        const place = (input.place || '').trim() || null;
        const rate = parseFloat(input.rate || 0);
        if (!county || rate <= 0) return res.status(400).json({ error: 'county and rate required' });

        const { error } = await supabase
            .from('tax_rates')
            .upsert({ county, place, rate, updated_at: new Date().toISOString() }, { onConflict: 'county,place' });
        if (error) throw error;
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`HVAC Tech app listening on port ${PORT}`);
});

module.exports = app;
