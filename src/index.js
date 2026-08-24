import express from 'express';

const app = express();
const PORT = 8000;

// JSON middleware
app.use(express.json());

// Root route
app.get('/', (req, res) => {
    res.json({
        message: 'Hello from Express!',
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`GET http://localhost:${PORT}/`);
});