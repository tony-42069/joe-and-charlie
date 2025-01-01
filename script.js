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
                    <h2>Transcription Successful</h2>
                    <p>Transcript saved for ${formatDate(new Date(date))}</p>
                    <a href="/?date=${date}" target="_blank">View Transcript</a>
                </div>
            `;
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
    
    // Add first meeting - January 1st, 2025
    const firstMeetingDate = new Date('2025-01-01T18:00:00');
    const dateString = '2025-01-01'; // Explicitly set the correct date format
    
    const button = document.createElement('button');
    button.textContent = formatDate(firstMeetingDate);
    button.addEventListener('click', () => {
        window.location.href = `/?date=${dateString}`;
    });
    dateButtons.appendChild(button);
}

function formatDate(date) {
    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
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
        transcriptSection.innerHTML = `
            <div class="transcription-result">
                <h2>Transcription for ${formatDate(new Date(date))}</h2>
                <pre>${transcript}</pre>
                <button onclick="window.location.href='/'">Back to Calendar</button>
            </div>
        `;
    } catch (error) {
        transcriptSection.innerHTML = `<p class="error">Error: ${error.message}</p>`;
    }
}
