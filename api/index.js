const express = require('express');
const { NhacCuaTui } = require('nhaccuatui-api-full');
const cors = require('cors');

const app = express();
app.use(cors());

// 1. API Tìm kiếm trên Nhaccuatui
app.get('/api/search', async (req, res) => {
    try {
        const q = req.query.q;
        if (!q) return res.status(400).json({ msg: "Thiếu từ khóa" });
        
        // Gọi hàm search của thư viện NCT
        const data = await NhacCuaTui.search(q);
        
        // NCT trả về cấu trúc: { search: { song: [...] } }
        // Ta cần map lại cho giống cấu trúc Frontend cũ để khỏi sửa HTML nhiều
        const nctSongs = data.search && data.search.song ? data.search.song : [];
        
        // Chuyển đổi dữ liệu NCT sang dạng chuẩn của Web cũ
        const cleanSongs = nctSongs.map(s => ({
            title: s.title,
            artistsNames: s.artist_names, // NCT dùng key này
            encodeId: s.key,              // NCT dùng 'key' làm ID (vd: j8r1d8...)
            thumbnail: s.thumbnail
        }));

        res.json({ data: { songs: cleanSongs } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. API Lấy link Stream và Redirect (Để phát nhạc)
app.get('/api/song/stream', async (req, res) => {
    try {
        const id = req.query.id; // Đây là Key của bài hát (vd: abcd123)
        if (!id) return res.status(400).send("Thiếu ID");

        // Lấy chi tiết bài hát
        const data = await NhacCuaTui.getSong(id);
        
        // Link nhạc NCT nằm trong data.song.stream_url
        // Thường có chất lượng 128kbps (free)
        const linkStream = data.song ? data.song.stream_url : null;

        if (linkStream && linkStream.startsWith("http")) {
            return res.redirect(linkStream);
        } else {
            return res.status(404).send("Lỗi: Không lấy được link MP3 (Bài VIP hoặc Lỗi)");
        }
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// 3. API lấy JSON thông tin (Cho nút Get JSON)
app.get('/api/song', async (req, res) => {
    try {
        const id = req.query.id;
        const data = await NhacCuaTui.getSong(id);
        
        // Trả về JSON, trong đó có stream_url để ESP32 dùng nếu cần
        res.json({
            title: data.song.title,
            artist: data.song.artist_names,
            audio_url: data.song.stream_url, // Quan trọng: ESP32 cần cái này
            lyric_url: data.song.lyric_url || ""
        });
    } catch (err) {
        res.json({ error: err.message });
    }
});

module.exports = app;
