const puppeteer = require('puppeteer');
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();

// Hàm đăng nhập và xuất cookie
async function loginAndExportCookies(email, password) {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'] // Cần thiết cho hosting
    });
    const page = await browser.newPage();

    try {
        // Điều hướng đến trang đăng nhập của Facebook
        await page.goto('https://www.facebook.com/login', { waitUntil: 'networkidle2' });

        // Nhập email và mật khẩu
        await page.type('#email', email, { delay: 100 });
        await page.type('#pass', password, { delay: 100 });

        // Nhấn nút đăng nhập và chờ điều hướng
        await Promise.all([
            page.click('[name="login"]'),
            page.waitForNavigation({ waitUntil: 'networkidle2' }),
        ]);

        // Kiểm tra đăng nhập thành công
        const isLoggedIn = await page.evaluate(() => {
            return !document.querySelector('#error_box'); // Không có lỗi đăng nhập
        });

        if (!isLoggedIn) {
            throw new Error('Đăng nhập thất bại! Kiểm tra tài khoản hoặc mật khẩu.');
        }

        // Lấy cookie từ trình duyệt
        const cookies = await page.cookies();

        // Lọc cookie liên quan đến Facebook
        const fbCookies = cookies.filter(cookie => cookie.domain.includes('facebook.com'));
        const fbState = fbCookies.map(cookie => ({
            key: cookie.name,
            value: cookie.value,
            domain: cookie.domain,
            path: cookie.path,
            expirationDate: cookie.expires || null,
            hostOnly: cookie.hostOnly,
            creation: new Date().toISOString(),
            lastAccessed: new Date().toISOString(),
        }));

        return fbState;
    } catch (err) {
        throw new Error(`Lỗi trong quá trình đăng nhập: ${err.message}`);
    } finally {
        await browser.close();
    }
}

// API nhận tài khoản và mật khẩu từ URL
app.get('/login/:email/:password', async (req, res) => {
    const { email, password } = req.params;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email và mật khẩu là bắt buộc!' });
    }

    try {
        const fbState = await loginAndExportCookies(email, password);

        // Lưu vào file fbstate.json
        const filePath = path.join(__dirname, 'fbstate.json');
        fs.writeFileSync(filePath, JSON.stringify(fbState, null, 4));

        // Gửi phản hồi với nội dung cookie
        res.status(200).json({
            message: 'Đăng nhập thành công!',
            cookies: fbState
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Khởi động server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
