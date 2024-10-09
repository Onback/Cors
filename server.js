const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());  // Middleware to parse JSON request body

// Utility function to add delay (if needed)
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Function to fetch download link for a single file
async function fetchDownloadLink(fileId, login, key) {
    try {
        // Second API call: Get the download ticket
        const ticketResponse = await axios.get(`https://api.streamtape.com/file/dlticket?file=${fileId}&login=${login}&key=${key}`);
        const downloadTicket = ticketResponse.data.result.ticket;

        // Wait for a small delay if the API imposes it (optional)
        await delay(2000);  // Adjust the delay if necessary

        // Third API call: Get the download link using the ticket
        const downloadResponse = await axios.get(`https://api.streamtape.com/file/dl?file=${fileId}&ticket=${downloadTicket}`);
        
        if (downloadResponse.data.status === 200) {
            const downloadUrl = downloadResponse.data.result.url;
            return { fileId, downloadUrl };  // Return download URL for each file
        } else {
            return { fileId, error: 'Failed to get download link' };
        }
    } catch (error) {
        return { fileId, error: error.message };
    }
}

// Route to handle batch processing of multiple file IDs
app.post('/get-batch-download-links', async (req, res) => {
    const { fileIds } = req.body;  // Expecting an array of file IDs in the request body
    const login = '0287aca2ef38b0d9a210';  // Your Streamtape login
    const key = 'k2ljGZWXMKirrK';          // Your Streamtape API key

    if (!Array.isArray(fileIds) || fileIds.length === 0) {
        return res.status(400).json({ error: 'No file IDs provided' });
    }

    try {
        const results = await Promise.all(fileIds.map(fileId => fetchDownloadLink(fileId, login, key)));
        res.json({ files: results });  // Send all download links in a single response
    } catch (error) {
        res.status(500).json({ error: 'Failed to process batch request', details: error.message });
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
