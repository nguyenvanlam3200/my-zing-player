const express = require('express');
const cors = require('cors');
// Import toàn bộ thư viện để tránh lỗi destructuring
const NCTLib = require('nhaccuatui-api-full');

const app = express();
app.use(cors());

// Hàm an toàn để lấy đối tượng chính
function getNCT() {
    // Kiểm tra xem thư viện trả về dạng { NhacCuaTui: ... } hay trả về trực tiếp
    if (NCTLib && NCTLib.NhacCuaTui) {
        return NCTLib.NhacCuaTui;
    }
    return NCTLib;
}

// 1. API Tìm kiếm (Bọc Try-Catch kỹ càng)
app.get('/api/search', async (req, res) => {
    try {
        const q = req.query.q;
        if (!q) return res.status(400).json({ msg: "Thiếu từ khóa" });

        console.log(`[SEARCH] Đang tìm: ${q}`);
        
        // Gọi search
        const nct = getNCT();
        const data = await nct.search(q);
        
        console.log("[SEARCH] Kết quả Raw:", JSON.stringify(data));

        // Kiểm tra dữ liệu an toàn để không bị sập (Crash)
        let songs = [];
        
        // Trường hợp 1: Cấu trúc chuẩn { search: { song: [...] } }
        if (data && data.search && data.search.song) {
            songs = data.search.song;
        } 
        // Trường hợp 2: Trả về mảng trực tiếp (đề phòng)
        else if (data && data.song) {
            songs = data.song;
        }

        // Map dữ liệu sang định dạng web cần
        const cleanSongs = songs.map(s => ({
            title: s.title || "Chưa rõ tên",
            artistsNames: s.artist_names || "Nhiều ca sĩ",
            encodeId: s.key || s.id, // NCT dùng Key làm ID
            thumbnail: s.thumbnail || ""
        }));

        // Trả về kết quả (Luôn trả về JSON hợp lệ dù rỗng)
        res.json({ data: { songs: cleanSongs } });

    } catch (err) {
        console.error("[LOI SEARCH]", err);
        // QUAN TRỌNG: Trả về mảng rỗng thay vì lỗi 500 để Web không báo đỏ
        res.json({ 
            data: { songs: [] }, 
            debug_error: err.message 
        });
    }
});

// 2. API Lấy link Stream
app.get('/api/song/stream', async (req, res) => {
    try {
        const id = req.query.id;
        console.log(`[STREAM] Lấy link bài: ${id}`);
        
        const nct = getNCT();
        const data = await nct.getSong(id);
        
        // Log để kiểm tra xem có link không
        console.log("[STREAM] Data:", JSON.stringify(data));

        const link = data.song ? data.song.stream_url : null;

        if (link && link.startsWith("http")) {
            return res.redirect(link);
        } else {
            return res.status(404).send("Lỗi: Không tìm thấy link MP3 (Bài VIP?)");
        }
    } catch (err) {
        console.error("[LOI STREAM]", err);
        res.status(500).send("Lỗi Server: " + err.message);
    }
});

// 3. API Get JSON chi tiết
app.get('/api/song', async (req, res) => {
    try {
        const nct = getNCT();
        const data = await nct.getSong(req.query.id);
        
        // Trả về cấu trúc mà ESP32 cần
        if (data.song) {
            res.json({
                title: data.song.title,
                artist: data.song.artist_names,
                audio_url: data.song.stream_url, // Link MP3
                lyric_url: data.song.lyric_url
            });
        } else {
            res.status(404).json({ error: "Song not found" });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = app;
