const express = require('express');
const { ZingMp3 } = require('zingmp3-api-full');
const cors = require('cors');

const app = express();
app.use(cors());

// 1. API Tìm kiếm (Khớp với call '/api/search' trong HTML)
app.get('/api/search', async (req, res) => {
    try {
        const q = req.query.q; // HTML gửi biến 'q'
        if (!q) return res.status(400).json({ msg: "Thiếu từ khóa q" });
        
        const data = await ZingMp3.search(q);
        
        // Trả về đúng cấu trúc HTML mong đợi: { data: { songs: [...] } }
        res.json({ data: data.data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. API Lấy link stream và Redirect (Khớp với '/api/song/stream')
// HTML dùng thẻ <audio src="/api/song/stream?id=..."> nên cần redirect
app.get('/api/song/stream', async (req, res) => {
    try {
        const id = req.query.id;
        if (!id) return res.status(400).send("Thiếu ID");

        const data = await ZingMp3.getSong(id);
        
        // Lấy link nhạc 128kbps
        const link128 = data.data ? data.data['128'] : null;

        if (link128) {
            // Chuyển hướng trình duyệt/ESP32 đến link mp3 thật
            return res.redirect(link128);
        } else {
            return res.status(404).send("Không tìm thấy link nhạc (VIP hoặc lỗi)");
        }
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// 3. API Lấy thông tin bài hát (Khớp với '/api/info-song')
app.get('/api/info-song', async (req, res) => {
    try {
        const id = req.query.id;
        const data = await ZingMp3.getInfo(id); // Có thể cần dùng getInfo hoặc getSong tùy version
        res.json(data);
    } catch (err) {
        res.json({ error: err.message });
    }
});

// 4. API Lấy lời bài hát (Khớp với '/api/lyric')
app.get('/api/lyric', async (req, res) => {
    try {
        const id = req.query.id;
        const data = await ZingMp3.getLyric(id);
        res.json(data);
    } catch (err) {
        res.json({ error: err.message });
    }
});

// 5. API Lấy link stream dạng JSON (cho nút "Link Stream")
app.get('/api/song', async (req, res) => {
    try {
        const id = req.query.id;
        const data = await ZingMp3.getSong(id);
        res.json(data);
    } catch (err) {
        res.json({ error: err.message });
    }
});

module.exports = app;