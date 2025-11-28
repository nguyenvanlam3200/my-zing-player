const express = require('express');
const { ZingMp3 } = require('zingmp3-api-full');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

// 1. Phục vụ file HTML giao diện
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

// 2. API Tìm kiếm
app.get('/api/search', async (req, res) => {
    try {
        const q = req.query.q;
        if (!q) return res.status(400).json({ msg: "Thiếu từ khóa" });
        const data = await ZingMp3.search(q);
        res.json({ data: data.data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. API Info & Lyric (Giữ nguyên)
app.get('/api/info-song', async (req, res) => {
    const id = req.query.id;
    try { res.json(await ZingMp3.getInfoSong(id)); } catch (e) { res.status(500).json({error: e.message}); }
});

app.get('/api/lyric', async (req, res) => {
    const id = req.query.id;
    try { res.json(await ZingMp3.getLyric(id)); } catch (e) { res.status(500).json({error: e.message}); }
});

app.get('/api/song', async (req, res) => {
    const id = req.query.id;
    try { res.json(await ZingMp3.getSong(id)); } catch (e) { res.status(500).json({error: e.message}); }
});

// 4. API STREAM (QUAN TRỌNG NHẤT - ĐÃ SỬA LỖI)
app.get('/api/song/stream', async (req, res) => {
    try {
        const id = req.query.id;
        if (!id) return res.status(400).send("Thiếu ID");

        console.log(`[Stream] Đang lấy link cho ID: ${id}`);
        
        // Lấy link nhạc từ Zing
        const data = await ZingMp3.getSong(id);
        
        // Kiểm tra lỗi từ Zing (VD: Bài hát VIP)
        if (data.err !== 0 || !data.data) {
            console.error(`[Stream] Lỗi từ Zing: ${data.msg}`);
            // Trả về file âm thanh rỗng hoặc lỗi 404 để Player không bị crash JSON
            return res.status(404).send("Song not found or VIP blocked");
        }

        // Ưu tiên 128kbps -> 320kbps -> Url mặc định
        const link = data.data['128'] || data.data['320'] || data.data.url;

        if (!link) {
            console.error('[Stream] Không tìm thấy link stream khả dụng');
            return res.status(403).send("No stream link available (VIP Only?)");
        }

        // --- CƠ CHẾ DỰ PHÒNG ---
        // Nếu client yêu cầu Redirect (để trình duyệt tự tải), thêm ?redirect=true vào url
        if (req.query.redirect === 'true') {
            return res.redirect(link);
        }

        // Cấu hình Proxy
        const range = req.headers.range;
        const fetchHeaders = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://zingmp3.vn/',
        };
        
        // Nếu có Range (Tua nhạc), gửi kèm header
        if (range) fetchHeaders['Range'] = range;

        // Gọi đến ZingMp3 Server
        const zingRes = await fetch(link, { headers: fetchHeaders });

        if (!zingRes.ok) {
            console.error(`[Stream] Zing trả về lỗi: ${zingRes.status}`);
            // Nếu Proxy thất bại (do Vercel bị chặn IP), chuyển hướng người dùng sang link gốc
            // Đây là giải pháp cuối cùng ("Failover")
            return res.redirect(link);
        }

        // Thiết lập header trả về cho trình duyệt
        const headersToForward = [
            'content-type', 'content-length', 'content-range', 'accept-ranges'
        ];
        
        res.status(zingRes.status);
        headersToForward.forEach(h => {
            const val = zingRes.headers.get(h);
            if (val) res.setHeader(h, val);
        });

        // Pipe dữ liệu
        zingRes.body.pipe(res);

        zingRes.body.on('error', (e) => {
            console.error('[Stream] Pipe error:', e);
            res.end();
        });

    } catch (err) {
        console.error('[Stream] Fatal error:', err);
        if (!res.headersSent) res.status(500).send(err.message);
    }
});

module.exports = app;
