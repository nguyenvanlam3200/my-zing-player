const express = require('express');
const { ZingMp3 } = require('zingmp3-api-full');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());

// Serve static HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

// 1. API Tìm kiếm
app.get('/api/search', async (req, res) => {
    try {
        const q = req.query.q;
        if (!q) return res.status(400).json({ msg: "Thiếu từ khóa q" });
        
        const data = await ZingMp3.search(q);
        res.json({ data: data.data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. API Stream nhạc với redirect
app.get('/api/song/stream', async (req, res) => {
    try {
        const id = req.query.id;
        if (!id) return res.status(400).send("Thiếu ID");

        const data = await ZingMp3.getSong(id);
        const link128 = data?.data?.['128'];

        if (link128) {
            return res.redirect(link128);
        } else {
            return res.status(404).send("Không tìm thấy link nhạc");
        }
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// 3. API Thông tin bài hát
app.get('/api/info-song', async (req, res) => {
    try {
        const id = req.query.id;
        if (!id) return res.status(400).json({ msg: "Thiếu ID" });
        
        const data = await ZingMp3.getInfoSong(id);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. API Lời bài hát
app.get('/api/lyric', async (req, res) => {
    try {
        const id = req.query.id;
        if (!id) return res.status(400).json({ msg: "Thiếu ID" });
        
        const data = await ZingMp3.getLyric(id);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. API Link stream JSON
app.get('/api/song', async (req, res) => {
    try {
        const id = req.query.id;
        if (!id) return res.status(400).json({ msg: "Thiếu ID" });
        
        const data = await ZingMp3.getSong(id);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = app;
