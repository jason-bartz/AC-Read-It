# Read It!

A camera-powered reading assistant for kids who can't read yet. Point the camera at text on a screen (Nintendo DS, iPad games, etc.), tap the scan button, and the app reads the words aloud. Designed with a warm, Animal Crossing-inspired UI that's friendly and fun for young children.

## How It Works

1. Tap **Start** to open the camera
2. Point the camera at text on a screen
3. Tap the **camera button** to scan
4. Tap the **speaker button** to hear it read aloud

## Deployment

This is a single-file static web app — just upload `index.html` to any HTTPS host:

- **Vercel**: Drag and drop the file, or `vercel deploy`
- **Netlify**: Drag and drop the file into Netlify's deploy area
- **GitHub Pages**: Push to a repo and enable Pages in settings

> **Important:** The app must be served over HTTPS for camera access to work. Opening the file directly via `file://` will not allow camera permissions.

## Add to iOS Home Screen

For the best experience on iPhone or iPad:

1. Open the deployed URL in **Safari**
2. Tap the **Share** button (square with arrow)
3. Scroll down and tap **Add to Home Screen**
4. Tap **Add**

The app will launch full-screen like a native app.

## Notes

- **Camera permission** is required and will be prompted on first use
- The **first OCR scan** may take a few seconds while Tesseract.js downloads language data (~4MB). This data is cached by the browser after the first use
- OCR works best with clear, high-contrast text on a screen. Hold the camera steady and fill the frame with the text

## Browser Compatibility

- iOS Safari 14.5+
- Chrome for Android
- Modern desktop browsers (Chrome, Firefox, Edge, Safari)
