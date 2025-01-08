// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Setup admin form if on admin page
    const transcribeForm = document.getElementById('transcribe-form');
    if (transcribeForm) {
        transcribeForm.addEventListener('submit', handleFormSubmit);
    }
    
    // Generate calendar with first meeting
    generateCalendar();
    
    // Load transcript if date is specified in URL
    const urlParams = new URLSearchParams(window.location.search);
    const date = urlParams.get('date');
    if (date) {
        loadTranscript(date);
    }
});

async function handleFormSubmit(event) {
    event.preventDefault();
    
    const urlInput = document.getElementById('youtube-url');
    const dateInput = document.getElementById('meeting-date');
    const resultDiv = document.getElementById('transcription-result');
    
    const url = urlInput.value.trim();
    const date = dateInput.value;
    
    if (!url || !date) {
        alert('Please fill in all fields');
        return;
    }
    
    // Show loading state
    resultDiv.innerHTML = '<p>Transcribing video... This may take a few minutes.</p>';
    
    try {
        const response = await fetch('/transcribe', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url, date })
        });
        
        const data = await response.json();
        
        if (data.success) {
            resultDiv.innerHTML = `
                <div class="transcription-result">
                    <p>Transcript saved for ${formatDate(new Date(date))}</p>
                    <a href="/?date=${date}" target="_blank">View Transcript</a>
                </div>
            `;
            // Refresh the calendar after adding new transcript
            generateCalendar();
        } else {
            throw new Error(data.error || 'Transcription failed');
        }
    } catch (error) {
        console.error('Error:', error);
        resultDiv.innerHTML = `<p class="error">Error: ${error.message}</p>`;
    }
}

function generateCalendar() {
    const dateButtons = document.getElementById('date-buttons');
    dateButtons.innerHTML = ''; // Clear existing buttons
    
    // Define our meetings
    const meetings = [
        {
            date: '2025-01-01T18:00:00',
            title: 'AA History: Introduction'
        },
        {
            date: '2025-01-08T18:00:00',
            title: 'AA History: Affecting Others'
        }
    ];
    
    // Create button for each meeting
    meetings.forEach(meeting => {
        const meetingDate = new Date(meeting.date);
        const dateString = meetingDate.toISOString().split('T')[0];
        
        const button = document.createElement('div');
        button.className = 'meeting-button';
        button.textContent = `${formatDate(meetingDate)} - ${meeting.title}`;
        button.onclick = () => {
            window.location.href = `/?date=${dateString}`;
        };
        dateButtons.appendChild(button);
    });
}

function formatDate(date) {
    const formattedDate = date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    return `${formattedDate} at 6:00 PM`;
}

async function loadTranscript(date) {
    const transcriptSection = document.getElementById('transcripts');
    transcriptSection.innerHTML = '<p>Loading transcription...</p>';
    
    try {
        // Ensure date is in YYYY-MM-DD format
        const formattedDate = new Date(date).toISOString().split('T')[0];
        const response = await fetch(`/transcripts/${formattedDate}.txt`, {
            headers: {
                'Cache-Control': 'no-cache'
            }
        });
        if (!response.ok) throw new Error('Transcript not found');
        
        const transcript = await response.text();
        const formattedTranscript = transcript.split('\n').map(line => {
            if (line.startsWith('Joe:')) {
                return `<div class="speaker-joe">${line}</div>`;
            } else if (line.startsWith('Charlie:')) {
                return `<div class="speaker-charlie">${line}</div>`;
            }
            return `<div class="transcript-line">${line}</div>`;
        }).join('');
        
        transcriptSection.innerHTML = `
            <div class="transcription-result">
                <div class="transcript-content">${formattedTranscript}</div>
                <button onclick="window.location.href='/'">Back to Calendar</button>
            </div>
        `;
    } catch (error) {
        transcriptSection.innerHTML = `<p class="error">Error: ${error.message}</p>`;
    }
}