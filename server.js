const express = require('express');
const axios = require('axios');
const app = express();

// Middleware to parse JSON request body
app.use(express.json());

// Utility function to add a delay (sleep)
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Function to process a single video (fetch ticket, download link, and thumbnail)
const processVideo = async (file, login, key) => {
    const fileId = file.linkid;
    const fileName = file.name;

    try {
        // Get download ticket
        const ticketResponse = await axios.get(`https://api.streamtape.com/file/dlticket?file=${fileId}&login=${login}&key=${key}`);
        if (ticketResponse.data.status === 200) {
            const ticket = ticketResponse.data.result.ticket;

            // Wait 2 seconds to avoid rate-limiting
            await delay(2000);

            // Get download link using the ticket
            const linkResponse = await axios.get(`https://api.streamtape.com/file/dl?file=${fileId}&ticket=${ticket}`);
            if (linkResponse.data.status === 200) {
                const downloadLink = linkResponse.data.result.url;

                // Get video thumbnail (thumbs)
                const thumbResponse = await axios.get(`https://api.streamtape.com/file/getsplash?login=${login}&key=${key}&file=${fileId}`);
                const videoThumb = thumbResponse.data.result;

                // Return the video information
                return {
                    fileName: fileName,
                    downloadLink: downloadLink,
                    videoThumb: videoThumb
                };
            } else {
                return { fileName, downloadLink: 'Error: Could not get download link', videoThumb: 'Error: No thumbnail available' };
            }
        } else {
            return { fileName, downloadLink: 'Error: Could not get download ticket', videoThumb: 'Error: No thumbnail available' };
        }
    } catch (error) {
        return { fileName, downloadLink: 'Error: Internal error', videoThumb: 'Error: No thumbnail available' };
    }
};

// Route to get the download links and thumbnails via Streamtape APIs for all videos
app.get('/get-all-download-links', async (req, res) => {
    try {
        const login = '0287aca2ef38b0d9a210'; // Your Streamtape login
        const key = 'k2ljGZWXMKirrK';         // Your Streamtape API key

        // First API: Get the list of all video IDs and names
        const videoListResponse = await axios.get(`https://api.streamtape.com/file/listfolder?login=${login}&key=${key}`);

        if (videoListResponse.data.status === 200) {
            const files = videoListResponse.data.result.files;  // Get all files (video IDs and names)
            console.log("Files found:", files);

            const BATCH_SIZE = 5;  // Number of videos to process in parallel (tune this based on rate limits)
            const videoLinks = [];

            for (let i = 0; i < files.length; i += BATCH_SIZE) {
                // Process videos in batches
                const batch = files.slice(i, i + BATCH_SIZE).map(file => processVideo(file, login, key));

                // Wait for the batch to complete
                const results = await Promise.all(batch);
                videoLinks.push(...results);
            }

            // Return the result as JSON
            res.json({ videos: videoLinks });
        } else {
            res.status(500).json({ error: 'Failed to get video list', message: videoListResponse.data.msg });
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
