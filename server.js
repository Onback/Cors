const express = require('express');
const axios = require('axios');
const app = express();

// Middleware to parse JSON request body
app.use(express.json());

// Utility function to add a delay (sleep)
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Route to get the download link via Streamtape APIs
app.get('/get-download-link', async (req, res) => {
    try {
        const fileId = req.query.fileId; // Get the file ID from the query params
        const login = '0287aca2ef38b0d9a210'; // Your Streamtape login
        const key = 'k2ljGZWXMKirrK';     // Your Streamtape API key

        // First API: Get the download ticket
        const ticketResponse = await axios.get(`https://api.streamtape.com/file/dlticket?file=${fileId}&login=${login}&key=${key}`);

        if (ticketResponse.data.status === 200) {
            const ticket = ticketResponse.data.result.ticket;
            console.log('Download Ticket:', ticket);

            // Wait for 2 seconds (or more, based on the API response)
            await delay(4000);

            // Second API: Use the ticket to get the download link
            const linkResponse = await axios.get(`https://api.streamtape.com/file/dl?file=${fileId}&ticket=${ticket}`);

            if (linkResponse.data.status === 200) {
                const downloadLink = linkResponse.data.result.url;
                console.log('Download Link:', downloadLink);

                // Now, fetch the video content through your server and serve it
                const videoResponse = await axios.get(downloadLink, {
                    responseType: 'stream' // To stream the video content
                });

                // Set appropriate headers and pipe the video content to the client
                res.setHeader('Content-Type', videoResponse.headers['content-type']);
                res.setHeader('Content-Length', videoResponse.headers['content-length']);

                // Pipe the video content directly to the client
                videoResponse.data.pipe(res);
            } else {
                res.status(500).json({ error: 'Failed to get download link', message: linkResponse.data.msg });
            }
        } else {
            res.status(500).json({ error: 'Failed to get download ticket', message: ticketResponse.data.msg });
        }
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
