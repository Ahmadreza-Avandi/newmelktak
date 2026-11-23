import path from 'node:path';
export function validateFile(buffer, name, mime, imagesOnly = false) {
    const ext = path.extname(name).toLowerCase();
    const invalid = () => { throw Object.assign(new Error('فایل ارسالی معتبر نیست.'), { status: 400 }); };
    if (!buffer.length || buffer.length > 10 * 1024 * 1024 || /[\r\n\x00"]/.test(name)) invalid();
    let type;
    if (buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) && ext === '.png') type = 'image/png';
    if (buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255 && ['.jpg', '.jpeg'].includes(ext)) type = 'image/jpeg';
    if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP' && ext === '.webp') type = 'image/webp';
    if (imagesOnly && ext === '.mp4' && buffer.toString('ascii', 4, 8) === 'ftyp') type = 'video/mp4';
    if (imagesOnly && ext === '.webm' && buffer.subarray(0, 4).equals(Buffer.from([26, 69, 223, 163]))) type = 'video/webm';
    if (!imagesOnly && buffer.toString('ascii', 0, 5) === '%PDF-' && ext === '.pdf') type = 'application/pdf';
    if (!type || (mime && mime !== type && !(type === 'image/jpeg' && mime === 'image/jpg'))) invalid();
    return type;
}