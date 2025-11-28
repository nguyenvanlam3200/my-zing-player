const express = require('express');
// Thử import an toàn hơn
const NCT = require('nhaccuatui-api-full');
const cors = require('cors');

const app = express();
app.use(cors());

// Hàm trợ giúp để lấy thư viện (vì cách export có thể thay đổi tùy version)
function getNCT() {
    if (NCT && NCT.NhacCuaTui) return NCT.NhacCuaTui;
    return NCT;
}

// 1. API Tìm kiếm
app.get('/api/search', async (req, res) => {
    try {
        const q = req.query.q;
        if (!q) return res.status(400).json({ msg: "Thiếu từ khóa" });

        console.log(`Đang tìm kiếm: ${q}`);
        
        // Gọi API
        const data = await getNCT().search(q);
        
        // Log dữ liệu trả về để debug (Xem trong Vercel Logs)
        console.log("Kết quả NCT:", JSON.stringify(data));

        // Kiểm tra an toàn trước khi lấy dữ liệu
        let songs = [];
        if (data && data.search && data.search.song) {
            songs = data.search.song;
        } else if (data && data.song) {
             // Đôi khi nó trả thẳng data.song
            songs = data.song;
        }

        if (!Array.isArray(songs)) {
            console.log("Không tìm thấy bài hát hoặc cấu trúc lạ");
            return res.json({ data: { songs: [] } });
        }

        // Map dữ liệu
        const cleanSongs = songs.map(s => ({
            title: s.title || "Không tên",
            artistsNames: s.artist_names || "Không rõ",
            encodeId: s.key || s.id, // NCT dùng 'key'
            thumbnail: s.thumbnail || ""
        }));

        res.json({ data: { songs: cleanSongs } });

    } catch (err) {
        console.error("LỖI SEARCH:", err);
        // Trả về JSON rỗng thay vì lỗi 500 để web không bị đơ
        res.json({ data: { songs: [], error: err.message } });
    }
});

// 2. API Lấy link Stream
app.get('/api/song/stream', async (req, res) => {
    try {
        const id = req.query.id;
        console.log(`Lấy link ID: ${id}`);
        
        const data = await getNCT().getSong(id);
        console.log("Chi tiết bài hát:", JSON.stringify(data));

        // Kiểm tra link
        let linkStream = null;
        if (data && data.song && data.song.stream_url) {
            linkStream = data.song.stream_url;
        }

        if (linkStream && linkStream.startsWith("http")) {
            return res.redirect(linkStream);
        } else {
            return res.status(404).send("Không lấy được link MP3 (Có thể lỗi key hoặc bài VIP)");
        }
    } catch (err) {
        console.error("LỖI STREAM:", err);
        res.status(500).send("Lỗi server: " + err.message);
    }
});

// 3. API Get JSON
app.get('/api/song', async (req, res) => {
    try {
        const data = await getNCT().getSong(req.query.id);
        res.json(data);
    } catch (err) {
        res.json({ error: err.message });
    }
});

module.exports = app;
