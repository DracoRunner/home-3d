# 2D Floor Plan Designer

A modern, interactive 2D floor plan designer built with Next.js and HTML5 Canvas. Create, edit, and visualize floor plans with Google Maps-style zoom controls and professional drawing tools.

## Features

- ✨ **Interactive Canvas Drawing** - Click to add points and create rooms
- 🗺️ **Google Maps-style Zoom Controls** - Professional zoom in/out and center buttons
- 🔒 **Zoom Prevention** - Prevents browser zoom conflicts with canvas zoom
- 🎯 **Room Selection & Editing** - Click on rooms to select and delete them
- 📏 **Grid System** - 1 meter = 20 pixels scale with visual grid
- 🖱️ **Pan Support** - Middle-click or Cmd+click to pan around
- 📱 **Responsive Design** - Works on desktop and mobile devices

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Usage

1. **Drawing Rooms**: Click "Draw Room" button and click on the canvas to add points
2. **Completing Rooms**: Click "Finish Room" or add at least 3 points and click "Complete Room"
3. **Selecting Rooms**: Click on any room to select it (highlighted in orange)
4. **Deleting Rooms**: Select a room and click "Delete Room"
5. **Zooming**: Use the +/- buttons on the right or scroll wheel on the canvas
6. **Centering**: Click the center button (⌖) to fit all rooms in view
7. **Panning**: Middle-click and drag or Cmd+click and drag to pan

## Technical Stack

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **HTML5 Canvas** - High-performance 2D rendering
- **Tailwind CSS** - Utility-first styling
- **React Hooks** - Modern state management

## Project Structure

```
src/
├── app/                 # Next.js app directory
├── components/          # React components
│   ├── 2d/             # 2D canvas components
│   └── DesignStudio.tsx # Main app component
└── types/              # TypeScript type definitions
```

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
