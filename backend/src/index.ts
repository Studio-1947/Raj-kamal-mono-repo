import app from './app.js';

const PORT = process.env.PORT || 4000;

// Start server (for local / traditional hosting). On Vercel, this file isn't used.
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

export default app;
