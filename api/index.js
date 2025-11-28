const express = require('express');
const { ZingMp3 } = require('zingmp3-api-full');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch'); // Sử dụng trực tiếp require cho node-fetch v2

const app = express();
app.use(cors());
app.use(express.json());

// Serve static HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

// Cấu hình Header giả lập trình duyệt để tránh bị chặn
const ZING_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://zingmp3.vn/',
    'Origin': 'https://zingmp3.vn',
    'Sec-Fetch-Dest': 'audio',
    'Sec-Fetch-Mode': 'no-cors',
    'Sec-Fetch-Site': 'cross-site'
};

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

// 2. API Stream nhạc - Đã sửa lỗi Range Request & Proxy
app.get('/api/song/stream', async (req, res) => {
    try {
        const id = req.query.id;
        if (!id) return res.status(400).send("Thiếu ID");

        // Lấy link nhạc từ Zing
        const data = await ZingMp3.getSong(id);
        
        // Ưu tiên link 128kbps (ổn định nhất cho free) -> 320kbps -> url mặc định
        const link = data?.data?.['128'] || data?.data?.['320'] || data?.data?.url;

        if (!link) {
            return res.status(404).json({ error: "Không tìm thấy link nhạc (VIP hoặc bị chặn)", data });
        }

        // Xử lý Range Request (Quan trọng để tua nhạc và không bị lỗi trên Mobile)
        const range = req.headers.range;
        const fetchOptions = {
            headers: {
                ...ZING_HEADERS
            }
        };

        // Nếu trình duyệt yêu cầu Range (tua), gửi header đó lên Zing
        if (range) {
            fetchOptions.headers['Range'] = range;
        }

        const response = await fetch(link, fetchOptions);

        if (!response.ok) {
            throw new Error(`Zing Upstream Error: ${response.status}`);
        }

        // Forward các header quan trọng về lại trình duyệt
        res.status(response.status); // Trả về 200 hoặc 206 (Partial Content)
        
        const forwardHeaders = [
            'content-type',
            'content-length',
            'content-range',
            'accept-ranges',
            'last-modified'
        ];

        forwardHeaders.forEach(h => {
            const val = response.headers.get(h);
            if (val) res.setHeader(h, val);
        });

        // Pipe dữ liệu audio về client
        response.body.pipe(res);

        // Xử lý lỗi khi pipe bị ngắt giữa chừng
        response.body.on('error', (e) => {
            console.error('Stream pipe error:', e);
            res.end();
        });

    } catch (err) {
        console.error('Stream fatal error:', err);
        // Nếu đã lỡ gửi header rồi thì không gửi json lỗi được nữa
        if (!res.headersSent) {
            res.status(500).json({ error: err.message });
        } else {
            res.end();
        }
    }
});

// 3. API Thông tin bài hát
app.get('/api/info-song', async (req, res) => {
    try {
        const id = req.query.id;
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
        const data = await ZingMp3.getLyric(id);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. API Lấy Link gốc (Debug)
app.get('/api/song', async (req, res) => {
    try {
        const id = req.query.id;
        const data = await ZingMp3.getSong(id);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = app;
