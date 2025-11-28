const express = require('express');
const { ZingMp3 } = require('zingmp3-api-full');
const cors = require('cors');

const app = express();
app.use(cors());

// 1. API Tìm kiếm (Đã thêm bộ lọc nhạc thường)
app.get('/api/search', async (req, res) => {
    try {
        const q = req.query.q;
        if (!q) return res.status(400).json({ msg: "Thiếu từ khóa q" });
        
        const data = await ZingMp3.search(q);
        
        if (!data.data || !data.data.items) {
            return res.json({ data: { songs: [] } });
        }

        // --- BỘ LỌC THÔNG MINH ---
        // Chỉ lấy item là 'song' (bài hát) VÀ streamingStatus != 2 (2 thường là VIP)
        const cleanSongs = data.data.items.filter(item => {
            return item.type === 'song' && item.streamingStatus !== 2; 
        });

        // Trả về danh sách đã lọc sạch
        res.json({ data: { songs: cleanSongs } });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. API Lấy link stream (Giữ nguyên)
app.get('/api/song/stream', async (req, res) => {
    try {
        const id = req.query.id;
        if (!id) return res.status(400).send("Thiếu ID");

        const data = await ZingMp3.getSong(id);
        
        // Cố gắng lấy link 128kbps
        const link128 = data.data ? data.data['128'] : null;

        if (link128) {
            return res.redirect(link128);
        } else {
            // Nếu vẫn không có link (do bản quyền chặt quá), trả về lỗi
            return res.status(404).send("Nhạc VIP hoặc bị chặn");
        }
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// 3. API Lấy thông tin bài hát
app.get('/api/info-song', async (req, res) => {
    try {
        const id = req.query.id;
        const data = await ZingMp3.getInfo(id);
        res.json(data);
    } catch (err) {
        res.json({ error: err.message });
    }
});

// 4. API Lấy lời bài hát
app.get('/api/lyric', async (req, res) => {
    try {
        const id = req.query.id;
        const data = await ZingMp3.getLyric(id);
        res.json(data);
    } catch (err) {
        res.json({ error: err.message });
    }
});

// 5. API Lấy JSON chi tiết
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
