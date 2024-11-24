const puppeteer = require('puppeteer');
const fs = require('fs');

// Hàm tự động đăng nhập và lấy cookie
async function loginAndExportCookies(email, password) {
    const browser = await puppeteer.launch({ headless: true });
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

        // Lưu cookie vào tệp JSON
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

        fs.writeFileSync('fbstate.json', JSON.stringify(fbState, null, 4));
        console.log('Cookie đã được lưu vào tệp fbstate.json');
    } catch (err) {
        console.error('Lỗi:', err.message);
    } finally {
        await browser.close();
    }
}

// Gọi hàm với thông tin đăng nhập
(async () => {
    const email = 'email_fb_của_bạn';
    const password = 'mật_khẩu_fb_của_bạn';

    await loginAndExportCookies(email, password);
})();
