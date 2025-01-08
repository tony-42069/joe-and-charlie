// server.js
const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.static('.'));
app.use(express.json());

// Get list of meetings
app.get('/api/meetings', async (req, res) => {
    try {
        const files = await fs.readdir('transcripts');
        const meetings = files
            .filter(file => file.endsWith('.txt'))
            .map(file => ({
                date: file.replace('.txt', ''),
                filename: file
            }));
        res.json(meetings);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get meetings' });
    }
});

// Get specific transcript
app.get('/api/transcript/:date', async (req, res) => {
    try {
        const transcript = await fs.readFile(`transcripts/${req.params.date}.txt`, 'utf-8');
        res.json({ transcript });
    } catch (error) {
        res.status(404).json({ error: 'Transcript not found' });
    }
});

// Add new meeting
app.post('/api/meetings', async (req, res) => {
    try {
        const { date, youtubeUrl, transcript } = req.body;
        const filename = `${date}.txt`;
        const content = `YouTube URL: ${youtubeUrl}\n\n${transcript}`;
        await fs.writeFile(path.join('transcripts', filename), content);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save meeting' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});