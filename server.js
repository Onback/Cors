const express = require('express');
const axios = require('axios');
const app = express();

// Middleware to parse JSON request body
app.use(express.json());

// Route to get and serve the video
app.get('/stream-video', async (req, res) => {
    try {
        const fileId = req.query.fileId; // Get the file ID from the query params
        const login = '0287aca2ef38b0d9a210'; // Your Streamtape login
        const key = 'k2ljGZWXMKirrK';     // Your Streamtape API key

        // First API: Get the download ticket
        const ticketResponse = await axios.get(`https://api.streamtape.com/file/dlticket?file=${fileId}&login=${login}&key=${key}`);

        if (ticketResponse.data.status === 200) {
            const ticket = ticketResponse.data.result.ticket;

            // Wait 2 seconds as required by Streamtape
            await new Promise(resolve => setTimeout(resolve, 4000));

            // Second API: Get the download link
            const linkResponse = await axios({
                method: 'GET',
                url: `https://api.streamtape.com/file/dl?file=${fileId}&ticket=${ticket}`,
                responseType: 'stream'  // Important! We need to stream the video
            });

            if (linkResponse.status === 200) {
                // Set headers for streaming the video
                res.setHeader('Content-Type', 'video/mp4');
                res.setHeader('Content-Disposition', 'inline');

                // Pipe the video stream from Streamtape to the client
                linkResponse.data.pipe(res);
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
