const { createCanvas } = require('canvas');
const fs = require('fs');
const sharp = require('sharp');
const getPixels = require('get-pixels');
const express = require('express');
const multer = require('multer');
const path = require('path');

const app = express();
const port = 3000;

// Konfigurasi folder untuk menyimpan gambar yang diunggah
const upload = multer({ dest: 'uploads/' });

// Fungsi untuk membuat nirmana otomatis dari titik
function createNirmana(titik, tema = 'mengecil_ke_luar', ukuranAwal = 10, stepSize = 1, fileOutput = 'nirmana.png') {
    const canvas = createCanvas(40, 40); // Ubah ukuran canvas menjadi 40x40
    const ctx = canvas.getContext('2d');
    
    let sizes = [];
    if (tema === 'mengecil_ke_luar') {
        sizes = Array.from({ length: titik.length }, (_, i) => ukuranAwal - i * stepSize);
    } else if (tema === 'mengecil_ke_bawah') {
        sizes = Array.from({ length: titik.length }, (_, i) => ukuranAwal - (titik.length - i - 1) * stepSize);
    }

    // Menggambar titik-titik
    ctx.fillStyle = 'black';
    for (let i = 0; i < titik.length; i++) {
        const [x, y] = titik[i];
        const size = sizes[i];
        ctx.beginPath();
        ctx.arc(x * canvas.width, y * canvas.height, size, 0, Math.PI * 2);
        ctx.fill();
    }

    // Menyimpan gambar ke file
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(fileOutput, buffer);
}

// Fungsi untuk mengambil titik dari gambar
function extractPointsFromImage(imagePath, callback) {
    sharp(imagePath)
        .resize(40, 40) // Ubah ukuran gambar menjadi 40x40 pixel
        .greyscale()
        .toBuffer((err, data, info) => {
            if (err) {
                console.error("Error memproses gambar:", err);
                return;
            }

            getPixels(data, 'image/png', (err, pixels) => {
                if (err) {
                    console.error("Error membaca piksel gambar:", err);
                    return;
                }

                const width = pixels.shape[0];
                const height = pixels.shape[1];
                const titik = [];

                for (let x = 0; x < width; x++) {
                    for (let y = 0; y < height; y++) {
                        const pixelIndex = (y * width + x) * 4;
                        const brightness = pixels.data[pixelIndex];

                        if (brightness < 50) {
                            titik.push([x / width, y / height]); // Normalisasi ke 0-1
                        }
                    }
                }

                callback(titik);
            });
        });
}

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Route untuk mengunggah gambar dan menghasilkan nirmana
app.post('/upload', upload.single('image'), (req, res) => {
    const imagePath = req.file.path;
    extractPointsFromImage(imagePath, (titik) => {
        createNirmana(titik, 'mengecil_ke_luar', 10, 1, 'nirmana.png'); // Ukuran awal dan step disesuaikan untuk 40x40
        res.download('nirmana.png', 'nirmana.png', (err) => {
            if (err) {
                console.error('Error saat mengirimkan file:', err);
            }
            fs.unlinkSync(imagePath);  // Hapus file gambar yang diunggah
        });
    });
});

// Jalankan server
app.listen(port, () => {
    console.log(`Server berjalan di http://localhost:${port}`);
});