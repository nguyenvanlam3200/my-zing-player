const express = require('express');
const { ZingMp3 } = require('zingmp3-api-full');
const cors = require('cors');

const app = express();
app.use(cors());

// 1. API Tìm kiếm (BỎ BỘ LỌC VIP ĐỂ HIỆN KẾT QUẢ)
app.get('/api/search', async (req, res) => {
    try {
        const q = req.query.q;
        if (!q) return res.status(400).json({ msg: "Thiếu từ khóa q" });
        
        const data = await ZingMp3.search(q);
        
        // Kiểm tra kỹ dữ liệu trả về để tránh crash
        if (!data || !data.data || !data.data.items) {
            return res.json({ data: { songs: [] } });
        }

        // CHỈ LỌC lấy đúng loại là "song" (bài hát), bỏ qua video/playlist
        // KHÔNG lọc streamingStatus nữa để đảm bảo có kết quả
        const cleanSongs = data.data.items.filter(item => item.type === 'song');

        res.json({ data: { songs: cleanSongs } });

    } catch (err) {
        console.error("Lỗi tìm kiếm:", err);
        res.status(500).json({ error: err.message });
    }
});

// 2. API Lấy link stream (Xử lý khi gặp bài VIP)
app.get('/api/song/stream', async (req, res) => {
    try {
        const id = req.query.id;
        if (!id) return res.status(400).send("Thiếu ID");

        // Lấy chi tiết bài hát
        const data = await ZingMp3.getSong(id);
        
        // Kiểm tra xem có link 128kbps không
        const link128 = data.data ? data.data['128'] : null;

        // Lưu ý: Bài VIP thường sẽ không có link 128 hoặc trả về null
        if (link128 && typeof link128 === 'string' && link128.startsWith('http')) {
            // Nếu có link ngon -> Redirect ngay
            return res.redirect(link128);
        } else {
            // Nếu không có link -> Báo lỗi 403 (Forbidden) hoặc 404
            console.log(`Bài ${id} không có link stream (Có thể là VIP)`);
            return res.status(404).send("VIP/Premium Song - Cannot Stream");
        }
    } catch (err) {
        console.error("Lỗi lấy link:", err);
        res.status(500).send(err.message);
    }
});

// 3. Các API phụ trợ khác (Giữ nguyên)
app.get('/api/info-song', async (req, res) => {
    try {
        res.json(await ZingMp3.getInfo(req.query.id));
    } catch (err) { res.json({ error: err.message }); }
});

app.get('/api/lyric', async (req, res) => {
    try {
        res.json(await ZingMp3.getLyric(req.query.id));
    } catch (err) { res.json({ error: err.message }); }
});

app.get('/api/song', async (req, res) => {
    try {
        res.json(await ZingMp3.getSong(req.query.id));
    } catch (err) { res.json({ error: err.message }); }
});

module.exports = app;
