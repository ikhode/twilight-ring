
import fs from 'fs';
import path from 'path';
import https from 'https';

const BASE_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/';
const MODELS_DIR = path.join(process.cwd(), 'client', 'public', 'models');

const files = [
    'tiny_face_detector_model-weights_manifest.json',
    'tiny_face_detector_model-shard1',
    'face_landmark_68_model-weights_manifest.json',
    'face_landmark_68_model-shard1',
    'face_recognition_model-weights_manifest.json',
    'face_recognition_model-shard1'
];

async function download(file) {
    const filePath = path.join(MODELS_DIR, file);
    const fileStream = fs.createWriteStream(filePath);

    return new Promise((resolve, reject) => {
        https.get(`${BASE_URL}${file}`, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download ${file}: ${response.statusCode}`));
                return;
            }
            response.pipe(fileStream);
            fileStream.on('finish', () => {
                fileStream.close();
                console.log(`Downloaded: ${file}`);
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(filePath);
            reject(err);
        });
    });
}

async function main() {
    if (!fs.existsSync(MODELS_DIR)) {
        fs.mkdirSync(MODELS_DIR, { recursive: true });
    }

    for (const file of files) {
        try {
            await download(file);
        } catch (err) {
            console.error(err.message);
        }
    }
}

main();
