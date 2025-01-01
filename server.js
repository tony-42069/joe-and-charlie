const express = require('express');
const ytdl = require('ytdl-core');
const speech = require('@google-cloud/speech');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

// Initialize Google Cloud Speech client with credentials
const client = new speech.SpeechClient({
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
});

// Create transcripts directory if it doesn't exist
const transcriptsDir = path.join(__dirname, 'transcripts');
if (!fs.existsSync(transcriptsDir)) {
    fs.mkdirSync(transcriptsDir);
}

// Serve static files from the project directory
app.use(express.static(path.join(__dirname)));
app.use(express.json());

// Route for the homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Route for admin page
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Route for QR code page
app.get('/qr', (req, res) => {
    res.sendFile(path.join(__dirname, 'qr.html'));
});

// Endpoint to process YouTube URLs
app.post('/transcribe', async (req, res) => {
    try {
        const { url, date } = req.body;
        
        // Validate inputs
        if (!ytdl.validateURL(url)) {
            return res.status(400).json({ error: 'Invalid YouTube URL' });
        }
        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
        }

        // Get video info
        const info = await ytdl.getInfo(url);
        
        // Download audio
        const audioFilePath = path.join(transcriptsDir, `${date}.raw`);
        const audioStream = ytdl(url, { filter: 'audioonly', quality: 'highestaudio' })
            .pipe(fs.createWriteStream(audioFilePath));

        await new Promise((resolve, reject) => {
            audioStream.on('finish', resolve);
            audioStream.on('error', reject);
        });

        // Transcribe audio
        const transcription = await transcribeAudio(audioFilePath);
        
        // Save transcription
        const transcriptFilePath = path.join(transcriptsDir, `${date}.txt`);
        fs.writeFileSync(transcriptFilePath, transcription);
        
        res.json({ 
            success: true,
            date: date,
            transcript: transcription,
            filePath: transcriptFilePath
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Serve transcript files
app.get('/transcripts/:date.txt', (req, res) => {
    const transcriptPath = path.join(transcriptsDir, `${req.params.date}.txt`);
    if (fs.existsSync(transcriptPath)) {
        res.sendFile(transcriptPath);
    } else {
        res.status(404).send('Transcript not found');
    }
});

async function transcribeAudio(filePath) {
    // Read audio file
    const audioBytes = fs.readFileSync(filePath).toString('base64');
    
    // Verify audio file exists and has content
    if (!audioBytes || audioBytes.length === 0) {
        throw new Error('Audio file is empty or could not be read');
    }

    const audio = {
        content: audioBytes,
    };

    const config = {
        encoding: 'LINEAR16',
        sampleRateHertz: 16000,
        languageCode: 'en-US',
        enableAutomaticPunctuation: true,
        enableSpeakerDiarization: true,
        diarizationSpeakerCount: 2,
    };

    const request = {
        audio: audio,
        config: config,
    };

    const [response] = await client.recognize(request);
    let transcription = '';
    let currentSpeaker = null;

    response.results.forEach(result => {
        const words = result.alternatives[0].words;
        if (!words) return;

        words.forEach(wordInfo => {
            // Check if speaker changed
            if (wordInfo.speakerTag !== currentSpeaker) {
                currentSpeaker = wordInfo.speakerTag;
                transcription += `\n${currentSpeaker === 1 ? 'Joe:' : 'Charlie:'}\n`;
            }
            transcription += `${wordInfo.word} `;
        });
    });

    return transcription.trim();
}

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
